"use client";
import { useState } from "react";

type Cand = { vendorId: string; name: string; votes: number };
type Cat = { categoryId: string; name: string; myVendorId: string | null; candidates: Cand[] };

export default function PeoplesChoice({ eventId, data, authed }: { eventId: string; data: Cat[]; authed: boolean }) {
  const [cats, setCats] = useState<Cat[]>(data);

  async function vote(categoryId: string, vendorId: string) {
    if (!authed) { window.location.href = "/signin"; return; }
    const r = await fetch("/api/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, categoryId, vendorId }) });
    const d = await r.json().catch(() => ({}));
    if (!d.results) return;
    setCats(cats.map((c) => c.categoryId === categoryId ? {
      ...c, myVendorId: vendorId,
      candidates: c.candidates.map((cand) => ({ ...cand, votes: d.results.find((x: Cand) => x.vendorId === cand.vendorId)?.votes ?? cand.votes })).sort((a, b) => b.votes - a.votes),
    } : c));
  }

  return (
    <>
      <div className="eyebrow">People&apos;s Choice — live 🗳️</div>
      {cats.map((c) => {
        const total = c.candidates.reduce((s, x) => s + x.votes, 0);
        return (
          <div className="card" key={c.categoryId} style={{ marginBottom: 12, padding: "12px 14px" }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Best {c.name}</div>
            {c.candidates.map((cand) => {
              const pct = total ? Math.round((cand.votes / total) * 100) : 0;
              const mine = c.myVendorId === cand.vendorId;
              return (
                <button key={cand.vendorId} onClick={() => vote(c.categoryId, cand.vendorId)} className={`voterow ${mine ? "mine" : ""}`}>
                  <div className="vbar" style={{ width: `${pct}%` }} />
                  <span className="vname">{mine ? "✓ " : ""}{cand.name}</span>
                  <span className="vpct tnum">{cand.votes} · {pct}%</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
