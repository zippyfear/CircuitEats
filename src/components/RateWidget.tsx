"use client";
import { useEffect, useRef, useState } from "react";

export default function RateWidget({ itemId, vendorId, current, authed, eventId }: { itemId: string; vendorId: string; current: number; authed: boolean; eventId?: string | null; }) {
  const [open, setOpen] = useState(false);
  const [avg, setAvg] = useState(current);
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const coords = useRef<{ lat: number; lng: number } | null>(null);

  // best-effort device location (needs HTTPS/localhost; degrades to REMOTE on insecure origins)
  useEffect(() => {
    if (!authed || !eventId || typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => { coords.current = { lat: p.coords.latitude, lng: p.coords.longitude }; },
      () => { /* denied / insecure context — fine, stays remote */ },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    );
  }, [authed, eventId]);

  if (!authed) {
    return (
      <a href="/signin" title="Sign in to rate"
        style={{ width: 40, height: 34, borderRadius: 17, display: "grid", placeItems: "center", background: "var(--surface2)", color: "var(--muted)", fontWeight: 800, fontSize: 15 }}>★</a>
    );
  }

  async function rate(score: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/rate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, vendorId, score, eventId: eventId ?? undefined, lat: coords.current?.lat, lng: coords.current?.lng }),
      });
      const data = await res.json();
      if (data.itemAvg != null) setAvg(data.itemAvg);
      if (data.presence) { setTier(data.presence); setTimeout(() => setTier(null), 2600); }
    } finally { setBusy(false); setOpen(false); }
  }

  const badge = tier === "GEO_QR" ? { t: "✓✓ verified", c: "var(--good,#3a9d5d)" }
    : tier === "GEO" ? { t: "📍 verified", c: "var(--good,#3a9d5d)" }
    : tier === "QR" ? { t: "✓ verified", c: "var(--good,#3a9d5d)" }
    : tier === "REMOTE" ? { t: "counts less — check in", c: "var(--muted)" } : null;

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
      {badge && <span style={{ fontSize: 10.5, fontWeight: 700, color: badge.c, whiteSpace: "nowrap" }}>{badge.t}</span>}
      {!open ? (
        <button onClick={() => setOpen(true)} aria-label="Rate this item"
          style={{ width: 40, height: 34, borderRadius: 17, border: 0, background: "var(--surface2)", color: "var(--accent-ink)", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          {tier ? "✓" : "★"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 190 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} disabled={busy} onClick={() => rate(n)}
              style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{n}</button>
          ))}
        </div>
      )}
    </div>
  );
}
