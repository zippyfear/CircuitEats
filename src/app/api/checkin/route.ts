import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";
import { derivePresence, geoWithin, startOfToday } from "@/lib/presence";

// Check in to an event → a day-pass that makes your ratings count more.
// method "QR" needs the event's checkInToken (scan once at the gate);
// method "GEO" needs live coords inside the event radius.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to check in." }, { status: 401 });
  const { eventId, method, token, lat, lng } = await req.json();
  const event = await db.event.findUnique({ where: { id: String(eventId ?? "") }, select: { id: true, lat: true, lng: true, geoRadiusM: true, checkInToken: true, name: true } });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  if (method === "QR") {
    if (!token || token !== event.checkInToken) return NextResponse.json({ error: "Invalid or expired event code." }, { status: 400 });
  } else if (method === "GEO") {
    if (!geoWithin(event, lat, lng)) return NextResponse.json({ error: "You don't appear to be at the event yet.", tooFar: true }, { status: 400 });
  } else {
    return NextResponse.json({ error: "method must be QR or GEO." }, { status: 400 });
  }

  // one check-in per method per day is enough for the day-pass
  const today = startOfToday();
  const existing = await db.checkIn.findFirst({ where: { userId: user.id, eventId: event.id, method, createdAt: { gte: today } } });
  if (!existing) {
    await db.checkIn.create({ data: { userId: user.id, eventId: event.id, method, lat: typeof lat === "number" ? lat : null, lng: typeof lng === "number" ? lng : null } });
  }

  const p = await derivePresence(user.id, event, lat, lng);
  return NextResponse.json({ ok: true, event: event.name, ...p });
}

// current presence status for the signed-in user at an event (optionally with live coords)
export async function GET(req: Request) {
  const user = await currentUser();
  const u = new URL(req.url);
  const eventId = u.searchParams.get("eventId") ?? "";
  const lat = u.searchParams.get("lat"); const lng = u.searchParams.get("lng");
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true, lat: true, lng: true, geoRadiusM: true } });
  if (!user || !event) return NextResponse.json({ tier: "REMOTE", geo: false, qr: false });
  const p = await derivePresence(user.id, event, lat ? Number(lat) : null, lng ? Number(lng) : null);
  return NextResponse.json(p);
}
