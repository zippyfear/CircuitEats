import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const CARDS: [string, string, string][] = [
  ["/admin/users", "Users & permissions", "Add users, edit profiles, grant admin / coordinator / owner roles"],
  ["/admin/events", "Events", "Override event name, venue, city, dates, status"],
  ["/admin/vendors", "Vendors & menus", "Override any vendor's info, menu items, portions & pricing"],
  ["/admin/promo", "Promo CTR", "SmokeStack footer performance by event / city"],
  ["/admin/merge", "Merge vendors", "Fold a duplicate vendor into the canonical one — audited + reversible"],
  ["/admin/audit", "Audit log", "Every change, who made it, when — with one-click rollback"],
];

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default async function AdminHome() {
  const [users, events, vendors, items, audits, recent] = await Promise.all([
    db.user.count(), db.event.count(), db.vendor.count(), db.item.count(), db.auditLog.count(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { actor: { select: { email: true } } } }),
  ]);
  const stats: [string, number][] = [["Users", users], ["Events", events], ["Vendors", vendors], ["Menu items", items], ["Audit entries", audits]];

  return (
    <main className="wrap" style={{ maxWidth: 980 }}>
      <h1 style={{ fontSize: 25, letterSpacing: "-.02em", margin: "4px 0 2px" }}>Admin overview</h1>
      <p className="muted" style={{ marginTop: 0 }}>Manage users, events, vendors and menus — every change is logged and reversible.</p>

      <div className="statgrid">
        {stats.map(([label, n]) => (
          <div className="statbox" key={label}><div className="statnum tnum">{n.toLocaleString()}</div><div className="statlabel">{label}</div></div>
        ))}
      </div>

      <div className="admincards">
        {CARDS.map(([href, title, desc]) => (
          <a key={href} href={href} className="admincard"><div className="admincard-t">{title}</div><div className="admincard-d">{desc}</div></a>
        ))}
      </div>

      <div className="eyebrow" style={{ marginTop: 20 }}>Recent activity</div>
      <div className="card">
        {recent.length === 0 && <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>No changes logged yet.</div>}
        {recent.map((a) => (
          <div className="auditrow" key={a.id}>
            <span className={`abadge a-${a.action.toLowerCase()}`}>{a.action}</span>
            <div className="grow"><b>{a.entityType}</b> {a.label ? `· ${a.label}` : ""}<div className="v-sub">{a.actor.email}</div></div>
            <span className="muted tnum" style={{ fontSize: 12 }}>{timeAgo(a.createdAt)}</span>
          </div>
        ))}
      </div>
      {recent.length > 0 && <div style={{ marginTop: 10 }}><a href="/admin/audit" className="adminnav-link" style={{ padding: 0 }}>View full audit log →</a></div>}
    </main>
  );
}
