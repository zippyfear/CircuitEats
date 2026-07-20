"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUpload from "@/components/PhotoUpload";

type Variant = { id?: string; label: string; priceCents: number; note: string | null; qty: number | null };
type Item = { id: string; name: string; typicalPriceCents: number | null; categoryId: string | null; unit: string | null; variants: Variant[] };
type Link = { label: string; url: string };
type Photo = { id: string; url: string };
type Cat = { id: string; name: string };
type Vendor = { id: string; name: string; slug: string; bio: string | null; website: string | null; homeBase: string | null; logoUrl: string | null; customLinks: Link[] | null; items: Item[]; photos: Photo[] };

const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 14, marginBottom: 10 };

export default function VendorEditForm({ vendor, categories }: { vendor: Vendor; categories: Cat[] }) {
  const router = useRouter();
  const [bio, setBio] = useState(vendor.bio ?? "");
  const [website, setWebsite] = useState(vendor.website ?? "");
  const [homeBase, setHomeBase] = useState(vendor.homeBase ?? "");
  const [logoUrl, setLogoUrl] = useState(vendor.logoUrl ?? "");
  const [links, setLinks] = useState<Link[]>(Array.isArray(vendor.customLinks) ? vendor.customLinks : []);
  const [saved, setSaved] = useState(false);
  const [ni, setNi] = useState({ name: "", categoryId: "" });

  async function saveProfile() {
    await fetch("/api/vendor/update", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: vendor.id, bio, website, homeBase, logoUrl, customLinks: links }) });
    setSaved(true); setTimeout(() => setSaved(false), 1600); router.refresh();
  }
  async function saveItem(itemId: string | null, name: string, categoryId: string, unit: string, variants: Variant[]) {
    await fetch("/api/item", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: vendor.id, itemId: itemId ?? undefined, name, categoryId: categoryId || null, unit: unit || null, variants }) });
    router.refresh();
  }
  async function delItem(id: string) {
    if (!confirm("Delete this item and all its portions? Ratings for it are removed too.")) return;
    await fetch("/api/item", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: id }) });
    router.refresh();
  }
  async function addItem() {
    if (!ni.name.trim()) return;
    await saveItem(null, ni.name, ni.categoryId, "", []);
    setNi({ name: "", categoryId: "" });
  }

  return (
    <main className="wrap" style={{ maxWidth: 640 }}>
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
        <label className="muted">Logo</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />}
          <PhotoUpload vendorId={vendor.id} asLogo label="Upload logo" />
        </div>
        <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="…or paste an image URL" style={input} />
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

      <div className="eyebrow">Photos</div>
      <div className="card" style={{ padding: 16 }}>
        {vendor.photos.length > 0 && (
          <div className="photostrip" style={{ marginBottom: 10 }}>
            {vendor.photos.map((p) => <img key={p.id} src={p.url} alt="" className="photo" />)}
          </div>
        )}
        <PhotoUpload vendorId={vendor.id} label="+ Add photo" />
      </div>

      <div className="eyebrow">Menu, portions &amp; pricing</div>
      <p className="muted" style={{ margin: "-4px 0 10px", fontSize: 12.5 }}>Each item can have multiple portion/size options (e.g. Half rack, Full rack · Small/Med/Large), each with its own price. The lowest is shown as the “from” price.</p>
      {vendor.items.map((it) => <ItemEditor key={it.id} item={it} categories={categories} onSave={saveItem} onDelete={delItem} />)}

      <div className="eyebrow" style={{ marginTop: 18 }}>Add an item</div>
      <div className="card" style={{ padding: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={ni.name} onChange={(e) => setNi({ ...ni, name: e.target.value })} placeholder="New item name" style={{ ...input, marginBottom: 0, flex: "1 1 180px" }} />
        <select value={ni.categoryId} onChange={(e) => setNi({ ...ni, categoryId: e.target.value })} style={{ ...input, marginBottom: 0, flex: "1 1 140px" }}>
          <option value="">Category…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="cta" onClick={addItem} style={{ padding: "10px 16px" }}>Add item</button>
      </div>
    </main>
  );
}

const money = (c: number) => (c % 100 === 0 ? (c / 100).toFixed(0) : (c / 100).toFixed(2));

