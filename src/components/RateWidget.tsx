"use client";
import { useEffect, useRef, useState } from "react";

const TAGS = ["Worth the wait", "Great value", "Huge portion", "Would repeat", "Crowd favorite", "Overpriced", "Ran out early", "Skip it"];

export default function RateWidget({ itemId, vendorId, current, authed, eventId }: { itemId: string; vendorId: string; current: number; authed: boolean; eventId?: string | null; }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const coords = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!authed || !eventId || typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => { coords.current = { lat: p.coords.latitude, lng: p.coords.longitude }; }, () => {}, { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 });
  }, [authed, eventId]);

  if (!authed) {
    return <a href="/signin" title="Sign in to rate" style={{ width: 40, height: 34, borderRadius: 17, display: "grid", placeItems: "center", background: "var(--surface2)", color: "var(--muted)", fontWeight: 800, fontSize: 15 }}>★</a>;
  }

  function toggleTag(t: string) { setTags((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : cur.length < 6 ? [...cur, t] : cur); }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("vendorId", vendorId); fd.append("itemId", itemId);
    try {
      const r = await fetch("/api/rating-photo", { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) setPhotoUrl(d.url); else alert(d.error || "Upload failed");
    } finally { setUploading(false); }
  }

  async function submit() {
    if (score == null) return;
    setBusy(true);
    try {
      const res = await fetch("/api/rate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, vendorId, score, eventId: eventId ?? undefined, lat: coords.current?.lat, lng: coords.current?.lng, tags, note, photoUrl }),
      });
      const data = await res.json();
      if (data.presence) { setTier(data.presence); setTimeout(() => setTier(null), 2800); }
      setOpen(false); setScore(null); setTags([]); setNote(""); setPhotoUrl(null);
    } finally { setBusy(false); }
  }

  const badge = tier === "GEO_QR" ? { t: "✓✓ verified", c: "var(--good,#3a9d5d)" }
    : tier === "GEO" ? { t: "📍 verified", c: "var(--good,#3a9d5d)" }
    : tier === "QR" ? { t: "✓ verified", c: "var(--good,#3a9d5d)" }
    : tier === "REMOTE" ? { t: "counts less — check in", c: "var(--muted)" } : null;

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
      {badge && <span style={{ fontSize: 10.5, fontWeight: 700, color: badge.c, whiteSpace: "nowrap" }}>{badge.t}</span>}
      <button onClick={() => setOpen(!open)} aria-label="Rate this item"
        style={{ width: 40, height: 34, borderRadius: 17, border: 0, background: open ? "var(--accent-soft)" : "var(--surface2)", color: "var(--accent-ink)", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
        {tier ? "✓" : "★"}
      </button>

      {open && (
        <div className="ratepanel">
          <div className="rp-eyebrow">Your rating</div>
          <div className="rp-scores">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setScore(n)} className={`rp-score ${score === n ? "on" : ""}`}>{n}</button>
            ))}
          </div>
          <div className="rp-eyebrow">Tags <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></div>
          <div className="rp-tags">
            {TAGS.map((t) => <button key={t} onClick={() => toggleTag(t)} className={`rp-tag ${tags.includes(t) ? "on" : ""}`}>{t}</button>)}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={240} placeholder="Add a note (optional)…" rows={2} className="rp-note" />
          <div className="rp-photo">
            {photoUrl ? <img src={photoUrl} alt="" className="rp-thumb" /> : (
              <label className="rp-photobtn">{uploading ? "Uploading…" : "📷 Add photo"}<input type="file" accept="image/*" onChange={onPhoto} hidden disabled={uploading} /></label>
            )}
            {photoUrl && <button onClick={() => setPhotoUrl(null)} className="rp-photorm">remove</button>}
          </div>
          <div className="rp-actions">
            <button onClick={() => setOpen(false)} className="rp-cancel">Cancel</button>
            <button onClick={submit} disabled={score == null || busy} className="rp-submit">{busy ? "…" : "Submit"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
