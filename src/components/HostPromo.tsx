"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Msg = { id: string; lead: string; blurb: string; ctaLabel: string; url: string };

// SmokeStack host-promo footer. Fetches a segment-appropriate message; for logged-in
// viewers it rotates every 60s and its impressions/clicks feed per-event/city CTR.
export default function HostPromo() {
  const pathname = usePathname();
  const [msg, setMsg] = useState<Msg | null>(null);
  const authedRef = useRef(false);
  const m = pathname?.match(/^\/e\/([^/]+)/);
  const slug = m ? m[1] : "";

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    async function load() {
      try {
        const res = await fetch(`/api/promo/next?eventSlug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        const d = await res.json();
        if (!alive) return;
        if (d.message) setMsg(d.message);
        authedRef.current = !!d.authed;
        return !!d.authed;
      } catch { return false; }
    }
    (async () => {
      const authed = await load();
      if (alive && authed) timer = setInterval(load, 60000); // rotate only while logged in
    })();
    return () => { alive = false; if (timer) clearInterval(timer); };
  }, [slug]);

  function onCtaClick() {
    if (!msg || !authedRef.current) return;
    try {
      const body = JSON.stringify({ messageId: msg.id, eventSlug: slug });
      navigator.sendBeacon?.("/api/promo/click", new Blob([body], { type: "application/json" }));
    } catch { /* best-effort */ }
  }

  if (!msg) return null;
  return (
    <footer className="sitefoot">
      <div className="sitefoot-in">
        <span className="sitefoot-flame">🔥</span>
        <div>
          <div className="sitefoot-lead">{msg.lead}</div>
          <div className="sitefoot-blurb">
            {msg.blurb}{" "}
            <a href={msg.url} target="_blank" rel="noopener noreferrer" onClick={onCtaClick}>{msg.ctaLabel}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
