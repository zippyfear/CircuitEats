import { db } from "@/lib/db";

// ── Verified-presence trust model ────────────────────────────────────────────
// A rating is worth more the more we can confirm the rater was actually there.
// Two independent signals — device GEO (within the event radius) and a QR day-pass
// check-in — combine into four tiers. Weight also folds in reviewer trust so a
// trusted, present reviewer carries the most, an anonymous remote rater the least.

export type Tier = "REMOTE" | "GEO" | "QR" | "GEO_QR";

// base weight per presence tier (tunable)
const TIER_WEIGHT: Record<Tier, number> = { REMOTE: 0.25, GEO: 1.0, QR: 1.0, GEO_QR: 2.0 };

export function tierFor(geo: boolean, qr: boolean): Tier {
  if (geo && qr) return "GEO_QR";
  if (geo) return "GEO";
  if (qr) return "QR";
  return "REMOTE";
}

// final rating weight = presence base × reviewer-trust factor (0.5–1.5 over score 0–1)
export function ratingWeight(tier: Tier, reviewerScore: number): number {
  const trust = 0.5 + Math.max(0, Math.min(1, reviewerScore));
  return Math.round(TIER_WEIGHT[tier] * trust * 100) / 100;
}

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function startOfToday(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

// Is the given point within the event's presence radius?
export function geoWithin(event: { lat: number | null; lng: number | null; geoRadiusM: number }, lat?: number | null, lng?: number | null): boolean {
  if (event.lat == null || event.lng == null || lat == null || lng == null) return false;
  return haversineMeters(event.lat, event.lng, lat, lng) <= event.geoRadiusM;
}

// Resolve the presence tier for a user at an event, given optional live coords.
// GEO is satisfied by live coords in-radius OR an existing GEO check-in today;
// QR is satisfied by a QR check-in today (the day-pass).
export async function derivePresence(
  userId: string,
  event: { id: string; lat: number | null; lng: number | null; geoRadiusM: number },
  lat?: number | null,
  lng?: number | null,
): Promise<{ tier: Tier; geo: boolean; qr: boolean }> {
  const liveGeo = geoWithin(event, lat, lng);
  const today = startOfToday();
  const checkins = await db.checkIn.findMany({ where: { userId, eventId: event.id, createdAt: { gte: today } }, select: { method: true } });
  const geo = liveGeo || checkins.some((c) => c.method === "GEO");
  const qr = checkins.some((c) => c.method === "QR");
  return { tier: tierFor(geo, qr), geo, qr };
}
