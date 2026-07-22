import { db } from "@/lib/db";
import { ok, pageParams, pageMeta } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/v1/events?status=active|upcoming|past|all&q=&page=&limit=
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "all").toLowerCase();
  const q = url.searchParams.get("q")?.trim();
  const { page, limit, skip, take } = pageParams(url);
  const now = new Date();

  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (status === "upcoming") where.endDate = { gte: now };
  else if (status === "past") where.endDate = { lt: now };
  if (q) where.OR = [
    { name: { contains: q, mode: "insensitive" } },
    { city: { contains: q, mode: "insensitive" } },
    { region: { contains: q, mode: "insensitive" } },
  ];

  const [rows, total] = await Promise.all([
    db.event.findMany({ where, include: { _count: { select: { appearances: true } } }, orderBy: { startDate: "desc" }, skip, take }),
    db.event.count({ where }),
  ]);

  const data = rows.map((e) => ({
    slug: e.slug, name: e.name, venue: e.venue, city: e.city, region: e.region,
    lat: e.lat, lng: e.lng, startDate: e.startDate, endDate: e.endDate,
    website: e.website, upcoming: e.endDate >= now, vendorCount: e._count.appearances,
  }));

  return ok(data, pageMeta(page, limit, total));
}
