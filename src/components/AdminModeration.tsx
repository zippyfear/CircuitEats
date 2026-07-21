"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Config = { flagHideThreshold: number; photoBanStrikes: number; ratingBanStrikes: number };
type Photo = { id: string; url: string; status: string; score: number; flagCount: number; user: { email: string }; vendor: { name: string; slug: string } | null };
type User = { id: string; email: string; photoStrikes: number; photoBanned: boolean; ratingBanned: boolean };
type Alert = { id: string; action: string; entityType: string; label: string | null; createdAt: string; actor: { email: string } };

async function act(body: unknown) {
  const r = await fetch("/api/admin/moderation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) alert(d.error || "Failed");
  return r.ok;
}
function ago(iso: string) { const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000); return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`; }
const isBan = (a: Alert) => /ban/i.test(a.label ?? "");

export default function AdminModeration({ config, photos, users, alerts }: { config: Config; photos: Photo[]; users: User[]; alerts: Alert[] }) {
  const router = useRouter();
  const [cfg, setCfg] = useState(config);
  const [savedCfg, setSavedCfg] = useState(false);

  async function saveCfg() { if (await act({ op: "config", ...cfg })) { setSavedCfg(true); setTimeout(() => setSavedCfg(false), 1500); router.refresh(); } }
  async function photoAct(photoId: string, body: Record<string, unknown>) { if (await act({ op: "photo", photoId, ...body })) router.refresh(); }
  async function userAct(userId: string, body: Record<string, unknown>) { if (await act({ op: "user", userId, ...body })) router.refresh(); }

  const num = (k: keyof Config) => (
    <label className="flbl">{k === "flagHideThreshold" ? "Flags to hide a photo" : k === "photoBanStrikes" ? "Strikes to photo-ban" : "Strikes to rating-ban"}
      <input type="number" min={1} max={100} value={cfg[k]} onChange={(e) => setCfg({ ...cfg, [k]: parseInt(e.target.value) || 1 })} style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 14, width: 90 }} />
    </label>
  );

  return (
    <main className="wrap" style={{ maxWidth: 980 }}>
      <h1 style={{ fontSize: 23, letterSpacing: "-.02em", margin: "4px 0 2px" }}>Moderation</h1>
      <p className="muted" style={{ marginTop: 0 }}>Tune the crowd thresholds, watch bans and hides as they happen, and override anything.</p>

      {/* thresholds */}
      <div className="eyebrow">Thresholds{savedCfg && <span style={{ color: "var(--good,#3a9d5d)", marginLeft: 8 }}>Saved ✓</span>}</div>
      <div className="card" style={{ padding: 16, display: "flex", gap: 18, alignItems: "flex-end", flexWrap: "wrap" }}>
        {num("flagHideThreshold")}{num("photoBanStrikes")}{num("ratingBanStrikes")}
        <button className="cta" onClick={saveCfg} style={{ padding: "9px 16px" }}>Save thresholds</button>
      </div>

      {/* alerts feed */}
      <div className="eyebrow" style={{ marginTop: 20 }}>Recent actions &amp; alerts</div>
      <div className="card">
        {alerts.length === 0 && <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>No moderation activity yet.</div>}
        {alerts.map((a) => (
          <div className="auditrow" key={a.id}>
            <span className={`abadge ${isBan(a) ? "a-delete" : "a-update"}`}>{isBan(a) ? "BAN" : a.entityType.toUpperCase()}</span>
            <div className="grow">{a.label ?? a.action}<div className="v-sub">{a.actor.email} · {ago(a.createdAt)} ago</div></div>
          </div>
        ))}
      </div>

      {/* flagged / hidden photos */}
      <div className="eyebrow" style={{ marginTop: 20 }}>Flagged &amp; hidden photos</div>
      <div className="card">
        {photos.length === 0 && <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>Nothing in the queue.</div>}
        {photos.map((p) => (
          <div className="modrow" key={p.id}>
            <img src={p.url} alt="" className="modthumb" />
            <div className="grow">
              <div><b>{p.vendor?.name ?? "—"}</b> <span className={`modstatus s-${p.status.toLowerCase()}`}>{p.status}</span></div>
              <div className="v-sub">by {p.user.email} · {p.flagCount} flags · score {p.score}</div>
              <div className="modacts">
                {p.status !== "VISIBLE" && <button onClick={() => photoAct(p.id, { status: "VISIBLE", clearFlags: true })}>Restore</button>}
                {p.status !== "BANNED" && <button className="danger" onClick={() => photoAct(p.id, { status: "BANNED" })}>Ban photo</button>}
                {p.flagCount > 0 && <button onClick={() => photoAct(p.id, { clearFlags: true })}>Clear flags</button>}
                <button onClick={() => { const v = prompt("Set photo score (override votes):", String(p.score)); if (v != null) photoAct(p.id, { score: parseInt(v) || 0 }); }}>Set score</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* users with strikes / bans */}
      <div className="eyebrow" style={{ marginTop: 20 }}>Struck &amp; banned users</div>
      <div className="card">
        {users.length === 0 && <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>No penalized users.</div>}
        {users.map((u) => (
          <div className="modrow" key={u.id}>
            <div className="grow">
              <div><b>{u.email}</b> {u.photoBanned && <span className="modstatus s-banned">PHOTO-BAN</span>} {u.ratingBanned && <span className="modstatus s-banned">RATING-BAN</span>}</div>
              <div className="v-sub">{u.photoStrikes} strikes</div>
              <div className="modacts">
                {u.photoBanned && <button onClick={() => userAct(u.id, { photoBanned: false, restorePhotos: true })}>Un-photo-ban</button>}
                {u.ratingBanned && <button onClick={() => userAct(u.id, { ratingBanned: false })}>Un-rating-ban</button>}
                {u.photoStrikes > 0 && <button onClick={() => userAct(u.id, { photoStrikes: 0 })}>Reset strikes</button>}
                <button onClick={() => { const v = prompt("Set strikes:", String(u.photoStrikes)); if (v != null) userAct(u.id, { photoStrikes: parseInt(v) || 0 }); }}>Set strikes</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
