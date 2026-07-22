import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/roles";
import AdminMerge from "@/components/AdminMerge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Merge vendors" };

export default async function AdminMergePage() {
  const admin = await currentAdmin();
  if (!admin) redirect("/");

  const rows = await db.vendor.findMany({ include: { _count: { select: { appearances: true } } }, orderBy: { name: "asc" } });
  const vendors = rows.map((v) => ({ id: v.id, name: v.name, slug: v.slug, status: v.status, ratingCount: v.ratingCount, events: v._count.appearances }));

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <a className="back" href="/admin">‹ Admin</a>
      <h1 style={{ fontSize: 24, letterSpacing: "-.02em", margin: "4px 0 2px" }}>Merge duplicate vendors</h1>
      <p className="muted" style={{ marginTop: 0 }}>Fold a duplicate vendor into the canonical one so reputation isn&apos;t fragmented across the graph.</p>
      <AdminMerge vendors={vendors} />
    </main>
  );
}
