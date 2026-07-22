"use client";
import { useEffect, useRef, useState } from "react";

type MItem = { id: string; name: string; category: string; variants: { label: string; priceCents: number }[]; basePrice: number | null; ratingAvg: number; ratingCount: number };
type Line = { key: string; itemId: string; name: string; variantLabel: string | null; priceCents: number; qty: number };
type OrderView = { id: string; status: string; totalCents: number; tableLabel: string | null; posOrderId: string | null; posProvider: string | null; items: { nameSnap: string; variantLabel: string | null; qty: number; priceCents: number }[] };

const money = (c: number) => "$" + (c % 100 === 0 ? (c / 100).toFixed(0) : (c / 100).toFixed(2));
const STATUS_LABEL: Record<string, string> = { PLACED: "Sent to kitchen", PREPARING: "Preparing", READY: "Ready for pickup", PICKED_UP: "Picked up", CANCELED: "Canceled" };

export default function OrderPanel({ appearanceId, vendorName, menu, authed, canOrder, slug, initialTable, tableLocked }: { appearanceId: string; vendorName: string; menu: MItem[]; authed: boolean; canOrder: boolean; slug: string; initialTable?: string | null; tableLocked?: boolean }) {
  const [cart, setCart] = useState<Line[]>([]);
  const [sel, setSel] = useState<Record<string, string>>({});
  const [table, setTable] = useState(initialTable ?? "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<OrderView | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  function priceFor(it: MItem, variantLabel: string | null) {
    if (variantLabel) return it.variants.find((v) => v.label === variantLabel)?.priceCents ?? 0;
    if (it.variants.length) return Math.min(...it.variants.map((v) => v.priceCents));
    return it.basePrice ?? 0;
  }
  function add(it: MItem) {
    const variantLabel = it.variants.length ? (sel[it.id] ?? it.variants[0].label) : null;
    const key = it.id + "|" + (variantLabel ?? "");
    setCart((c) => { const e = c.find((l) => l.key === key); return e ? c.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)) : [...c, { key, itemId: it.id, name: it.name, variantLabel, priceCents: priceFor(it, variantLabel), qty: 1 }]; });
  }
  function bump(key: string, d: number) { setCart((c) => c.map((l) => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0)); }
  const total = cart.reduce((n, l) => n + l.priceCents * l.qty, 0);

  async function place() {
    if (!authed) { location.href = "/signin?callbackUrl=" + encodeURIComponent(`/v/${slug}/order${table ? `?t=${encodeURIComponent(table)}` : ""}`); return; }
    if (!cart.length) return;
    setBusy(true);
    try {
      const r = await fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appearanceId, tableLabel: table, notes, items: cart.map((l) => ({ itemId: l.itemId, variantLabel: l.variantLabel, qty: l.qty })) }) });
      const d = await r.json();
      if (!r.ok) { alert(d.error || "Order failed"); return; }
      setCart([]); setNotes("");
      startPoll(d.orderId);
    } finally { setBusy(false); }
  }
  function startPoll(orderId: string) {
    const tick = async () => {
      const r = await fetch(`/api/order?appearanceId=${appearanceId}`, { cache: "no-store" });
      const d = await r.json();
      const o = (d.orders ?? []).find((x: OrderView) => x.id === orderId);
      if (o) setPlaced(o);
      if (o && (o.status === "PICKED_UP" || o.status === "CANCELED") && poll.current) clearInterval(poll.current);
    };
    tick(); if (poll.current) clearInterval(poll.current); poll.current = setInterval(tick, 4000);
  }

  if (placed) {
    return (
      <div className="card" style={{ padding: 18 }}>
        <div className="eyebrow" style={{ margin: 0 }}>Your order</div>
        <div style={{ fontSize: 20, fontWeight: 800, margin: "6px 0" }}>{STATUS_LABEL[placed.status] ?? placed.status}</div>
        {placed.tableLabel && <div className="muted" style={{ fontSize: 13 }}>Table {placed.tableLabel}</div>}
        <div style={{ margin: "10px 0" }}>{placed.items.map((i, n) => <div key={n} className="v-sub" style={{ fontSize: 13 }}>{i.qty}× {i.nameSnap}{i.variantLabel ? ` (${i.variantLabel})` : ""} — {money(i.priceCents * i.qty)}</div>)}</div>
        <div style={{ fontWeight: 800 }}>Total {money(placed.totalCents)}</div>
        {placed.posOrderId && <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>POS ticket {placed.posOrderId}{placed.posProvider ? ` · ${placed.posProvider}` : ""}</div>}
        <button className="cta" onClick={() => setPlaced(null)} style={{ marginTop: 14, padding: "8px 14px" }}>Start another order</button>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ padding: 0 }}>
        {menu.map((it) => (
          <div className="item" key={it.id}>
            <div className="info"><div className="nm">{it.name}</div><div className="mt">{it.ratingCount > 0 ? <><span className="s">★ {it.ratingAvg.toFixed(1)}</span> · {it.category} · {it.ratingCount} {it.ratingCount === 1 ? "rating" : "ratings"}</> : it.category}</div></div>
            {it.variants.length > 0 && (
              <select value={sel[it.id] ?? it.variants[0].label} onChange={(e) => setSel({ ...sel, [it.id]: e.target.value })} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 12.5, maxWidth: 130 }}>
                {it.variants.map((v) => <option key={v.label} value={v.label}>{v.label} · {money(v.priceCents)}</option>)}
              </select>
            )}
            <div className="price tnum">{money(priceFor(it, it.variants.length ? (sel[it.id] ?? it.variants[0].label) : null))}</div>
            <button className="cta" disabled={!canOrder} onClick={() => add(it)} style={{ padding: "7px 12px", fontSize: 13 }}>Add</button>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="card" style={{ padding: 14, marginTop: 12 }}>
          <div className="eyebrow" style={{ marginTop: 0 }}>Your cart</div>
          {cart.map((l) => (
            <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
              <div className="grow" style={{ fontSize: 13.5 }}>{l.name}{l.variantLabel ? <span className="muted"> · {l.variantLabel}</span> : ""}</div>
              <button className="qbtn" onClick={() => bump(l.key, -1)}>−</button>
              <span className="tnum" style={{ width: 18, textAlign: "center" }}>{l.qty}</span>
              <button className="qbtn" onClick={() => bump(l.key, 1)}>+</button>
              <span className="tnum" style={{ width: 54, textAlign: "right", fontWeight: 700 }}>{money(l.priceCents * l.qty)}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {!tableLocked && <input value={table} onChange={(e) => setTable(e.target.value)} placeholder="Table # (optional)" style={{ flex: "1 1 120px", padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 13 }} />}
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ flex: "2 1 160px", padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 13 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Total {money(total)}</div>
            <button className="cta" onClick={place} disabled={busy} style={{ padding: "9px 18px" }}>{busy ? "…" : authed ? "Place order" : "Sign in to order"}</button>
          </div>
        </div>
      )}
    </>
  );
}
