import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";

// Claim a vendor → sets owner + creates an OWNER Membership (§20.3-B / §7).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to claim." }, { status: 401 });
  const { vendorId } = await req.json();
  if (!vendorId) return NextResponse.json({ error: "vendorId required." }, { status: 400 });

  const vendor = await db.vendor.findUnique({ where: { id: vendorId }, select: { claimed: true, ownerUserId: true, slug: true } });
  if (!vendor) return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  if (vendor.claimed && vendor.ownerUserId !== user.id) return NextResponse.json({ error: "Already claimed by someone else." }, { status: 409 });

  await db.vendor.update({ where: { id: vendorId }, data: { claimed: true, ownerUserId: user.id } });
  await db.membership.upsert({
    where: { userId_scope_targetId: { userId: user.id, scope: "VENDOR", targetId: vendorId } },
    update: { role: "OWNER" },
    create: { userId: user.id, scope: "VENDOR", targetId: vendorId, role: "OWNER" },
  });
  return NextResponse.json({ ok: true, slug: vendor.slug });
}
