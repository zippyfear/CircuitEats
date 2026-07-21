"use client";
import { useState } from "react";

export default function PhotoControls({ photoId, score: initial, authed, mine }: { photoId: string; score: number; authed: boolean; mine: boolean }) {
  const [score, setScore] = useState(initial);
  const [my, setMy] = useState(0);
  const [flagged, setFlagged] = useState(false);

  async function vote(v: number) {
    if (!authed) { location.href = "/signin"; return; }
    const r = await fetch("/api/photo/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photoId, value: v }) });
    const d = await r.json();
    if (d.score != null) { setScore(d.score); setMy(v); }
  }
  async function flag() {
    if (!authed) { location.href = "/signin"; return; }
    if (!confirm("Report this photo as inappropriate? Enough reports hide it and penalize the poster.")) return;
    await fetch("/api/photo/flag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photoId }) });
    setFlagged(true);
  }

  return (
    <div className="photoctl">
      <button className={`pc-vote ${my === 1 ? "on" : ""}`} onClick={() => vote(1)} title="Good photo">▲</button>
      <span className="pc-score tnum">{score}</span>
      <button className={`pc-vote ${my === -1 ? "on" : ""}`} onClick={() => vote(-1)} title="Poor photo">▼</button>
      {!mine && <button className="pc-flag" onClick={flag} disabled={flagged} title="Report inappropriate">{flagged ? "reported" : "⚑"}</button>}
    </div>
  );
}
