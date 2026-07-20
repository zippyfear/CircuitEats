import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminVendorsPage() {
  const vendors = await db.vendor.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } }, owner: { select: { email: true } } },
  });
  return (
    <main className="wrap" style={{ maxWidth: 980 }}>
      <h1 style={{ fontSize: 23, letterSpacing: "-.02em", margin: "4px 0 2px" }}>Vendors &amp; menus</h1>
      <p className="muted" style={{ marginTop: 0 }}>{vendors.length} vendors. Open a vendor to override its profile, menu items, portions and pricing — the full editor, admin-authorized. Every change is audited.</p>
      <div className="card">
        {vendors.map((v) => (
          <div className="auditrow" key={v.id}>
            <div className="grow">
              <b>{v.name}</b> <span className="muted" style={{ fontSize: 12 }}>· {v._count.items} items · {v.owner ? `owned by ${v.owner.email}` : "unclaimed"}{v.status !== "ACTIVE" ? ` · ${v.status}` : ""}</span>
              <div className="v-sub">/v/{v.slug}</div>
            </div>
            <a className="cta" href={`/v/${v.slug}/edit`} style={{ padding: "7px 14px", fontSize: 13 }}>Edit</a>
            <a className="adminnav-link" href={`/v/${v.slug}`} target="_blank" style={{ fontSize: 12 }}>View ↗</a>
          </div>
        ))}
      </div>
    </main>
  );
}
