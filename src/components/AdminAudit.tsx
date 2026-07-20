"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Log = { id: string; action: string; entityType: string; entityId: string; label: string | null; before: unknown; after: unknown; reverted: boolean; revertedAt: string | null; createdAt: string; actor: { email: string } };

function fmt(iso: string) { const d = new Date(iso); return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }

function shortVal(v: unknown): string {
  if (v == null) return "∅";
  if (Array.isArray(v)) return `[${v.length} item${v.length === 1 ? "" : "s"}]`;
  if (typeof v === "object") return "{…}";
  const s = String(v);
  return s.length > 40 ? s.slice(0, 40) + "…" : s;
}

function Diff({ before, after }: { before: unknown; after: unknown }) {
  const b = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
  const a = (after && typeof after === "object" ? after : {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  const changed = keys.filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
  if (!before && after) return <div className="diffline">created · {Object.keys(a).length} fields</div>;
  if (before && !after) return <div className="diffline">deleted · {Object.keys(b).length} fields</div>;
  if (changed.length === 0) return <div className="diffline muted">no field changes</div>;
  return (
    <div className="difftbl">
      {changed.map((k) => (
        <div className="diffline" key={k}><span className="diffkey">{k}</span> <span className="diffb">{shortVal(b[k])}</span> → <span className="diffa">{shortVal(a[k])}</span></div>
      ))}
    </div>
  );
}

export default function AdminAudit({ logs }: { logs: Log[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function rollback(id: string) {
    if (!confirm("Roll back this change? This restores the previous state and is itself logged.")) return;
    setBusy(id);
    const r = await fetch("/api/admin/rollback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auditId: id }) });
    const d = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) { alert(d.error || "Rollback failed"); return; }
    router.refresh();
  }

  return (
    <main className="wrap" style={{ maxWidth: 980 }}>
      <h1 style={{ fontSize: 23, letterSpacing: "-.02em", margin: "4px 0 2px" }}>Audit log</h1>
      <p className="muted" style={{ marginTop: 0 }}>Every management change — who, what, when. Click a row to see the diff; roll back to restore the prior state.</p>
      <div className="card">
        {logs.length === 0 && <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>No changes logged yet.</div>}
        {logs.map((l) => {
          const canRollback = !l.reverted && l.action !== "ROLLBACK";
          return (
            <div key={l.id} className={`auditrow2 ${l.reverted ? "reverted" : ""}`}>
              <div className="auditrow" style={{ padding: 0, cursor: "pointer" }} onClick={() => setOpen(open === l.id ? null : l.id)}>
                <span className={`abadge a-${l.action.toLowerCase()}`}>{l.action}</span>
                <div className="grow">
                  <b>{l.entityType}</b>{l.label ? ` · ${l.label}` : ""}
                  <div className="v-sub">{l.actor.email} · {fmt(l.createdAt)}{l.reverted ? " · rolled back" : ""}</div>
                </div>
                {canRollback && <button className="rollbtn" onClick={(e) => { e.stopPropagation(); rollback(l.id); }} disabled={busy === l.id}>{busy === l.id ? "…" : "Roll back"}</button>}
                <span className="muted" style={{ fontSize: 15, width: 14, textAlign: "center" }}>{open === l.id ? "▾" : "▸"}</span>
              </div>
              {open === l.id && <div className="auditdiff"><Diff before={l.before} after={l.after} /></div>}
            </div>
          );
        })}
      </div>
    </main>
  );
}
