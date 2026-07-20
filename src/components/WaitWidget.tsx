"use client";
import { useState } from "react";

function worth(rating: number, wait: number | null): number | null {
  if (!wait || wait <= 0) return null;
  return Math.round((rating / wait) * 100) / 10;
}

export default function WaitWidget({ appearanceId, initialWait, rating, authed }: { appearanceId: string; initialWait: number | null; rating: number; authed: boolean; }) {
  const [wait, setWait] = useState<number | null>(initialWait);
  const [busy, setBusy] = useState(false);
  const [thanks, setThanks] = useState(false);
  const w = worth(rating, wait);
  const worthColor = w == null ? "var(--muted)" : w >= 5 ? "var(--good)" : w >= 2 ? "var(--accent-ink)" : "var(--bad)";

  async function report(min: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/wait", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appearanceId, waitMin: min }),
      });
      const d = await res.json();
      if (d.currentWaitMin != null) setWait(d.currentWaitMin);
      setThanks(true); setTimeout(() => setThanks(false), 1600);
    } finally { setBusy(false); }
  }

  return (
    <div className="wait-card">
      <div className="wait-top">
        <div>
          <div className="wm tnum">{wait == null ? "—" : `~${wait}`}<small>{wait == null ? "no reports yet" : " min line"}</small></div>
        </div>
        <div className="worth">
          <b className="tnum" style={{ color: worthColor }}>{w == null ? "—" : w.toFixed(1)}</b>
          <span>worth-the-wait</span>
        </div>
      </div>
      <div className="wait-report">
        {authed ? (
          <>
            <span className="lbl">{thanks ? "thanks! ✓" : "Report the line:"}</span>
            {[5, 15, 30, 45, 60].map((m) => (
              <button key={m} disabled={busy} onClick={() => report(m)}>{m}m</button>
            ))}
          </>
        ) : (
          <a href="/signin" className="authlink">Sign in to report the line →</a>
        )}
      </div>
    </div>
  );
}
