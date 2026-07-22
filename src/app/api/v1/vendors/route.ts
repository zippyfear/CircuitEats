import { db } from "@/lib/db";
import { ok, pageParams, pageMeta } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/v1/vendors?sort=rating|events|name&cat=&q=&page=&limit=
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sort = (url.searchParams.get("sort") || "rating").toLowerCase();
  const cat = url.searchParams.get("cat")?.trim();
  const q = url.searchParams.get("q")?.trim();
  const { page, limit, skip, take } = pageParams(url);

  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (cat) where.items = { some: { category: { slug: cat } } };

  const orderBy =
    sort === "name" ? { name: "asc" as const } :
    sort === "events" ? { appearances: { _count: "desc" as const } } :
    { ratingAvg: "desc" as const };

  const [rows, total] = await Promise.all([
    db.vendor.findMany({ where, include: { _count: { select: { appearances: true } } }, orderBy, skip, take }),
    db.vendor.count({ where }),
  ]);

  const data = rows.map((v) => ({
    slug: v.slug, name: v.name, homeBase: v.homeBase,
    ratingAvg: v.ratingAvg, ratingCount: v.ratingCount, eventCount: v._count.appearances,
  }));

  return ok(data, pageMeta(page, limit, total));
}
