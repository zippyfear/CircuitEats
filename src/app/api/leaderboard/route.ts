import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Scoped leaderboards: day | week | event | global (§17 dashboards).
export async function GET(req: Request) {
  const scope = new URL(req.url).searchParams.get("scope") ?? "global";
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 864e5);
  const event = await db.event.findFirst({ where: { slug: "elkhorn-ribfest-2026" } });

  let vendors: { name: string; slug: string; avg: number; count: number; travel: boolean }[] = [];
  let kRatings = 0, kAvg = 0, kVendors = 0, kTop = "—", meta = "";

  if (scope === "global") {
    const vs = await db.vendor.findMany({ where: { status: "ACTIVE" }, orderBy: { ratingAvg: "desc" }, take: 8 });
    vendors = vs.map((v) => ({ name: v.name, slug: v.slug, avg: v.ratingAvg, count: v.ratingCount, travel: v.ratingCount > 15000 }));
    kRatings = vs.reduce((a, v) => a + v.ratingCount, 0);
    const tot = vs.reduce((a, v) => a + v.ratingAvg * v.ratingCount, 0);
    kAvg = kRatings ? Math.round((tot / kRatings) * 10) / 10 : 0;
    kVendors = vs.length; kTop = vs[0]?.name ?? "—"; meta = "all-time · all events";
  } else {
    const where =
      scope === "event" ? { eventId: event?.id ?? "__none__" } :
      scope === "week" ? { createdAt: { gte: weekAgo } } :
      { createdAt: { gte: dayStart } };
    const grouped = await db.rating.groupBy({
      by: ["vendorId"], where, _avg: { score: true }, _count: { _all: true },
    });
    const vmap = new Map((await db.vendor.findMany({ where: { id: { in: grouped.map((g) => g.vendorId) } } })).map((v) => [v.id, v]));
    vendors = grouped
      .map((g) => {
        const v = vmap.get(g.vendorId)!;
        return { name: v.name, slug: v.slug, avg: Math.round((g._avg.score ?? 0) * 10) / 10, count: g._count._all, travel: v.ratingCount > 15000 };
      })
      .sort((a, b) => b.avg - a.avg).slice(0, 8);
    kRatings = grouped.reduce((a, g) => a + g._count._all, 0);
    kVendors = grouped.length;
    kAvg = kRatings ? Math.round((grouped.reduce((a, g) => a + (g._avg.score ?? 0) * g._count._all, 0) / kRatings) * 10) / 10 : 0;
    kTop = vendors[0]?.name ?? "—";
    meta = scope === "event" ? (event?.name ?? "event") : scope === "week" ? "last 7 days" : "today";
  }

  const cats = (await db.category.findMany({
    include: { items: { orderBy: { ratingAvg: "desc" }, take: 1, include: { vendor: true } } },
    orderBy: { sortOrder: "asc" },
  })).filter((c) => c.items.length && c.items[0].ratingCount > 0)
    .map((c) => ({ name: c.name, winner: c.items[0].vendor.name, slug: c.items[0].vendor.slug, sc: c.items[0].ratingAvg }));

  return NextResponse.json({
    scope, meta, vendors, cats,
    kpi: [
      ["Ratings", kRatings >= 1000 ? (kRatings / 1000).toFixed(1) + "k" : String(kRatings)],
      ["Avg score", kAvg ? kAvg.toFixed(1) : "—"],
      ["Vendors", String(kVendors)],
      ["Top", kTop],
    ],
  });
}
