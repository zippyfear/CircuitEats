import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";

// Log a click on a host-promo message (only for logged-in viewers, matching how
// impressions are counted, so CTR = clicks/impressions is apples-to-apples).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false });
  let body: { messageId?: string; eventSlug?: string } = {};
  try { body = await req.json(); } catch { /* sendBeacon blob */ }
  const messageId = body.messageId;
  if (!messageId) return NextResponse.json({ ok: false }, { status: 400 });
  const msg = await db.promoMessage.findUnique({ where: { id: messageId }, select: { id: true } });
  if (!msg) return NextResponse.json({ ok: false }, { status: 404 });
  const event = body.eventSlug ? await db.event.findUnique({ where: { slug: body.eventSlug }, select: { id: true, city: true, region: true } }) : null;
  await db.promoStat.create({ data: { messageId, kind: "CLICK", eventId: event?.id ?? null, city: event?.city ?? null, region: event?.region ?? null, userId: user.id } });
  return NextResponse.json({ ok: true });
}
