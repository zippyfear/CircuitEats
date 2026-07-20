"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Cfg = { vocab: Record<string, string>; features: Record<string, boolean>; theme: Record<string, string> };
const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 14, marginBottom: 10 };
const FEATS = ["rating", "voting", "ordering", "waitTimes", "ticketing", "schedule"];

export default function EventManageForm({ eventId, slug, name, cfg }: { eventId: string; slug: string; name: string; cfg: Cfg }) {
  const router = useRouter();
  const [accent, setAccent] = useState(cfg.theme?.accent ?? "#DE7127");
  const [bannerUrl, setBannerUrl] = useState(cfg.theme?.bannerUrl ?? "");
  const [logoUrl, setLogoUrl] = useState(cfg.theme?.logoUrl ?? "");
  const [features, setFeatures] = useState<Record<string, boolean>>({ ...cfg.features });
  const [vocab, setVocab] = useState<Record<string, string>>({ ...cfg.vocab });
  const [saved, setSaved] = useState(false);

  async function save() {
    const config = { theme: { accent, bannerUrl, logoUrl }, features, vocab };
    await fetch("/api/event/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, config }) });
    setSaved(true); setTimeout(() => setSaved(false), 1600); router.refresh();
  }

  return (
    <main className="wrap" style={{ maxWidth: 600 }}>
      <a className="back" href={`/e/${slug}`}>‹ Back to {name}</a>
      <h1 style={{ fontSize: 24, letterSpacing: "-.02em", margin: "0 0 4px" }}>Manage {name}</h1>
      <p className="muted" style={{ marginTop: 0 }}>Branding and features apply to this event and every vendor page under it.</p>

      <div className="eyebrow">Branding</div>
      <div className="card" style={{ padding: 18 }}>
        <label className="muted">Accent color</label><br />
        <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 60, height: 38, border: 0, background: "none", marginBottom: 10, cursor: "pointer" }} />
        <label className="muted">Banner image URL</label>
        <input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://…/banner.jpg" style={input} />
        <label className="muted">Logo image URL</label>
        <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" style={input} />
      </div>

      <div className="eyebrow">Features</div>
      <div className="card" style={{ padding: 18 }}>
        {FEATS.map((f) => (
          <label key={f} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={!!features[f]} onChange={(e) => setFeatures({ ...features, [f]: e.target.checked })} />
            <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{f}</span>
          </label>
        ))}
      </div>

      <div className="eyebrow">Vocabulary</div>
      <div className="card" style={{ padding: 18 }}>
        <label className="muted">Participant (singular / plural)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={vocab.participant ?? ""} onChange={(e) => setVocab({ ...vocab, participant: e.target.value })} style={input} />
          <input value={vocab.participantPlural ?? ""} onChange={(e) => setVocab({ ...vocab, participantPlural: e.target.value })} style={input} />
        </div>
        <label className="muted">Offering (singular / plural)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={vocab.offering ?? ""} onChange={(e) => setVocab({ ...vocab, offering: e.target.value })} style={input} />
          <input value={vocab.offeringPlural ?? ""} onChange={(e) => setVocab({ ...vocab, offeringPlural: e.target.value })} style={input} />
        </div>
      </div>

      <button className="cta" onClick={save} style={{ marginTop: 16 }}>{saved ? "Saved ✓" : "Save event settings"}</button>
    </main>
  );
}
