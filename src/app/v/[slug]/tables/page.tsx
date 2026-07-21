import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { currentUser, isVendorOwner, isPlatformAdmin } from "@/lib/roles";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export default async function VendorTables({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ n?: string }> }) {
  const { slug } = await params;
  const { n } = await searchParams;
  const user = await currentUser();
  const vendor = await db.vendor.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!vendor) notFound();
  if (!user || !((await isVendorOwner(user.id, vendor.id)) || (await isPlatformAdmin(user.id)))) redirect(`/v/${slug}`);

  const count = Math.max(1, Math.min(60, parseInt(n ?? "12") || 12));
  const base = process.env.AUTH_URL ?? "";
  const tables = await Promise.all(
    Array.from({ length: count }, (_, i) => i + 1).map(async (num) => {
      const url = `${base}/v/${slug}/order?t=${num}`;
      return { num, url, qr: await QRCode.toDataURL(url, { margin: 1, width: 240 }) };
    }),
  );

  return (
    <main className="wrap" style={{ maxWidth: 820 }}>
      <a className="back" href={`/v/${slug}`}>‹ {vendor.name}</a>
      <h1 style={{ fontSize: 23, letterSpacing: "-.02em", margin: "4px 0 2px" }}>{vendor.name} · table QR codes</h1>
      <p className="muted" style={{ marginTop: 0 }}>Print one per table. A guest scans it → the order opens pre-set to that table, linked to their account when they place it. (Table can still be typed by hand if a code is missing.)</p>

      <form style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <label className="flbl" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>Tables
          <input name="n" type="number" min={1} max={60} defaultValue={count} style={{ width: 80, padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 14 }} />
        </label>
        <button className="cta" type="submit" style={{ padding: "8px 14px" }}>Generate</button>
      </form>

      <div className="qrgrid">
        {tables.map((t) => (
          <div className="qrcard" key={t.num}>
            <div className="qrcard-t">Table {t.num}</div>
            <img src={t.qr} alt={`Table ${t.num} QR`} width={160} height={160} />
            <div className="qrcard-v">{vendor.name}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
