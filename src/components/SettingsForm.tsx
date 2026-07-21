"use client";
import { useState } from "react";

type U = { email: string; ratingMode: string; photoStrikes: number; photoBanned: boolean; ratingBanned: boolean };

export default function SettingsForm({ user }: { user: U }) {
  const [mode, setMode] = useState(user.ratingMode);
  const [saved, setSaved] = useState(false);

  async function choose(m: string) {
    setMode(m);
    await fetch("/api/me/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ratingMode: m }) });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  const opts: [string, string, string][] = [
    ["SIMPLE", "Simple", "Just an overall 1–10 score. One tap, done — best for most people."],
    ["DETAILED", "Detailed", "Score plus quick tags, a note, and a photo. For power raters."],
  ];

  return (
    <main className="wrap" style={{ maxWidth: 560 }}>
      <a className="back" href="/">‹ Home</a>
      <h1 style={{ fontSize: 23, letterSpacing: "-.02em", margin: "4px 0 2px" }}>Settings</h1>
      <p className="muted" style={{ marginTop: 0 }}>{user.email}</p>

      <div className="eyebrow">Rating style{saved && <span style={{ color: "var(--good,#3a9d5d)", marginLeft: 8 }}>Saved ✓</span>}</div>
      <div className="card" style={{ padding: 8 }}>
        {opts.map(([val, title, desc]) => (
          <label key={val} className={`modeopt ${mode === val ? "on" : ""}`}>
            <input type="radio" name="ratingMode" checked={mode === val} onChange={() => choose(val)} />
            <div><b>{title}</b><div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{desc}</div></div>
          </label>
        ))}
      </div>

      {(user.photoStrikes > 0 || user.photoBanned || user.ratingBanned) && (
        <>
          <div className="eyebrow">Account standing</div>
          <div className="card" style={{ padding: 16, fontSize: 13.5 }}>
            <div>Photo strikes: <b>{user.photoStrikes}</b></div>
            {user.photoBanned && <div style={{ color: "var(--bad)", marginTop: 4 }}>Photo posting is disabled after repeated removals.</div>}
            {user.ratingBanned && <div style={{ color: "var(--bad)", marginTop: 4 }}>Rating is disabled on your account.</div>}
          </div>
        </>
      )}
    </main>
  );
}
