"use client";
import { useState } from "react";

export default function RateWidget({ itemId, vendorId, current, authed }: { itemId: string; vendorId: string; current: number; authed: boolean; }) {
  const [open, setOpen] = useState(false);
  const [avg, setAvg] = useState(current);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!authed) {
    return (
      <a href="/signin" title="Sign in to rate"
        style={{ width: 40, height: 34, borderRadius: 17, display: "grid", placeItems: "center", background: "var(--surface2)", color: "var(--muted)", fontWeight: 800, fontSize: 15 }}>
        ★
      </a>
    );
  }

  async function rate(score: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, vendorId, score }),
      });
      const data = await res.json();
      if (data.itemAvg != null) setAvg(data.itemAvg);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{ width: 40, height: 34, borderRadius: 17, border: 0, background: "var(--surface2)", color: "var(--accent-ink)", fontWeight: 800, fontSize: 15, cursor: "pointer" }}
          aria-label="Rate this item"
        >
          {done ? "✓" : "★"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 190 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} disabled={busy} onClick={() => rate(n)}
              style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
