"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type OItem = { nameSnap: string; variantLabel: string | null; qty: number; priceCents: number };
type Order = { id: string; status: string; totalCents: number; tableLabel: string | null; notes: string | null; posOrderId: string | null; createdAt: string; items: OItem[]; user: { displayName: string | null; email: string } };

const money = (c: number) => "$" + (c % 100 === 0 ? (c / 100).toFixed(0) : (c / 100).toFixed(2));
const ago = (iso: string) => { const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000); return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`; };
const NEXT: Record<string, { to: string; label: string }[]> = {
  PLACED: [{ to: "PREPARING", label: "Accept" }, { to: "CANCELED", label: "Cancel" }],
  PREPARING: [{ to: "READY", label: "Ready" }, { to: "CANCELED", label: "Cancel" }],
  READY: [{ to: "PICKED_UP", label: "Picked up" }],
};

export default function OrderQueue({ vendorName, orders }: { vendorName: string; orders: Order[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function advance(orderId: string, status: string) {
    setBusy(orderId + status);
    const r = await fetch("/api/order/advance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, status }) });
    const d = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) { alert(d.error || "Failed"); return; }
    router.refresh();
  }

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <a className="back" href="/">‹ Home</a>
      <h1 style={{ fontSize: 23, letterSpacing: "-.02em", margin: "4px 0 2px" }}>{vendorName} · order queue</h1>
      <p className="muted" style={{ marginTop: 0 }}>{orders.length} active order{orders.length === 1 ? "" : "s"}. <a href="?" style={{ color: "var(--accent-ink)" }}>Refresh</a></p>

      {orders.length === 0 && <div className="card" style={{ padding: 18, color: "var(--muted)" }}>No active orders.</div>}
      {orders.map((o) => (
        <div className="card" key={o.id} style={{ padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span className={`ostatus s-${o.status.toLowerCase()}`}>{o.status}</span>
            {o.tableLabel && <b>Table {o.tableLabel}</b>}
            <span className="muted" style={{ fontSize: 12 }}>{o.user.displayName ?? o.user.email} · {ago(o.createdAt)} ago</span>
            <span className="tnum" style={{ marginLeft: "auto", fontWeight: 800 }}>{money(o.totalCents)}</span>
          </div>
          <div style={{ marginBottom: o.notes ? 4 : 10 }}>
            {o.items.map((i, n) => <div key={n} className="v-sub" style={{ fontSize: 13.5 }}>{i.qty}× {i.nameSnap}{i.variantLabel ? <span className="muted"> · {i.variantLabel}</span> : ""}</div>)}
          </div>
          {o.notes && <div className="muted" style={{ fontSize: 12.5, marginBottom: 10, fontStyle: "italic" }}>“{o.notes}”</div>}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {(NEXT[o.status] ?? []).map((a) => (
              <button key={a.to} className={`cta ${a.to === "CANCELED" ? "ghost" : ""}`} disabled={busy === o.id + a.to} onClick={() => advance(o.id, a.to)} style={{ padding: "7px 14px", fontSize: 13 }}>{a.label}</button>
            ))}
            {o.posOrderId && <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>POS {o.posOrderId}</span>}
          </div>
        </div>
      ))}
    </main>
  );
}
