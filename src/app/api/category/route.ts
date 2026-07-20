import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Ranked items within a category, scoped (day/week/event/global) + a daily time series.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const eventSlug = u.searchParams.get("eventSlug");
  const categorySlug = u.searchParams.get("categorySlug");
  const scope = u.searchParams.get("scope") ?? "event";
  if (!categorySlug) return NextResponse.json({ error: "categorySlug required" }, { status: 400 });

  const category = await db.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return NextResponse.json({ error: "category not found" }, { status: 404 });
  const event = eventSlug ? await db.event.findUnique({ where: { slug: eventSlug } }) : null;

  const itemWhere: Record<string, unknown> = { categoryId: category.id };
  if (scope !== "global" && event) itemWhere.vendor = { appearances: { some: { eventId: event.id } } };
  const items = await db.item.findMany({ where: itemWhere, include: { vendor: true, variants: { orderBy: { sortOrder: "asc" } } }, take: 40 });
  const itemIds = items.map((i) => i.id);

  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 864e5);

  type Variant = { label: string; priceCents: number; note: string | null; qty: number | null };
  type Row = { itemId: string; itemName: string; vendorName: string; vendorSlug: string; score: number; count: number; description: string | null; variants: Variant[]; priceFrom: number | null; priceTo: number | null; unit: string | null; avgUnitCents: number | null };
  const build = (i: (typeof items)[number], score: number, count: number): Row => {
    const variants: Variant[] = i.variants.map((v) => ({ label: v.label, priceCents: v.priceCents, note: v.note, qty: v.qty }));
    const prices = variants.length ? variants.map((v) => v.priceCents) : (i.typicalPriceCents != null ? [i.typicalPriceCents] : []);
    // average price per single base unit (e.g. per rib) across every option that declares a qty
    const wq = variants.filter((v) => v.qty != null && v.qty > 0);
    const avgUnitCents = i.unit && wq.length ? Math.round(wq.reduce((s, v) => s + v.priceCents / (v.qty as number), 0) / wq.length) : null;
    return { itemId: i.id, itemName: i.name, vendorName: i.vendor.name, vendorSlug: i.vendor.slug, score, count, description: i.description, variants, priceFrom: prices.length ? Math.min(...prices) : null, priceTo: prices.length ? Math.max(...prices) : null, unit: i.unit ?? null, avgUnitCents };
  };
  let ranking: Row[];
  if (scope === "global") {
    ranking = items.map((i) => build(i, i.ratingAvg, i.ratingCount));
  } else {
    const rWhere: Record<string, unknown> = { itemId: { in: itemIds } };
    if (scope === "event" && event) rWhere.eventId = event.id;
    if (scope === "week") rWhere.createdAt = { gte: weekAgo };
    if (scope === "day") rWhere.createdAt = { gte: dayStart };
    const grp = await db.rating.groupBy({ by: ["itemId"], where: rWhere, _avg: { score: true }, _count: { _all: true } });
    const m = new Map(grp.map((g) => [g.itemId, { avg: g._avg.score ?? 0, count: g._count._all }]));
    ranking = items.map((i) => { const s = m.get(i.id); return build(i, s ? Math.round(s.avg * 10) / 10 : 0, s?.count ?? 0); });
  }
  ranking = ranking.filter((r) => r.count > 0).sort((a, b) => b.score - a.score).slice(0, 20);

  // daily time series (last 10 days)
  const seriesWhere: Record<string, unknown> = { itemId: { in: itemIds }, createdAt: { gte: new Date(now.getTime() - 10 * 864e5) } };
  if (event && scope !== "global") seriesWhere.eventId = event.id;
  const rs = await db.rating.findMany({ where: seriesWhere, select: { score: true, createdAt: true } });
  const byDay = new Map<string, { sum: number; n: number }>();
  for (const r of rs) { const d = r.createdAt.toISOString().slice(0, 10); const e = byDay.get(d) ?? { sum: 0, n: 0 }; e.sum += r.score; e.n++; byDay.set(d, e); }
  const series = Array.from(byDay.entries()).sort().map(([day, e]) => ({ day, avg: Math.round((e.sum / e.n) * 10) / 10 }));

  return NextResponse.json({ category: { name: category.name, slug: category.slug }, scope, ranking, series });
}
