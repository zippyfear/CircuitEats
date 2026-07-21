import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// /vendors — the vendor directory. Sort (top-rated / most-events / A–Z),
// filter by food focus (category), and free-text name filter. Server-rendered,
// all state in the query string (no client JS needed).
export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ sort?: string; cat?: string; q?: string }> }) {
  const { sort, cat, q } = await searchParams;

  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { items: true } } } });
  const activeCats = cats.filter((c) => c._count.items > 0);

  const where: {
    status: "ACTIVE";
    name?: { contains: string; mode: "insensitive" };
    items?: { some: { category: { slug: string } } };
  } = { status: "ACTIVE" };
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (cat) where.items = { some: { category: { slug: cat } } };

  const vendors = await db.vendor.findMany({ where, include: { _count: { select: { appearances: true } } } });
  if (sort === "name") vendors.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "events") vendors.sort((a, b) => b._count.appearances - a._count.appearances || b.ratingAvg - a.ratingAvg);
  else vendors.sort((a, b) => b.ratingAvg - a.ratingAvg);

  const qs = (over: { sort?: string; cat?: string; q?: string }) => {
    const m = { sort, cat, q, ...over };
    const p = new URLSearchParams();
    if (m.sort) p.set("sort", m.sort);
    if (m.cat) p.set("cat", m.cat);
    if (m.q) p.set("q", m.q);
    const s = p.toString();
    return "/vendors" + (s ? `?${s}` : "");
  };

  return (
    <main className="wrap">
      <h1 style={{ fontSize: 24, margin: "6px 0 2px", letterSpacing: "-.02em" }}>Vendors</h1>
      <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        {vendors.length} {vendors.length === 1 ? "vendor" : "vendors"} on the circuit{cat ? ` · ${activeCats.find((c) => c.slug === cat)?.name ?? cat}` : ""}{q ? ` · matching “${q}”` : ""}
      </div>

      <form action="/vendors" className="vsearch">
        {cat && <input type="hidden" name="cat" value={cat} />}
        {sort && <input type="hidden" name="sort" value={sort} />}
        <input type="search" name="q" defaultValue={q ?? ""} placeholder="Filter by name…" aria-label="Filter vendors by name" />
        <button type="submit">Search</button>
      </form>

      <div className="vfilter">
        <div className="vfilter-row">
          <span className="vfilter-lbl">Sort</span>
          <a className={`fchip ${!sort || sort === "rating" ? "on" : ""}`} href={qs({ sort: "rating" })}>Top rated</a>
          <a className={`fchip ${sort === "events" ? "on" : ""}`} href={qs({ sort: "events" })}>Most events</a>
          <a className={`fchip ${sort === "name" ? "on" : ""}`} href={qs({ sort: "name" })}>A–Z</a>
        </div>
        <div className="vfilter-row">
          <span className="vfilter-lbl">Focus</span>
          <a className={`fchip ${!cat ? "on" : ""}`} href={qs({ cat: undefined })}>All</a>
          {activeCats.map((c) => <a key={c.id} className={`fchip ${cat === c.slug ? "on" : ""}`} href={qs({ cat: c.slug })}>{c.name}</a>)}
        </div>
      </div>

      <div className="card">
        {vendors.map((v, i) => (
          <a className={`row ${v.ratingAvg < 5 ? "worst" : ""}`} href={`/v/${v.slug}`} key={v.id}>
            <div className="rank">{i + 1}</div>
            <div>
              <div className="v-name">{v.name}{v._count.appearances > 1 && <span className="ontour-mini"> ◎</span>}</div>
              <div className="v-sub tnum">
                {v.ratingCount.toLocaleString()} {v.ratingCount === 1 ? "rating" : "ratings"} · {v._count.appearances} {v._count.appearances === 1 ? "event" : "events"}{v.homeBase ? ` · ${v.homeBase}` : ""}
              </div>
            </div>
            <div className="score"><div className="bar"><i style={{ width: `${Math.max(4, v.ratingAvg * 10)}%` }} /></div><div className="sc tnum">{v.ratingAvg.toFixed(1)}</div></div>
          </a>
        ))}
        {vendors.length === 0 && <p className="muted" style={{ padding: 16 }}>No vendors match. <a href="/vendors" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>Clear filters</a></p>}
      </div>

      <div className="foot">Reputation follows the vendor across every event on the circuit.</div>
    </main>
  );
}
