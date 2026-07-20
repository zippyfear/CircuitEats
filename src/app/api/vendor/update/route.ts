import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser, isVendorOwner, isPlatformAdmin } from "@/lib/roles";
import { recordAudit, snapVendor } from "@/lib/audit";

// Edit vendor profile. Owner (§20.3-B self-service) OR platform admin (override).
// All changes are audited with a before/after snapshot for rollback.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { vendorId, name, bio, website, homeBase, logoUrl, customLinks, socials } = await req.json();
  if (!vendorId) return NextResponse.json({ error: "vendorId required." }, { status: 400 });
  const admin = await isPlatformAdmin(user.id);
  if (!admin && !(await isVendorOwner(user.id, vendorId))) return NextResponse.json({ error: "Not your vendor." }, { status: 403 });

  const before = await snapVendor(vendorId);
  const data: Record<string, unknown> = {
    bio: bio || null, website: website || null, homeBase: homeBase || null, logoUrl: logoUrl || null,
  };
  if (admin && typeof name === "string" && name.trim()) data.name = name.trim(); // name override is admin-only
  if (Array.isArray(customLinks)) data.customLinks = customLinks.filter((l) => l && l.label && l.url);
  if (socials && typeof socials === "object") data.socials = socials;

  const v = await db.vendor.update({ where: { id: vendorId }, data, select: { name: true } });
  const after = await snapVendor(vendorId);
  await recordAudit({ actorId: user.id, action: "UPDATE", entityType: "Vendor", entityId: vendorId, label: v.name, before, after });
  return NextResponse.json({ ok: true });
}
