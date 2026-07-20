"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimButton({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="claimbtn" disabled={busy} onClick={async () => {
      setBusy(true);
      const r = await fetch("/api/vendor/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId }) });
      if (r.ok) { router.refresh(); }
      else { const d = await r.json().catch(() => ({})); alert(d.error || "Could not claim"); setBusy(false); }
    }}>{busy ? "Claiming…" : "◎ Claim this vendor"}</button>
  );
}
