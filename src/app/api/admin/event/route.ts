import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/roles";
import { recordAudit, snapEvent } from "@/lib/audit";

// Platform-admin override of core event info. Audited.
export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const b = await req.json();
  const eventId = String(b.eventId ?? "");
  const ev = await db.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!ev) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const before = await snapEvent(eventId);
  const data: Record<string, unknown> = {};
  if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
  if (typeof b.venue === "string") data.venue = b.venue.trim() || null;
  if (typeof b.city === "string") data.city = b.city.trim() || null;
  if (typeof b.region === "string") data.region = b.region.trim() || null;
  if (typeof b.website === "string") data.website = b.website.trim() || null;
  if (typeof b.description === "string") data.description = b.description.trim() || null;
  if (typeof b.status === "string" && ["ACTIVE", "HIDDEN"].includes(b.status)) data.status = b.status;
  if (b.startDate && !isNaN(Date.parse(b.startDate))) data.startDate = new Date(b.startDate);
  if (b.endDate && !isNaN(Date.parse(b.endDate))) data.endDate = new Date(b.endDate);

  const e = await db.event.update({ where: { id: eventId }, data, select: { name: true } });
  await recordAudit({ actorId: admin.id, action: "UPDATE", entityType: "Event", entityId: eventId, label: e.name, before, after: await snapEvent(eventId) });
  return NextResponse.json({ ok: true });
}
