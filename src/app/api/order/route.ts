import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";
import { getPosAdapter, type PosOrderLine } from "@/lib/pos";
import { checkLimit } from "@/lib/ratelimit";

// Place an order → build it, save it, hand it to the vendor's POS (mock/real).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to order." }, { status: 401 });
  { const rl = checkLimit(req, user.id, "order", 10); if (rl) return rl; }
  const { appearanceId, tableLabel, notes, items } = await req.json();
  if (!appearanceId || !Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "appearanceId + items required." }, { status: 400 });

  const appearance = await db.appearance.findUnique({ where: { id: String(appearanceId) }, select: { id: true, vendorId: true } });
  if (!appearance) return NextResponse.json({ error: "Appearance not found." }, { status: 404 });

  const ids = items.map((i: { itemId: string }) => i.itemId).filter(Boolean);
  const menu = await db.item.findMany({ where: { id: { in: ids }, vendorId: appearance.vendorId }, include: { variants: true } });
  const byId = new Map(menu.map((m) => [m.id, m]));

  const lines: (PosOrderLine & { itemId: string })[] = [];
  for (const row of items as { itemId: string; variantLabel?: string; qty?: number }[]) {
    const it = byId.get(row.itemId); if (!it) continue;
    const qty = Math.max(1, Math.min(50, Math.round(row.qty ?? 1)));
    let priceCents = it.typicalPriceCents ?? 0, variantLabel: string | null = null;
    if (row.variantLabel) { const v = it.variants.find((x) => x.label === row.variantLabel); if (v) { priceCents = v.priceCents; variantLabel = v.label; } }
    else if (it.variants.length) { const min = it.variants.reduce((a, b) => (b.priceCents < a.priceCents ? b : a)); priceCents = min.priceCents; variantLabel = min.label; }
    lines.push({ itemId: it.id, name: it.name, variantLabel, priceCents, qty, posRef: it.posRef });
  }
  if (lines.length === 0) return NextResponse.json({ error: "No valid items for this vendor." }, { status: 400 });
  const totalCents = lines.reduce((n, l) => n + l.priceCents * l.qty, 0);

  const order = await db.order.create({
    data: {
      userId: user.id, appearanceId: appearance.id, status: "PLACED", totalCents,
      tableLabel: tableLabel ? String(tableLabel).slice(0, 40) : null, notes: notes ? String(notes).slice(0, 240) : null,
      items: { create: lines.map((l) => ({ itemId: l.itemId, nameSnap: l.name, variantLabel: l.variantLabel, priceCents: l.priceCents, qty: l.qty })) },
    },
  });

  // hand off to the POS (mock accepts; real connectors slot in later)
  let pos: { accepted: boolean; posOrderId: string | null; message: string } | null = null;
  const conn = await db.posConnection.findUnique({ where: { vendorId: appearance.vendorId } });
  if (conn?.active) {
    const res = await getPosAdapter(conn.provider).submitOrder({ vendorId: appearance.vendorId, tableLabel, notes, totalCents, lines }, conn);
    pos = res;
    if (res.accepted) await db.order.update({ where: { id: order.id }, data: { posProvider: conn.provider, posOrderId: res.posOrderId } });
  }

  return NextResponse.json({ ok: true, orderId: order.id, totalCents, pos });
}

// Guest: my recent orders (poll for status).
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ orders: [] });
  const appearanceId = new URL(req.url).searchParams.get("appearanceId");
  const orders = await db.order.findMany({
    where: { userId: user.id, ...(appearanceId ? { appearanceId } : {}) },
    orderBy: { createdAt: "desc" }, take: 10,
    include: { items: true, appearance: { include: { vendor: { select: { name: true } } } } },
  });
  return NextResponse.json({ orders });
}
