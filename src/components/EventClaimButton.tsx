"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EventClaimButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="claimbtn" style={{ margin: 0 }} disabled={busy} onClick={async () => {
      setBusy(true);
      const r = await fetch("/api/event/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId }) });
      if (r.ok) router.refresh();
      else { const d = await r.json().catch(() => ({})); alert(d.error || "Could not claim"); setBusy(false); }
    }}>{busy ? "Claiming…" : "◎ Claim this event"}</button>
  );
}
