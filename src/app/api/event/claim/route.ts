import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";

// Claim an event → COORDINATOR Membership + organizer (§20.3-A / §20.4).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to claim." }, { status: 401 });
  const { eventId } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId required." }, { status: 400 });

  const ev = await db.event.findUnique({ where: { id: eventId }, select: { organizerUserId: true, slug: true } });
  if (!ev) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (ev.organizerUserId && ev.organizerUserId !== user.id) return NextResponse.json({ error: "Already managed by someone else." }, { status: 409 });

  await db.event.update({ where: { id: eventId }, data: { organizerUserId: user.id, official: true } });
  await db.membership.upsert({
    where: { userId_scope_targetId: { userId: user.id, scope: "EVENT", targetId: eventId } },
    update: { role: "COORDINATOR" },
    create: { userId: user.id, scope: "EVENT", targetId: eventId, role: "COORDINATOR" },
  });
  return NextResponse.json({ ok: true, slug: ev.slug });
}
