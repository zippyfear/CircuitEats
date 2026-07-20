import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser, isEventCoordinator } from "@/lib/roles";

// Coordinator-only: set Event.config (branding + feature toggles + vocabulary, §20.3-A).
// Flows through lib/config resolver (platform ← preset ← this override) to the whole event.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { eventId, config } = await req.json();
  if (!eventId || !(await isEventCoordinator(user.id, eventId))) return NextResponse.json({ error: "Not your event." }, { status: 403 });
  await db.event.update({ where: { id: eventId }, data: { config: config && typeof config === "object" ? config : {} } });
  return NextResponse.json({ ok: true });
}
