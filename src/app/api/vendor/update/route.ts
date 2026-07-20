import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser, isVendorOwner } from "@/lib/roles";

// Owner-only edit of vendor profile (§20.3-B self-service).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { vendorId, bio, website, homeBase, logoUrl, customLinks, socials } = await req.json();
  if (!vendorId || !(await isVendorOwner(user.id, vendorId))) return NextResponse.json({ error: "Not your vendor." }, { status: 403 });

  const data: Record<string, unknown> = {
    bio: bio || null, website: website || null, homeBase: homeBase || null, logoUrl: logoUrl || null,
  };
  if (Array.isArray(customLinks)) data.customLinks = customLinks.filter((l) => l && l.label && l.url);
  if (socials && typeof socials === "object") data.socials = socials;

  await db.vendor.update({ where: { id: vendorId }, data });
  return NextResponse.json({ ok: true });
}
