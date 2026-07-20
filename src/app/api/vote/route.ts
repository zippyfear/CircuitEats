import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";
import { resolveEventConfig } from "@/lib/config";

// People's Choice (§15 #6): one vote per user per category per event, changeable. Live tallies.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
  const { eventId, categoryId, vendorId } = await req.json();
  if (!eventId || !categoryId || !vendorId) return NextResponse.json({ error: "eventId, categoryId, vendorId required." }, { status: 400 });

  const ev = await db.event.findUnique({ where: { id: eventId }, select: { slug: true } });
  if (!ev) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  const cfg = await resolveEventConfig(ev.slug);
  if (!cfg.features.voting) return NextResponse.json({ error: "Voting is not enabled for this event." }, { status: 403 });

  await db.vote.upsert({
    where: { userId_eventId_categoryId: { userId: user.id, eventId, categoryId } },
    update: { vendorId },
    create: { userId: user.id, eventId, categoryId, vendorId },
  });

  const tallies = await db.vote.groupBy({ by: ["vendorId"], where: { eventId, categoryId }, _count: { _all: true } });
  return NextResponse.json({ myVendorId: vendorId, results: tallies.map((t) => ({ vendorId: t.vendorId, votes: t._count._all })) });
}
