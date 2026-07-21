import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";

// Record a vendor page view (fire-and-forget beacon). Logged-in views dedupe to
// once per user per vendor per day; anonymous views are counted as they come.
export async function POST(req: Request) {
  let vendorId = "";
  try { vendorId = (await req.json()).vendorId ?? ""; } catch { /* beacon blob */ }
  if (!vendorId) return NextResponse.json({ ok: false });
  const user = await currentUser();
  if (user) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const seen = await db.vendorView.findFirst({ where: { vendorId, userId: user.id, createdAt: { gte: dayStart } } });
    if (seen) return NextResponse.json({ ok: true });
  }
  await db.vendorView.create({ data: { vendorId, userId: user?.id ?? null } });
  return NextResponse.json({ ok: true });
}
