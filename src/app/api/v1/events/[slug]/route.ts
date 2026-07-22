import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/v1/events/[slug] — one event + its vendor lineup (per-appearance).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = await db.event.findUnique({
    where: { slug },
    include: {
      appearances: { include: { vendor: true }, orderBy: { vendor: { ratingAvg: "desc" } } },
    },
  });
  if (!e) return fail(404, "not_found", "Event not found");

  const now = new Date();
  return ok({
    slug: e.slug, name: e.name, venue: e.venue, city: e.city, region: e.region,
    lat: e.lat, lng: e.lng, startDate: e.startDate, endDate: e.endDate,
    website: e.website, description: e.description, upcoming: e.endDate >= now,
    vendors: e.appearances.map((a) => ({
      slug: a.vendor.slug, name: a.vendor.name, homeBase: a.vendor.homeBase,
      ratingAvg: a.vendor.ratingAvg, ratingCount: a.vendor.ratingCount,
      boothLabel: a.boothLabel, currentWaitMin: a.currentWaitMin,
    })),
  });
}
