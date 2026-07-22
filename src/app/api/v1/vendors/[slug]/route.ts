import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/v1/vendors/[slug] — one vendor: menu (items+variants) + circuit (appearances w/ per-event rating).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = await db.vendor.findUnique({
    where: { slug },
    include: {
      items: { orderBy: { ratingAvg: "desc" }, include: { category: true, variants: { orderBy: { sortOrder: "asc" } } } },
      appearances: { include: { event: true }, orderBy: { event: { startDate: "desc" } } },
    },
  });
  if (!v) return fail(404, "not_found", "Vendor not found");

  const eventIds = v.appearances.map((a) => a.eventId);
  const perEvent = eventIds.length
    ? await db.rating.groupBy({ by: ["eventId"], where: { vendorId: v.id, eventId: { in: eventIds } }, _avg: { score: true }, _count: { _all: true } })
    : [];
  const evStat = new Map(perEvent.map((p) => [p.eventId as string, { avg: p._avg.score, count: p._count._all }]));

  return ok({
    slug: v.slug, name: v.name, homeBase: v.homeBase, ratingAvg: v.ratingAvg, ratingCount: v.ratingCount,
    onTour: v.appearances.length > 1,
    items: v.items.map((it) => ({
      name: it.name, category: it.category?.name ?? null, unit: it.unit,
      ratingAvg: it.ratingAvg, ratingCount: it.ratingCount,
      variants: it.variants.map((va) => ({ label: va.label, priceCents: va.priceCents, qty: va.qty, note: va.note })),
    })),
    circuit: v.appearances.map((a) => {
      const st = evStat.get(a.eventId);
      return { eventSlug: a.event.slug, eventName: a.event.name, startDate: a.event.startDate, endDate: a.event.endDate, city: a.event.city, region: a.event.region, ratingAvg: st?.avg ?? null, ratingCount: st?.count ?? 0 };
    }),
  });
}
