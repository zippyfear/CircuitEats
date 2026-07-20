"use client";
import { useEffect, useState } from "react";

type Row = { itemName: string; vendorName: string; vendorSlug: string; score: number; count: number };
type Pt = { day: string; avg: number };
type Cat = { slug: string; name: string };
const SCOPES: [string, string][] = [["day", "Today"], ["week", "This Week"], ["event", "This Event"], ["global", "Global"]];

function Graph({ series }: { series: Pt[] }) {
  if (series.length < 2) return <div className="muted" style={{ padding: "8px 2px", fontSize: 12 }}>Not enough history yet for a trend.</div>;
  const w = 300, h = 64, pad = 6;
  const min = Math.min(...series.map((p) => p.avg)), max = Math.max(...series.map((p) => p.avg));
  const rng = max - min || 1, step = (w - pad * 2) / (series.length - 1);
  const pts = series.map((p, i) => [pad + i * step, h - pad - ((p.avg - min) / rng) * (h - pad * 2)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="64" style={{ display: "block" }}>
      <path d={area} fill="var(--accent-soft)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="var(--accent-ink)" />
    </svg>
  );
}

export default function CategoryView({ eventSlug, eventName, catSlug, cats, prev, next }: { eventSlug: string; eventName: string; catSlug: string; cats: Cat[]; prev: Cat; next: Cat }) {
  const [scope, setScope] = useState("event");
  const [data, setData] = useState<{ category: Cat; ranking: Row[]; series: Pt[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/category?eventSlug=${eventSlug}&categorySlug=${catSlug}&scope=${scope}`).then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, [scope, catSlug, eventSlug]);

  return (
    <main className="wrap" style={{ maxWidth: 680 }}>
      <a className="back" href={`/e/${eventSlug}`}>‹ {eventName}</a>

      {/* category paging */}
      <div className="catnav">
        <a className="catnav-arrow" href={`/e/${eventSlug}/c/${prev.slug}`} aria-label="Previous category">‹</a>
        <h1>Best {data?.category.name ?? cats.find((c) => c.slug === catSlug)?.name ?? ""}</h1>
        <a className="catnav-arrow" href={`/e/${eventSlug}/c/${next.slug}`} aria-label="Next category">›</a>
      </div>
      <div className="catchips">
        {cats.map((c) => <a key={c.slug} className={`catchip ${c.slug === catSlug ? "on" : ""}`} href={`/e/${eventSlug}/c/${c.slug}`}>{c.name}</a>)}
      </div>

      {/* scope toggle at the top of the group */}
      <div className="scope" role="tablist">
        {SCOPES.map(([s, lab]) => (
          <button key={s} role="tab" aria-selected={scope === s} onClick={() => setScope(s)}><span className="lab">{lab}</span></button>
        ))}
      </div>

      <div className="card" style={{ padding: "12px 14px 6px", marginBottom: 14 }}>
        <div className="eyebrow" style={{ margin: "0 0 4px" }}>Rating trend</div>
        <Graph series={data?.series ?? []} />
      </div>

      <div className="card" style={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s" }}>
        {(data?.ranking ?? []).map((r, i) => (
          <a className={`row ${i === 0 ? "top" : ""} ${r.score < 5 ? "worst" : ""}`} href={`/v/${r.vendorSlug}`} key={r.vendorSlug + r.itemName}>
            <div className="rank">{i + 1}</div>
            <div><div className="v-name">{r.vendorName}</div><div className="v-sub">{r.itemName} · <span className="tnum">{r.count.toLocaleString()}</span> ratings</div></div>
            <div className="score"><div className="bar"><i style={{ width: `${Math.max(4, r.score * 10)}%` }} /></div><div className="sc tnum">{r.score.toFixed(1)}</div></div>
          </a>
        ))}
        {!loading && (data?.ranking.length ?? 0) === 0 && <div style={{ padding: 18, color: "var(--muted)", fontSize: 13 }}>No rated entries in this window yet.</div>}
      </div>
    </main>
  );
}
