"use client";
import { useEffect, useState } from "react";

type Status = { tier: string; geo: boolean; qr: boolean };

export default function CheckInPanel({ eventId, authed, qrDataUrl, checkInUrl, justChecked }: { eventId: string; authed: boolean; qrDataUrl?: string | null; checkInUrl?: string | null; justChecked?: string | null }) {
  const [status, setStatus] = useState<Status>({ tier: "REMOTE", geo: false, qr: false });
  const [msg, setMsg] = useState<string | null>(justChecked === "qr" ? "Checked in with the event code — your ratings here now count more." : justChecked === "bad" ? "That check-in code wasn't valid." : null);
  const [busy, setBusy] = useState(false);
  const [showCode, setShowCode] = useState(false);

  async function refresh(lat?: number, lng?: number) {
    const q = new URLSearchParams({ eventId });
    if (lat != null && lng != null) { q.set("lat", String(lat)); q.set("lng", String(lng)); }
    const r = await fetch(`/api/checkin?${q.toString()}`, { cache: "no-store" });
    if (r.ok) setStatus(await r.json());
  }
  useEffect(() => { if (authed) refresh(); }, [authed]); // eslint-disable-line

  function geoCheckIn() {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setMsg("Location isn't available in this browser."); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (p) => {
      const r = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, method: "GEO", lat: p.coords.latitude, lng: p.coords.longitude }) });
      const d = await r.json(); setBusy(false);
      if (!r.ok) { setMsg(d.tooFar ? "You don't appear to be at the event yet — get closer and try again." : (d.error || "Check-in failed.")); return; }
      setStatus(d); setMsg("Checked in by location — your ratings here now count more.");
    }, () => { setBusy(false); setMsg("Couldn't read your location (needs HTTPS + permission). You can still scan the event QR."); }, { enableHighAccuracy: true, timeout: 8000 });
  }

  if (!authed) return null;
  const verified = status.tier !== "REMOTE";
  const how = status.geo && status.qr ? "location + code" : status.geo ? "location" : status.qr ? "event code" : "";

  return (
    <div className="checkin">
      <div className="checkin-status">
        <span className={`cidot ${verified ? "on" : ""}`} />
        <div className="grow">
          <b>{verified ? `Checked in · ${how}` : "Not checked in"}</b>
          <div className="v-sub">{verified ? "Your ratings at this event count for more." : "Check in so your ratings here count for more than a remote rating."}</div>
        </div>
        {!status.geo && <button className="cta" onClick={geoCheckIn} disabled={busy} style={{ padding: "8px 14px", fontSize: 13 }}>{busy ? "…" : "📍 Check in here"}</button>}
      </div>
      {msg && <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{msg}</div>}
      {(qrDataUrl || checkInUrl) && (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
          <button onClick={() => setShowCode(!showCode)} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--accent-ink)", fontWeight: 700, fontSize: 12.5, padding: 0 }}>{showCode ? "Hide" : "Show"} printable check-in QR (coordinator) {showCode ? "▾" : "▸"}</button>
          {showCode && (
            <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {qrDataUrl && <img src={qrDataUrl} alt="Event check-in QR" width={132} height={132} style={{ borderRadius: 10, background: "#fff", padding: 6 }} />}
              <div className="muted" style={{ fontSize: 11.5, maxWidth: 260, wordBreak: "break-all" }}>Print this at the gate. Attendees scan it once to check in for the day.<br /><a href={checkInUrl ?? "#"} target="_blank" style={{ color: "var(--accent-ink)" }}>{checkInUrl}</a></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
