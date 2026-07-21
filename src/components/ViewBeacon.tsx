"use client";
import { useEffect } from "react";

// Fire-and-forget vendor-view ping (rendered only for non-owners).
export default function ViewBeacon({ vendorId }: { vendorId: string }) {
  useEffect(() => {
    try {
      const body = JSON.stringify({ vendorId });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/vendor/view", new Blob([body], { type: "application/json" }));
      else fetch("/api/vendor/view", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    } catch { /* best-effort */ }
  }, [vendorId]);
  return null;
}
