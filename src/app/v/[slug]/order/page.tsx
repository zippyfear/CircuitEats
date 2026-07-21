import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/roles";
import OrderPanel from "@/components/OrderPanel";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ t?: string }> }) {
  const { slug } = await params;
  const { t } = await searchParams;
  const tableFromQr = t ? String(t).slice(0, 40) : null;
  const vendor = await db.vendor.findUnique({
    where: { slug },
    include: {
      items: { orderBy: { ratingAvg: "desc" }, include: { category: true, variants: { orderBy: { sortOrder: "asc" } } } },
      appearances: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });
  if (!vendor) notFound();
  const appearance = vendor.appearances[0];
  const conn = await db.posConnection.findUnique({ where: { vendorId: vendor.id } });
  const me = await currentUser();

  const menu = vendor.items.map((it) => ({
    id: it.id, name: it.name, category: it.category?.name ?? "Other",
    variants: it.variants.map((v) => ({ label: v.label, priceCents: v.priceCents })),
    basePrice: it.typicalPriceCents ?? null,
  }));

  return (
    <main className="wrap" style={{ maxWidth: 620 }}>
      <a className="back" href={`/v/${slug}`}>‹ {vendor.name}</a>
      <h1 style={{ fontSize: 23, letterSpacing: "-.02em", margin: "4px 0 2px" }}>Order from {vendor.name}</h1>
      {conn ? (
        <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>Orders are sent to the vendor{conn.provider !== "MOCK" ? ` (${conn.provider})` : " (test mode)"} for the kitchen &amp; payment.</p>
      ) : (
        <p className="muted" style={{ marginTop: 0 }}>This vendor isn&apos;t set up for ordering yet.</p>
      )}
      {tableFromQr && <div className="tablebanner">🍽️ Ordering for <b>Table {tableFromQr}</b></div>}
      {!appearance ? (
        <div className="card" style={{ padding: 16, color: "var(--muted)" }}>Ordering needs an active event/booth for this vendor.</div>
      ) : (
        <OrderPanel appearanceId={appearance.id} vendorName={vendor.name} menu={menu} authed={!!me} canOrder={!!conn} slug={slug} initialTable={tableFromQr} tableLocked={!!tableFromQr} />
      )}
    </main>
  );
}
