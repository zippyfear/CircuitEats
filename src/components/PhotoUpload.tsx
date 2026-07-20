"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function PhotoUpload({ vendorId, itemId, asLogo, label }: { vendorId: string; itemId?: string; asLogo?: boolean; label: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(f: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("vendorId", vendorId);
    if (itemId) fd.append("itemId", itemId);
    if (asLogo) fd.append("asLogo", "true");
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    setBusy(false);
    if (r.ok) router.refresh();
    else { const d = await r.json().catch(() => ({})); alert(d.error || "Upload failed"); }
  }

  return (
    <>
      <button type="button" className="uploadbtn" disabled={busy} onClick={() => ref.current?.click()}>{busy ? "Uploading…" : label}</button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
    </>
  );
}
