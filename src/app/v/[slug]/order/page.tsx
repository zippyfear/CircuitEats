import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/roles";
import { resolveEventConfig, PLATFORM_DEFAULTS } from "@/lib/config";
import { appearanceEta } from "@/lib/orderEta";
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
      appearances: { take: 1, orderBy: { createdAt: "desc" }, include: { event: true } },
    },
  });
  if (!vendor) notFound();
  const appearance = vendor.appearances[0];
  const conn = await db.posConnection.findUnique({ where: { vendorId: vendor.id } });
  const me = await currentUser();

  // Ordering is gated: it takes an active POS connection AND the event enabling it.
  // (features.ordering doubles as the config gate + the future non-payment kill-switch.)
  const cfg = appearance ? await resolveEventConfig(appearance.event.slug) : PLATFORM_DEFAULTS;
  const orderingOn = !!conn && conn.active && !!cfg.features.ordering;

  const menu = vendor.items.map((it) => ({
    id: it.id, name: it.name, category: it.category?.name ?? "Other",
    variants: it.variants.map((v) => ({ label: v.label, priceCents: v.priceCents })),
    basePrice: it.typicalPriceCents ?? null,
    ratingAvg: it.ratingAvg, ratingCount: it.ratingCount,
  }));

  // persistent pending order: if this user already has an active order at this booth,
  // load it (with live ETA) so it shows on page load / reload — not just right after placing.
  let initialOrder = null;
  if (me && appearance) {
    const active = await db.order.findFirst({
      where: { userId: me.id, appearanceId: appearance.id, status: { in: ["PLACED", "PREPARING", "READY"] } },
      orderBy: { createdAt: "desc" }, include: { items: true },
    });
    if (active) {
      const eta = (active.status === "PLACED" || active.status === "PREPARING") ? await appearanceEta(active.appearanceId, active.createdAt) : null;
      initialOrder = {
        id: active.id, status: active.status, totalCents: active.totalCents, tableLabel: active.tableLabel,
        posOrderId: active.posOrderId, posProvider: active.posProvider,
        items: active.items.map((i) => ({ nameSnap: i.nameSnap, variantLabel: i.variantLabel, qty: i.qty, priceCents: i.priceCents })),
        eta,
      };
    }
  }

  return (
    <main className="wrap" style={{ maxWidth: 620 }}>
      <a className="back" href={`/v/${slug}`}>‹ {vendor.name}</a>
      <h1 style={{ fontSize: 23, letterSpacing: "-.02em", margin: "4px 0 2px" }}>Order from {vendor.name}</h1>
      {orderingOn ? (
        <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>Orders are sent to the vendor{conn && conn.provider !== "MOCK" ? ` (${conn.provider})` : " (test mode)"} for the kitchen &amp; payment.</p>
      ) : conn ? (
        <p className="muted" style={{ marginTop: 0 }}>Ordering isn&apos;t enabled for this event yet — browse the menu below.</p>
      ) : (
        <p className="muted" style={{ marginTop: 0 }}>This vendor isn&apos;t set up for ordering yet — browse the menu below.</p>
      )}
      {orderingOn && tableFromQr && <div className="tablebanner">🍽️ Ordering for <b>Table {tableFromQr}</b></div>}
      {!appearance ? (
        <div className="card" style={{ padding: 16, color: "var(--muted)" }}>Ordering needs an active event/booth for this vendor.</div>
      ) : (
        <OrderPanel appearanceId={appearance.id} vendorName={vendor.name} menu={menu} authed={!!me} canOrder={orderingOn} slug={slug} initialTable={tableFromQr} tableLocked={!!tableFromQr} initialOrder={initialOrder} />
      )}
    </main>
  );
}
