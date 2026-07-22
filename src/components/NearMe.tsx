"use client";
import { useMemo, useState } from "react";

export type NearEvent = {
  id: string; slug: string; name: string; venue: string | null;
  city: string | null; region: string | null; lat: number | null; lng: number | null;
  dateLabel: string; upcoming: boolean; vendors: number;
};

// Preset anchors so distance sorting works even where the browser blocks geolocation
// (insecure-origin dev, denied permission). Real geolocation is used when available.
const ANCHORS = [
  { label: "East Troy, WI", lat: 42.7878, lng: -88.4048 },
  { label: "Milwaukee, WI", lat: 43.0389, lng: -87.9065 },
  { label: "Chicago, IL", lat: 41.8781, lng: -87.6298 },
  { label: "Austin, TX", lat: 30.2672, lng: -97.7431 },
];

function miles(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export default function NearMe({ events }: { events: NearEvent[] }) {
  const [anchor, setAnchor] = useState<{ label: string; lat: number; lng: number } | null>(null);
  const [region, setRegion] = useState("");
  const [geo, setGeo] = useState<"idle" | "loading" | "denied" | "ok">("idle");

  const regions = useMemo(() => Array.from(new Set(events.map((e) => e.region).filter(Boolean))).sort() as string[], [events]);

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGeo("denied"); return; }
    setGeo("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setAnchor({ label: "Your location", lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeo("ok"); },
      () => setGeo("denied"),
      { timeout: 8000, maximumAge: 300000 }
    );
  };

  const list = useMemo(() => {
    let evs: (NearEvent & { dist?: number | null })[] = events.slice();
    if (region) evs = evs.filter((e) => e.region === region);
    if (anchor) {
      evs = evs
        .map((e) => ({ ...e, dist: e.lat != null && e.lng != null ? miles(anchor.lat, anchor.lng, e.lat, e.lng) : null }))
        .sort((a, b) => (a.dist ?? 1e9) - (b.dist ?? 1e9));
    }
    return evs;
  }, [events, region, anchor]);

  const distLabel = (mi: number | null | undefined) =>
    mi == null ? null : mi < 10 ? `${mi.toFixed(1)} mi away` : `${Math.round(mi)} mi away`;

  return (
    <>
      <div className="near-controls">
        <button type="button" className="near-geo" onClick={useMyLocation} disabled={geo === "loading"}>
          {geo === "loading" ? "Locating…" : "📍 Use my location"}
        </button>
        <span className="near-or">or near</span>
        {ANCHORS.map((a) => (
          <button key={a.label} type="button" className={`fchip ${anchor?.label === a.label ? "on" : ""}`} onClick={() => { setAnchor(a); setGeo("idle"); }}>{a.label}</button>
        ))}
        <select className="near-region" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Filter by state">
          <option value="">All states</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {geo === "denied" && <p className="near-note">Location isn’t available here — pick an anchor city or a state above to sort by distance.</p>}
      {anchor && <p className="near-note">Sorted by distance from <b>{anchor.label}</b>.</p>}

      <div className="card">
        {list.map((e) => (
          <a className="erow" href={`/e/${e.slug}`} key={e.id}>
            <div>
              <div className="e-name">{e.name}{!e.upcoming && <span className="e-past"> · past</span>}</div>
              <div className="e-meta">{e.venue ?? ([e.city, e.region].filter(Boolean).join(", ") || "on the circuit")}</div>
            </div>
            <div className="e-right">
              <div className="e-dates tnum">{e.dateLabel}</div>
              {"dist" in e && (e as { dist?: number | null }).dist != null
                ? <div className="e-dist tnum">◎ {distLabel((e as { dist?: number | null }).dist)}</div>
                : <div className="e-count tnum">{e.vendors} {e.vendors === 1 ? "vendor" : "vendors"}</div>}
            </div>
          </a>
        ))}
        {list.length === 0 && <p className="muted" style={{ padding: 16 }}>No events in that area.</p>}
      </div>
    </>
  );
}
