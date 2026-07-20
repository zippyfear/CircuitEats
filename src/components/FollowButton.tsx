"use client";
import { useState } from "react";

export default function FollowButton({ vendorId, initialFollowing, initialCount, authed }: { vendorId: string; initialFollowing: boolean; initialCount: number; authed: boolean; }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  if (!authed) return <a href="/signin" className="followbtn">☆ Follow · {count}</a>;

  return (
    <button className={`followbtn ${following ? "on" : ""}`} disabled={busy} onClick={async () => {
      setBusy(true);
      const r = await fetch("/api/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId }) });
      const d = await r.json().catch(() => ({}));
      if (d.following != null) { setFollowing(d.following); setCount(d.count); }
      setBusy(false);
    }}>{following ? "★ Following" : "☆ Follow"} · {count}</button>
  );
}
