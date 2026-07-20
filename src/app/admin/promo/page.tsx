import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/roles";

export const dynamic = "force-dynamic";

type Agg = Map<string, { impr: number; clk: number }>; // messageId -> counts
const pct = (clk: number, impr: number) => (impr ? (clk / impr) * 100 : 0);

function Table({ title, sub, agg, leadOf }: { title: string; sub?: string; agg: Agg; leadOf: (id: string) => string }) {
  const rows = Array.from(agg.entries())
    .map(([id, c]) => ({ id, lead: leadOf(id), ...c, ctr: pct(c.clk, c.impr) }))
    .filter((r) => r.impr > 0)
    .sort((a, b) => b.ctr - a.ctr || b.impr - a.impr);
  if (rows.length === 0) return null;
  // "best" = highest CTR with at least a few impressions
  const best = rows.filter((r) => r.impr >= 5)[0] ?? rows[0];
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="eyebrow" style={{ marginBottom: 2 }}>{title}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{sub}</div>}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="promotbl">
          <thead><tr><th>Message</th><th>Impr</th><th>Clicks</th><th>CTR</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.id === best.id ? "win" : ""}>
                <td>{r.id === best.id && <span className="wintag">BEST</span>}{r.lead}</td>
                <td className="tnum">{r.impr.toLocaleString()}</td>
                <td className="tnum">{r.clk.toLocaleString()}</td>
                <td className="tnum">{r.ctr.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function PromoStatsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const messages = await db.promoMessage.findMany();
  const leadOf = (id: string) => messages.find((m) => m.id === id)?.lead ?? "(deleted message)";

  const [overallRows, eventRows, cityRows, events] = await Promise.all([
    db.promoStat.groupBy({ by: ["messageId", "kind"], _count: { _all: true } }),
    db.promoStat.groupBy({ by: ["eventId", "messageId", "kind"], _count: { _all: true } }),
    db.promoStat.groupBy({ by: ["city", "region", "messageId", "kind"], _count: { _all: true } }),
    db.event.findMany({ select: { id: true, name: true } }),
  ]);
  const evName = new Map(events.map((e) => [e.id, e.name]));

  const overall: Agg = new Map();
  for (const r of overallRows) {
    const c = overall.get(r.messageId) ?? { impr: 0, clk: 0 };
    if (r.kind === "CLICK") c.clk += r._count._all; else c.impr += r._count._all;
    overall.set(r.messageId, c);
  }
  const byEvent = new Map<string, Agg>();
  for (const r of eventRows) {
    const key = r.eventId ?? "__global__";
    const agg = byEvent.get(key) ?? new Map();
    const c = agg.get(r.messageId) ?? { impr: 0, clk: 0 };
    if (r.kind === "CLICK") c.clk += r._count._all; else c.impr += r._count._all;
    agg.set(r.messageId, c); byEvent.set(key, agg);
  }
  const byCity = new Map<string, Agg>();
  for (const r of cityRows) {
    if (!r.city) continue;
    const key = r.region ? `${r.city}, ${r.region}` : r.city;
    const agg = byCity.get(key) ?? new Map();
    const c = agg.get(r.messageId) ?? { impr: 0, clk: 0 };
    if (r.kind === "CLICK") c.clk += r._count._all; else c.impr += r._count._all;
    agg.set(r.messageId, c); byCity.set(key, agg);
  }

  const totalImpr = overallRows.filter((r) => r.kind === "IMPRESSION").reduce((s, r) => s + r._count._all, 0);
  const totalClk = overallRows.filter((r) => r.kind === "CLICK").reduce((s, r) => s + r._count._all, 0);

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <a className="back" href="/">‹ Home</a>
      <h1 style={{ fontSize: 24, letterSpacing: "-.02em", margin: "0 0 4px" }}>Host-promo performance</h1>
      <p className="muted" style={{ marginTop: 0 }}>SmokeStack footer messaging — click-through by segment. {totalImpr.toLocaleString()} impressions · {totalClk.toLocaleString()} clicks · {pct(totalClk, totalImpr).toFixed(1)}% overall CTR. Messaging auto-optimizes toward the best CTR per segment.</p>

      <Table title="Overall" agg={overall} leadOf={leadOf} />

      {Array.from(byEvent.entries()).map(([key, agg]) => (
        <Table key={key} title={key === "__global__" ? "Global browsing (no event)" : (evName.get(key) ?? "Event")} sub="per event" agg={agg} leadOf={leadOf} />
      ))}

      {Array.from(byCity.entries()).map(([key, agg]) => (
        <Table key={key} title={key} sub="per city / area" agg={agg} leadOf={leadOf} />
      ))}

      {totalImpr === 0 && <p className="muted">No impressions logged yet — browse the app while signed in and the footer will start rotating and recording.</p>}
    </main>
  );
}
