"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; name: string; typicalPriceCents: number | null; categoryId: string | null };
type Link = { label: string; url: string };
type Vendor = { id: string; name: string; slug: string; bio: string | null; website: string | null; homeBase: string | null; logoUrl: string | null; customLinks: Link[] | null; items: Item[] };

const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 14, marginBottom: 10 };

export default function VendorEditForm({ vendor }: { vendor: Vendor; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [bio, setBio] = useState(vendor.bio ?? "");
  const [website, setWebsite] = useState(vendor.website ?? "");
  const [homeBase, setHomeBase] = useState(vendor.homeBase ?? "");
  const [logoUrl, setLogoUrl] = useState(vendor.logoUrl ?? "");
  const [links, setLinks] = useState<Link[]>(Array.isArray(vendor.customLinks) ? vendor.customLinks : []);
  const [saved, setSaved] = useState(false);
  const [ni, setNi] = useState({ name: "", price: "" });

  async function saveProfile() {
    await fetch("/api/vendor/update", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: vendor.id, bio, website, homeBase, logoUrl, customLinks: links }) });
    setSaved(true); setTimeout(() => setSaved(false), 1600); router.refresh();
  }
  async function saveItem(item: Item, name: string, price: string) {
    await fetch("/api/item", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: vendor.id, itemId: item.id, name, priceCents: price ? Math.round(parseFloat(price) * 100) : null, categoryId: item.categoryId }) });
    router.refresh();
  }
  async function delItem(id: string) {
    await fetch("/api/item", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: id }) });
    router.refresh();
  }
  async function addItem() {
    if (!ni.name.trim()) return;
    await fetch("/api/item", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: vendor.id, name: ni.name, priceCents: ni.price ? Math.round(parseFloat(ni.price) * 100) : null }) });
    setNi({ name: "", price: "" }); router.refresh();
  }

  return (
    <main className="wrap" style={{ maxWidth: 620 }}>
      <a className="back" href={`/v/${vendor.slug}`}>‹ Back to {vendor.name}</a>
      <h1 style={{ fontSize: 24, letterSpacing: "-.02em", margin: "0 0 4px" }}>Edit {vendor.name}</h1>
      <p className="muted" style={{ marginTop: 0 }}>You own this vendor page. Changes go live immediately.</p>

      <div className="eyebrow">Profile</div>
      <div className="card" style={{ padding: 18 }}>
        <label className="muted">Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} style={{ ...input, resize: "vertical" }} />
        <label className="muted">Website</label>
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" style={input} />
        <label className="muted">Home base</label>
        <input value={homeBase} onChange={(e) => setHomeBase(e.target.value)} placeholder="City, ST" style={input} />
        <label className="muted">Logo image URL</label>
        <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" style={input} />
        <label className="muted">Custom links / CTAs</label>
        {links.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input value={l.label} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Label" style={{ ...input, marginBottom: 0 }} />
            <input value={l.url} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://" style={{ ...input, marginBottom: 0 }} />
            <button onClick={() => setLinks(links.filter((_, j) => j !== i))} style={{ border: 0, background: "var(--surface2)", borderRadius: 8, padding: "0 12px", cursor: "pointer", color: "var(--bad)", fontWeight: 800 }}>×</button>
          </div>
        ))}
        <button onClick={() => setLinks([...links, { label: "", url: "" }])} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--accent-ink)", fontWeight: 700, fontSize: 13 }}>+ Add link</button>
        <div style={{ marginTop: 14 }}><button className="cta" onClick={saveProfile}>{saved ? "Saved ✓" : "Save profile"}</button></div>
      </div>

      <div className="eyebrow">Menu &amp; pricing</div>
      <div className="card">
        {vendor.items.map((it) => <ItemRow key={it.id} item={it} onSave={saveItem} onDelete={delItem} />)}
        <div className="item" style={{ gap: 8 }}>
          <input value={ni.name} onChange={(e) => setNi({ ...ni, name: e.target.value })} placeholder="New item name" style={{ ...input, marginBottom: 0, flex: 1 }} />
          <input value={ni.price} onChange={(e) => setNi({ ...ni, price: e.target.value })} placeholder="$" style={{ ...input, marginBottom: 0, width: 70 }} />
          <button className="cta" onClick={addItem} style={{ padding: "10px 14px" }}>Add</button>
        </div>
      </div>
    </main>
  );
}

function ItemRow({ item, onSave, onDelete }: { item: Item; onSave: (it: Item, name: string, price: string) => void; onDelete: (id: string) => void }) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.typicalPriceCents != null ? (item.typicalPriceCents / 100).toFixed(0) : "");
  const inp: React.CSSProperties = { padding: "9px 11px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 14 };
  return (
    <div className="item" style={{ gap: 8 }}>
      <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inp, flex: 1 }} />
      <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$" style={{ ...inp, width: 60 }} />
      <button style={{ background: "none", border: 0, cursor: "pointer", color: "var(--accent-ink)", fontWeight: 700 }} onClick={() => onSave(item, name, price)}>Save</button>
      <button style={{ background: "none", border: 0, cursor: "pointer", color: "var(--bad)", fontWeight: 700 }} onClick={() => onDelete(item.id)}>Delete</button>
    </div>
  );
}
