import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { derivePresence, ratingWeight, type Tier } from "@/lib/presence";

// Rating requires sign-in (viewing is open; write actions are gated).
// Weight is COMPUTED from verified presence (GEO / QR / both) × reviewer trust,
// so ratings from people confirmed to be at the event count for more.

function weightedAvg(rows: { score: number; weight: number }[]) {
  if (rows.length === 0) return { avg: 0, count: 0 };
  const w = rows.reduce((a, r) => a + r.weight, 0) || rows.length;
  const s = rows.reduce((a, r) => a + r.score * r.weight, 0);
  return { avg: Math.round((s / w) * 10) / 10, count: rows.length };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to rate." }, { status: 401 });
  const userId = session.user.id;
  const { itemId, vendorId, score, eventId, lat, lng, tags, note, photoUrl } = await req.json();
  if (!itemId || !vendorId || typeof score !== "number" || score < 1 || score > 10) {
    return NextResponse.json({ error: "Provide itemId, vendorId, and a score 1–10." }, { status: 400 });
  }
  // richer review fields (all optional)
  const cleanTags = Array.isArray(tags) ? Array.from(new Set(tags.filter((t) => typeof t === "string" && t.trim()).map((t) => String(t).trim()))).slice(0, 6) : [];
  const cleanNote = typeof note === "string" && note.trim() ? note.trim().slice(0, 240) : null;
  const cleanPhoto = typeof photoUrl === "string" && photoUrl.trim() ? photoUrl.trim() : null;

  // resolve presence tier + weight (verified presence × reviewer trust)
  const me = await db.user.findUnique({ where: { id: userId }, select: { reviewerScore: true } });
  let tier: Tier = "REMOTE"; let geo = false, qr = false;
  const event = eventId ? await db.event.findUnique({ where: { id: String(eventId) }, select: { id: true, lat: true, lng: true, geoRadiusM: true } }) : null;
  if (event) { const p = await derivePresence(userId, event, typeof lat === "number" ? lat : null, typeof lng === "number" ? lng : null); tier = p.tier; geo = p.geo; qr = p.qr; }
  const weight = ratingWeight(tier, me?.reviewerScore ?? 0.5);

  await db.rating.upsert({
    where: { userId_itemId: { userId, itemId } },
    update: { score, weight, verified: tier !== "REMOTE", presence: tier, eventId: event?.id ?? null, tags: cleanTags, note: cleanNote, photoUrl: cleanPhoto },
    create: { userId, itemId, vendorId, score, weight, verified: tier !== "REMOTE", presence: tier, eventId: event?.id ?? null, tags: cleanTags, note: cleanNote, photoUrl: cleanPhoto },
  });

  const [itemRows, vendorRows] = await Promise.all([
    db.rating.findMany({ where: { itemId }, select: { score: true, weight: true } }),
    db.rating.findMany({ where: { vendorId }, select: { score: true, weight: true } }),
  ]);
  const it = weightedAvg(itemRows);
  const ve = weightedAvg(vendorRows);

  await Promise.all([
    db.item.update({ where: { id: itemId }, data: { ratingAvg: it.avg, ratingCount: it.count } }),
    db.vendor.update({ where: { id: vendorId }, data: { ratingAvg: ve.avg, ratingCount: ve.count } }),
  ]);

  return NextResponse.json({ itemAvg: it.avg, itemCount: it.count, vendorAvg: ve.avg, presence: tier, geo, qr, weight });
}
