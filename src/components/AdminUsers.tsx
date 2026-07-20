"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Membership = { id: string; scope: string; targetId: string | null; role: string };
type User = { id: string; email: string; displayName: string | null; reviewerScore: number; memberships: Membership[]; _count: { ratings: number } };
type Ref = { id: string; name: string };

const inp: React.CSSProperties = { padding: "8px 10px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)", fontSize: 13.5 };

async function post(body: unknown) {
  const r = await fetch("/api/admin/user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) alert(d.error || "Failed");
  return r.ok;
}

export default function AdminUsers({ users, events, vendors }: { users: User[]; events: Ref[]; vendors: Ref[] }) {
  const router = useRouter();
  const [newEmail, setNewEmail] = useState("");
  const evName = new Map(events.map((e) => [e.id, e.name]));
  const vnName = new Map(vendors.map((v) => [v.id, v.name]));
  const nameOf = (m: Membership) => m.scope === "PLATFORM" ? "platform" : m.scope === "EVENT" ? (evName.get(m.targetId ?? "") ?? "event") : (vnName.get(m.targetId ?? "") ?? "vendor");

  async function addUser() {
    if (!newEmail.includes("@")) return;
    if (await post({ op: "create", email: newEmail })) { setNewEmail(""); router.refresh(); }
  }

  return (
    <main className="wrap" style={{ maxWidth: 980 }}>
      <h1 style={{ fontSize: 23, letterSpacing: "-.02em", margin: "4px 0 2px" }}>Users &amp; permissions</h1>
      <p className="muted" style={{ marginTop: 0 }}>{users.length} users. Grant platform admin, event coordinator, or vendor owner/editor roles. All changes are audited.</p>

      <div className="card" style={{ padding: 14, display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new.user@email.com" style={{ ...inp, flex: "1 1 220px" }} />
        <button className="cta" onClick={addUser} style={{ padding: "9px 16px" }}>Add user</button>
      </div>

      {users.map((u) => <UserCard key={u.id} u={u} events={events} vendors={vendors} nameOf={nameOf} onDone={() => router.refresh()} />)}
    </main>
  );
}

function UserCard({ u, events, vendors, nameOf, onDone }: { u: User; events: Ref[]; vendors: Ref[]; nameOf: (m: Membership) => string; onDone: () => void }) {
  const admin = u.memberships.some((m) => m.scope === "PLATFORM" && m.role === "ADMIN");
  const [name, setName] = useState(u.displayName ?? "");
  const [score, setScore] = useState(String(u.reviewerScore));
  const [gScope, setGScope] = useState<"EVENT" | "VENDOR">("EVENT");
  const [gTarget, setGTarget] = useState("");
  const [gRole, setGRole] = useState("COORDINATOR");
  const nonPlatform = u.memberships.filter((m) => m.scope !== "PLATFORM");

  async function save() { if (await post({ op: "update", userId: u.id, displayName: name, reviewerScore: parseFloat(score) })) onDone(); }
  async function toggleAdmin() { if (await post({ op: "setAdmin", userId: u.id, value: !admin })) onDone(); }
  async function grant() {
    if (!gTarget) return;
    if (await post({ op: "grant", userId: u.id, scope: gScope, targetId: gTarget, role: gRole })) onDone();
  }
  async function revoke(id: string) { if (await post({ op: "revoke", membershipId: id })) onDone(); }

  const targets = gScope === "EVENT" ? events : vendors;
  const roles = gScope === "EVENT" ? ["COORDINATOR"] : ["OWNER", "EDITOR"];

  return (
    <div className="card" style={{ padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <b style={{ fontSize: 14.5 }}>{u.email}</b>
        {admin && <span className="abadge a-create">ADMIN</span>}
        <span className="muted" style={{ fontSize: 12 }}>· {u._count.ratings} ratings</span>
        <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={admin} onChange={toggleAdmin} /> Platform admin
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" style={{ ...inp, flex: "1 1 160px" }} />
        <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="0.0–1.0" inputMode="decimal" title="Reviewer trust 0–1" style={{ ...inp, width: 92 }} />
        <button className="cta" onClick={save} style={{ padding: "8px 14px" }}>Save</button>
      </div>

      <div className="muted" style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Roles</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {nonPlatform.length === 0 && <span className="muted" style={{ fontSize: 12.5 }}>No event/vendor roles.</span>}
        {nonPlatform.map((m) => (
          <span key={m.id} className="rolechip">{m.role} · {m.scope === "EVENT" ? "event" : "vendor"}: {nameOf(m)}<button onClick={() => revoke(m.id)} title="Revoke">×</button></span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select value={gScope} onChange={(e) => { const s = e.target.value as "EVENT" | "VENDOR"; setGScope(s); setGTarget(""); setGRole(s === "EVENT" ? "COORDINATOR" : "OWNER"); }} style={{ ...inp, flex: "0 0 auto" }}>
          <option value="EVENT">Event</option><option value="VENDOR">Vendor</option>
        </select>
        <select value={gTarget} onChange={(e) => setGTarget(e.target.value)} style={{ ...inp, flex: "1 1 160px" }}>
          <option value="">Choose {gScope === "EVENT" ? "event" : "vendor"}…</option>
          {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={gRole} onChange={(e) => setGRole(e.target.value)} style={{ ...inp, flex: "0 0 auto" }}>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={grant} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--accent-ink)", fontWeight: 700, fontSize: 13 }}>+ Grant</button>
      </div>
    </div>
  );
}
