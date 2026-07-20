"use client";
import { useEffect, useState } from "react";

type V = { name: string; slug: string; avg: number; count: number; travel: boolean };
type Data = { scope: string; meta: string; vendors: V[]; cats: { name: string; winner: string; slug: string; sc: number }[]; kpi: [string, string][] };

const SCOPES: [string, string, string][] = [
  ["day", "Today", "the day"],
  ["week", "This Week", "7 days"],
  ["event", "This Event", "Elkhorn Ribfest"],
  ["global", "Global", "all-time"],
];

export default function Dashboard() {
  const [scope, setScope] = useState("global");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?scope=${scope}`).then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, [scope]);

  return (
    <>
      <div className="scope" role="tablist">
        {SCOPES.map(([s, lab, cap]) => (
          <button key={s} role="tab" aria-selected={scope === s} onClick={() => setScope(s)}>
            <span className="lab">{lab}</span><span className="scap">{cap}</span>
          </button>
        ))}
      </div>

      <div className="kpis">
        {(data?.kpi ?? [["Ratings", "—"], ["Avg score", "—"], ["Vendors", "—"], ["Top", "—"]]).map(([k, v], i) => (
          <div className="tile" key={i}><div className="k">{k}</div><div className="v tnum">{v}</div></div>
        ))}
      </div>

      <div className="eyebrow">Top vendors — <span style={{ textTransform: "none", letterSpacing: 0 }}>{data?.meta ?? ""}</span></div>
      <div className="card" style={{ opacity: loading ? 0.55 : 1, transition: "opacity .2s" }}>
        {(data?.vendors ?? []).map((v, i) => {
          const worst = v.avg < 5;
          return (
            <a className={`row ${i === 0 ? "top" : ""} ${worst ? "worst" : ""}`} href={`/v/${v.slug}`} key={v.slug}>
              <div className="rank">{i + 1}</div>
              <div>
                <div className="v-name">
                  {v.name}
                  {i === 0 && !worst && <span className="badge best">Top</span>}
                  {worst && <span className="badge worst">Worst</span>}
                  {v.travel && <span className="badge travel">On tour</span>}
                </div>
                <div className="v-sub tnum">{v.count.toLocaleString()} ratings</div>
              </div>
              <div className="score"><div className="bar"><i style={{ width: `${Math.max(4, v.avg * 10)}%` }} /></div><div className="sc tnum">{v.avg.toFixed(1)}</div></div>
            </a>
          );
        })}
        {!loading && (data?.vendors.length ?? 0) === 0 && <div style={{ padding: "18px", color: "var(--muted)", fontSize: 13 }}>No ratings in this window yet.</div>}
      </div>

      <div className="eyebrow">Category leaders</div>
      <div className="cats">
        {(data?.cats ?? []).map((c) => (
          <a className="cat" href={`/v/${c.slug}`} key={c.name}>
            <div className="c-name">{c.name}</div><div className="c-win">{c.winner}</div><div className="c-sc tnum">{c.sc.toFixed(1)}</div>
          </a>
        ))}
      </div>
    </>
  );
}