function ItemEditor({ item, categories, onSave, onDelete }: { item: Item; categories: Cat[]; onSave: (itemId: string | null, name: string, categoryId: string, unit: string, variants: Variant[]) => void; onDelete: (id: string) => void }) {
  const [name, setName] = useState(item.name);
  const [categoryId, setCategoryId] = useState(item.categoryId ?? "");
  const [unit, setUnit] = useState(item.unit ?? "");
  const [rows, setRows] = useState<{ label: string; price: string; note: string; qty: string }[]>(
    item.variants.length
      ? item.variants.map((v) => ({ label: v.label, price: money(v.priceCents), note: v.note ?? "", qty: v.qty != null ? String(v.qty) : "" }))
      : (item.typicalPriceCents != null ? [{ label: "Regular", price: money(item.typicalPriceCents), note: "", qty: "" }] : [{ label: "", price: "", note: "", qty: "" }])
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const inp: React.CSSProperties = { padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 13.5 };

  // live preview of the average price per single unit (e.g. per rib)
  const priced = rows.filter((r) => r.price.trim() !== "" && !isNaN(parseFloat(r.price)));
  const withQty = priced.filter((r) => r.qty.trim() !== "" && parseFloat(r.qty) > 0);
  const avgUnit = unit.trim() && withQty.length ? withQty.reduce((s, r) => s + parseFloat(r.price) / parseFloat(r.qty), 0) / withQty.length : null;

  function save() {
    const variants: Variant[] = rows
      .filter((r) => r.label.trim() && r.price.trim() !== "" && !isNaN(parseFloat(r.price)))
      .map((r) => ({ label: r.label.trim(), priceCents: Math.round(parseFloat(r.price) * 100), note: r.note.trim() || null, qty: r.qty.trim() !== "" && parseFloat(r.qty) > 0 ? parseFloat(r.qty) : null }));
    setBusy(true);
    Promise.resolve(onSave(item.id, name, categoryId, unit, variants)).finally(() => { setBusy(false); setDone(true); setTimeout(() => setDone(false), 1500); });
  }

  return (
    <div className="card" style={{ padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" style={{ ...inp, flex: "1 1 180px" }} />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ ...inp, flex: "1 1 130px" }}>
          <option value="">Category…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span className="muted" style={{ fontSize: 12.5 }}>Priced by unit</span>
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="rib, lb, link…" style={{ ...inp, width: 120 }} />
        <span className="muted" style={{ fontSize: 11.5 }}>optional — enables a “per-{unit.trim() || "unit"}” average across portions</span>
      </div>

      <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", margin: "2px 0 6px", display: "flex", justifyContent: "space-between" }}>
        <span>Portions / sizes{unit.trim() ? ` · qty = # of ${unit.trim()}s` : ""}</span>
        {avgUnit != null && <span style={{ color: "var(--accent-ink)" }}>≈ ${avgUnit % 1 === 0 ? avgUnit.toFixed(0) : avgUnit.toFixed(2)}/{unit.trim()} avg</span>}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <input value={r.label} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Half rack" style={{ ...inp, flex: "1 1 90px" }} />
          <div style={{ position: "relative", flex: "0 0 76px" }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 13 }}>$</span>
            <input value={r.price} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} placeholder="16" inputMode="decimal" style={{ ...inp, width: "100%", paddingLeft: 18 }} />
          </div>
          {unit.trim() && (
            <input value={r.qty} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} placeholder={`# ${unit.trim()}s`} inputMode="decimal" title={`How many ${unit.trim()}s in this portion`} style={{ ...inp, flex: "0 0 66px" }} />
          )}
          <input value={r.note} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} placeholder="note" style={{ ...inp, flex: "1 1 70px" }} />
          <button onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : rows)} title="Remove portion" style={{ border: 0, background: "var(--surface2)", borderRadius: 8, padding: "7px 11px", cursor: "pointer", color: "var(--bad)", fontWeight: 800 }}>×</button>
        </div>
      ))}
      <button onClick={() => setRows([...rows, { label: "", price: "", note: "", qty: "" }])} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--accent-ink)", fontWeight: 700, fontSize: 13, marginTop: 2 }}>+ Add portion / size</button>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <button className="cta" onClick={save} disabled={busy} style={{ padding: "9px 16px", opacity: busy ? 0.6 : 1 }}>{done ? "Saved ✓" : busy ? "Saving…" : "Save item"}</button>
        <button onClick={() => onDelete(item.id)} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--bad)", fontWeight: 700, fontSize: 13 }}>Delete item</button>
      </div>
    </div>
  );
}
