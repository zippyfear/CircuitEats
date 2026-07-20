"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Ev = { id: string; name: string; slug: string; venue: string | null; city: string | null; region: string | null; website: string | null; description: string | null; status: string; startDate: string; endDate: string; _count: { appearances: number } };

const inp: React.CSSProperties = { padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 13.5, width: "100%" };
const dstr = (iso: string) => iso.slice(0, 10);

export default function AdminEvents({ events }: { events: Ev[] }) {
  const router = useRouter();
  return (
    <main className="wrap" style={{ maxWidth: 980 }}>
      <h1 style={{ fontSize: 23, letterSpacing: "-.02em", margin: "4px 0 2px" }}>Events</h1>
      <p className="muted" style={{ marginTop: 0 }}>{events.length} events. Override name, venue, city/area, dates and visibility. Audited.</p>
      {events.map((e) => <EventCard key={e.id} e={e} onDone={() => router.refresh()} />)}
    </main>
  );
}

function EventCard({ e, onDone }: { e: Ev; onDone: () => void }) {
  const [f, setF] = useState({ name: e.name, venue: e.venue ?? "", city: e.city ?? "", region: e.region ?? "", website: e.website ?? "", description: e.description ?? "", status: e.status, startDate: dstr(e.startDate), endDate: dstr(e.endDate) });
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  async function save() {
    setBusy(true);
    const r = await fetch("/api/admin/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: e.id, ...f }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { alert(d.error || "Failed"); return; }
    setDone(true); setTimeout(() => setDone(false), 1500); onDone();
  }

  return (
    <div className="card" style={{ padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <b style={{ fontSize: 14.5 }}>{e.name}</b>
        <a href={`/e/${e.slug}`} className="muted" style={{ fontSize: 12 }} target="_blank">/e/{e.slug} ↗</a>
        <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>{e._count.appearances} vendors</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label className="flbl">Name<input value={f.name} onChange={(ev) => set("name", ev.target.value)} style={inp} /></label>
        <label className="flbl">Venue<input value={f.venue} onChange={(ev) => set("venue", ev.target.value)} style={inp} /></label>
        <label className="flbl">City<input value={f.city} onChange={(ev) => set("city", ev.target.value)} style={inp} /></label>
        <label className="flbl">Region / area<input value={f.region} onChange={(ev) => set("region", ev.target.value)} style={inp} /></label>
        <label className="flbl">Start<input type="date" value={f.startDate} onChange={(ev) => set("startDate", ev.target.value)} style={inp} /></label>
        <label className="flbl">End<input type="date" value={f.endDate} onChange={(ev) => set("endDate", ev.target.value)} style={inp} /></label>
        <label className="flbl">Website<input value={f.website} onChange={(ev) => set("website", ev.target.value)} style={inp} /></label>
        <label className="flbl">Status
          <select value={f.status} onChange={(ev) => set("status", ev.target.value)} style={inp}><option value="ACTIVE">ACTIVE</option><option value="HIDDEN">HIDDEN</option></select>
        </label>
        <label className="flbl" style={{ gridColumn: "1 / -1" }}>Description<textarea value={f.description} onChange={(ev) => set("description", ev.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} /></label>
      </div>
      <div style={{ marginTop: 10 }}><button className="cta" onClick={save} disabled={busy} style={{ padding: "8px 16px", opacity: busy ? 0.6 : 1 }}>{done ? "Saved ✓" : busy ? "Saving…" : "Save event"}</button></div>
    </div>
  );
}
