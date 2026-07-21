import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function fmt(a: Date, b: Date) {
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = a.toLocaleDateString("en-US", o), e = b.toLocaleDateString("en-US", o);
  return `${s === e ? s : `${s} – ${e}`}, ${b.getFullYear()}`;
}

// /search?q= — global search across vendors and events (by name; events also by city).
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  const [vendors, events] = term
    ? await Promise.all([
        db.vendor.findMany({
          where: { status: "ACTIVE", name: { contains: term, mode: "insensitive" } },
          include: { _count: { select: { appearances: true } } },
          orderBy: { ratingAvg: "desc" }, take: 40,
        }),
        db.event.findMany({
          where: { status: "ACTIVE", OR: [{ name: { contains: term, mode: "insensitive" } }, { city: { contains: term, mode: "insensitive" } }, { region: { contains: term, mode: "insensitive" } }] },
          include: { _count: { select: { appearances: true } } },
          orderBy: { startDate: "desc" }, take: 40,
        }),
      ])
    : [[], []];

  return (
    <main className="wrap">
      <h1 style={{ fontSize: 24, margin: "6px 0 10px", letterSpacing: "-.02em" }}>Search</h1>

      <form action="/search" className="vsearch">
        <input type="search" name="q" defaultValue={term} placeholder="Search vendors, events, cities…" aria-label="Search" autoFocus />
        <button type="submit">Search</button>
      </form>

      {!term && <p className="muted" style={{ marginTop: 14 }}>Search for a vendor, an event, or a city on the circuit.</p>}

      {term && (
        <>
          <div className="eyebrow">Vendors · {vendors.length}</div>
          <div className="card">
            {vendors.map((v, i) => (
              <a className={`row ${v.ratingAvg < 5 ? "worst" : ""}`} href={`/v/${v.slug}`} key={v.id}>
                <div className="rank">{i + 1}</div>
                <div>
                  <div className="v-name">{v.name}{v._count.appearances > 1 && <span className="ontour-mini"> ◎</span>}</div>
                  <div className="v-sub tnum">{v.ratingCount.toLocaleString()} {v.ratingCount === 1 ? "rating" : "ratings"} · {v._count.appearances} {v._count.appearances === 1 ? "event" : "events"}{v.homeBase ? ` · ${v.homeBase}` : ""}</div>
                </div>
                <div className="score"><div className="bar"><i style={{ width: `${Math.max(4, v.ratingAvg * 10)}%` }} /></div><div className="sc tnum">{v.ratingAvg.toFixed(1)}</div></div>
              </a>
            ))}
            {vendors.length === 0 && <p className="muted" style={{ padding: 16 }}>No vendors match “{term}”.</p>}
          </div>

          <div className="eyebrow">Events · {events.length}</div>
          <div className="card">
            {events.map((e) => (
              <a className="erow" href={`/e/${e.slug}`} key={e.id}>
                <div><div className="e-name">{e.name}</div><div className="e-meta">{e.venue ?? "on the circuit"}</div></div>
                <div className="e-right"><div className="e-dates tnum">{fmt(e.startDate, e.endDate)}</div><div className="e-count tnum">{e._count.appearances} {e._count.appearances === 1 ? "vendor" : "vendors"}</div></div>
              </a>
            ))}
            {events.length === 0 && <p className="muted" style={{ padding: 16 }}>No events match “{term}”.</p>}
          </div>
        </>
      )}
    </main>
  );
}
