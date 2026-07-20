import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// The booth QR target: /a/{qrSlug} → resolve the Appearance → land on the vendor.
// (§18.H — one scan straight to the vendor at this event. Presence = verification.)
export async function GET(req: Request, { params }: { params: Promise<{ qrSlug: string }> }) {
  const { qrSlug } = await params;
  const appearance = await db.appearance.findUnique({
    where: { qrSlug },
    include: { vendor: true, event: true },
  });
  if (!appearance) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const url = new URL(`/v/${appearance.vendor.slug}`, req.url);
  url.searchParams.set("event", appearance.event.slug);
  url.searchParams.set("scanned", "1");
  return NextResponse.redirect(url);
}
