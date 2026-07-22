"use client";
import { useMemo, useState } from "react";

type V = { id: string; name: string; slug: string; status: string; ratingCount: number; events: number };

export default function AdminMerge({ vendors }: { vendors: V[] }) {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const active = useMemo(() => vendors.filter((v) => v.status !== "MERGED").sort((a, b) => a.name.localeCompare(b.name)), [vendors]);
  const label = (v: V) => `${v.name} — ${v.ratingCount} ratings · ${v.events} ${v.events === 1 ? "event" : "events"}`;

  // suggest likely duplicates: vendors whose normalized names collide
  const dupes = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const map = new Map<string, V[]>();
    for (const v of active) { const k = norm(v.name); const a = map.get(k) ?? []; a.push(v); map.set(k, a); }
    return [...map.values()].filter((g) => g.length > 1);
  }, [active]);

  async function merge() {
    if (!source || !target || source === target) { setMsg({ ok: false, text: "Pick two different vendors." }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceId: source, targetId: target }) });
      const d = await r.json();
      if (!r.ok) { setMsg({ ok: false, text: d.error || "Merge failed" }); return; }
      setMsg({ ok: true, text: `Merged ${d.source} → ${d.target}: moved ${d.moved.ratings} ratings, ${d.moved.items} items, ${d.moved.appearances} appearances, ${d.moved.follows} follows. Reversible from the audit log.` });
      setSource(""); setTarget("");
      setTimeout(() => location.reload(), 1800);
    } finally { setBusy(false); }
  }

  return (
    <>
      {dupes.length > 0 && (
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginTop: 0 }}>Possible duplicates</div>
          {dupes.map((g, i) => (
            <div key={i} style={{ fontSize: 13, padding: "4px 0" }}>
              {g.map((v) => v.name).join(" · ")} —{" "}
              <button className="linkbtn" onClick={() => { setSource(g[1].id); setTarget(g[0].id); }}>use these</button>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 16 }}>
        <div className="mergefield">
          <label>Merge this vendor (source)</label>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">— pick source —</option>
            {active.map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
          </select>
        </div>
        <div className="mergearrow">↓ folds into ↓</div>
        <div className="mergefield">
          <label>Into this canonical vendor (target)</label>
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">— pick target —</option>
            {active.map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
          </select>
        </div>
        <p className="muted" style={{ fontSize: 12.5 }}>The source&apos;s ratings, menu, appearances, photos and follows move to the target; the source is marked <b>MERGED</b>. Fully reversible from the audit log.</p>
        <button className="cta" onClick={merge} disabled={busy || !source || !target} style={{ padding: "9px 18px" }}>{busy ? "Merging…" : "Merge vendors"}</button>
        {msg && <div className={`mergemsg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      </div>
    </>
  );
}
