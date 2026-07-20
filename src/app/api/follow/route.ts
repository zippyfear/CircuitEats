import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";

// Toggle follow on a vendor (§15 #2). Auth required.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to follow." }, { status: 401 });
  const { vendorId } = await req.json();
  if (!vendorId) return NextResponse.json({ error: "vendorId required." }, { status: 400 });

  const existing = await db.follow.findFirst({ where: { userId: user.id, targetType: "VENDOR", vendorId } });
  if (existing) await db.follow.delete({ where: { id: existing.id } });
  else await db.follow.create({ data: { userId: user.id, targetType: "VENDOR", vendorId } });

  const count = await db.follow.count({ where: { targetType: "VENDOR", vendorId } });
  return NextResponse.json({ following: !existing, count });
}
