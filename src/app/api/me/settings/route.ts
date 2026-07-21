import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";

// User self-settings. Currently just the rating mode (simple vs detailed).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { ratingMode } = await req.json();
  if (ratingMode !== "SIMPLE" && ratingMode !== "DETAILED") return NextResponse.json({ error: "ratingMode must be SIMPLE or DETAILED." }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data: { ratingMode } });
  return NextResponse.json({ ok: true, ratingMode });
}
