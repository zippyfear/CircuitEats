import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function Row({ i, name, slug, avg, count, travel }: { i: number; name: string; slug: string; avg: number; count: number; travel?: boolean; }) {
  const worst = avg < 5;
  return (
    <a className={`row ${i === 0 ? "top" : ""} ${worst ? "worst" : ""}`} href={`/v/${slug}`}>
      <div className="rank">{i + 1}</div>
      <div>
        <div className="v-name">
          {name}
          {i === 0 && !worst && <span className="badge best">Top</span>}
          {worst && <span className="badge worst">Worst</span>}
          {travel && <span className="badge travel">On tour</span>}
        </div>
        <div className="v-sub tnum">{count.toLocaleString()} ratings</div>
      </div>
      <div className="score">
        <div className="bar"><i style={{ width: `${Math.max(4, avg * 10)}%` }} /></div>
        <div className="sc tnum">{avg.toFixed(1)}</div>
      </div>
    </a>
  );
}

export default async function Home() {
  const [topVendors, event, cats] = await Promise.all([
    db.vendor.findMany({ where: { status: "ACTIVE" }, orderBy: { ratingAvg: "desc" }, take: 8 }),
    db.event.findFirst({
      where: { slug: "elkhorn-ribfest-2026" },
      include: { appearances: { include: { vendor: true } } },
    }),
    db.category.findMany({
      include: { items: { orderBy: { ratingAvg: "desc" }, take: 1, include: { vendor: true } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const eventBoard = (event?.appearances ?? [])
    .map((a) => a.vendor)
    .sort((x, y) => y.ratingAvg - x.ratingAvg);
  const catLeaders = cats.filter((c) => c.items.length > 0 && c.items[0].ratingCount > 0);

  return (
    <main className="wrap">
      <div className="top">
        <div className="brand">
          <span className="flame">🔥</span>
          <div>
            <h1>CircuitEats</h1>
            <div className="sub">Live ratings across the food-festival circuit</div>
          </div>
        </div>
        <span className="live">● {topVendors.reduce((a, v) => a + v.ratingCount, 0).toLocaleString()} ratings tracked</span>
      </div>

      <div className="eyebrow">Top vendors — global (all-time · all events)</div>
      <div className="card">
        {topVendors.map((v, i) => (
          <Row key={v.id} i={i} name={v.name} slug={v.slug} avg={v.ratingAvg} count={v.ratingCount} travel={v.ratingCount > 15000} />
        ))}
      </div>

      {event && (
        <>
          <div className="eyebrow">This event — {event.name}</div>
          <div className="card">
            {eventBoard.map((v, i) => (
              <Row key={v.id} i={i} name={v.name} slug={v.slug} avg={v.ratingAvg} count={v.ratingCount} />
            ))}
          </div>
        </>
      )}

      <div className="eyebrow">Category leaders — best in class</div>
      <div className="cats">
        {catLeaders.map((c) => (
          <a className="cat" key={c.id} href={`/v/${c.items[0].vendor.slug}`}>
            <div className="c-name">{c.name}</div>
            <div className="c-win">{c.items[0].vendor.name}</div>
            <div className="c-sc tnum">{c.items[0].ratingAvg.toFixed(1)}</div>
          </a>
        ))}
      </div>

      <div className="foot">CircuitEats · Phase 1 · running on real Postgres · seeded from Elkhorn Ribfest 2026</div>
    </main>
  );
}
