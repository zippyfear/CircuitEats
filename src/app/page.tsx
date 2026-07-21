import { db } from "@/lib/db";
import AuthNav from "@/components/AuthNav";

export const dynamic = "force-dynamic";

function fmt(a: Date, b: Date) {
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${a.toLocaleDateString("en-US", o)} – ${b.toLocaleDateString("en-US", o)}, ${b.getFullYear()}`;
}

export default async function Home() {
  const now = new Date();
  const events = await db.event.findMany({ where: { status: "ACTIVE" }, include: { _count: { select: { appearances: true } } }, orderBy: { startDate: "desc" } });
  const current = events.filter((e) => e.endDate >= now).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const past = events.filter((e) => e.endDate < now);
  const top = await db.vendor.findMany({ where: { status: "ACTIVE" }, orderBy: { ratingAvg: "desc" }, take: 5 });

  return (
    <main className="wrap">
      <div className="top">
        <div className="brand">
          <span className="flame">🔥</span>
          <div><h1>CircuitEats</h1><div className="sub">Find the best — at the best events</div></div>
        </div>
        <AuthNav />
      </div>

      {current.length > 0 && <>
        <div className="eyebrow">Happening now &amp; upcoming</div>
        <div className="card">
          {current.map((e) => (
            <a className="erow" href={`/e/${e.slug}`} key={e.id}>
              <div><div className="e-name">{e.name}</div><div className="e-meta">{e.venue ?? "on the circuit"}</div></div>
              <div className="e-right"><div className="e-dates tnum">{fmt(e.startDate, e.endDate)}</div><div className="e-count tnum">{e._count.appearances} vendors</div></div>
            </a>
          ))}
        </div>
      </>}

      {past.length > 0 && <>
        <div className="eyebrow">Past events</div>
        <div className="card">
          {past.map((e) => (
            <a className="erow" href={`/e/${e.slug}`} key={e.id}>
              <div><div className="e-name">{e.name}</div><div className="e-meta">{e.venue ?? "on the circuit"}</div></div>
              <div className="e-right"><div className="e-dates tnum">{fmt(e.startDate, e.endDate)}</div><div className="e-count tnum">{e._count.appearances} vendors</div></div>
            </a>
          ))}
        </div>
      </>}

      {events.length === 0 && <p className="muted">No events yet.</p>}

      <div className="eyebrow">Top on the circuit — global</div>
      <div className="card">
        {top.map((v, i) => (
          <a className={`row ${i === 0 ? "top" : ""} ${v.ratingAvg < 5 ? "worst" : ""}`} href={`/v/${v.slug}`} key={v.id}>
            <div className="rank">{i + 1}</div>
            <div><div className="v-name">{v.name}</div><div className="v-sub tnum">{v.ratingCount.toLocaleString()} ratings</div></div>
            <div className="score"><div className="bar"><i style={{ width: `${Math.max(4, v.ratingAvg * 10)}%` }} /></div><div className="sc tnum">{v.ratingAvg.toFixed(1)}</div></div>
          </a>
        ))}
      </div>

      <div className="foot">CircuitEats · reputation follows the vendor across every event · <a href="/family" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>part of the Circuit family →</a></div>
    </main>
  );
}
