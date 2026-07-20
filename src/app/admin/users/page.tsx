import { db } from "@/lib/db";
import AdminUsers from "@/components/AdminUsers";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, events, vendors] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" }, include: { memberships: true, _count: { select: { ratings: true } } } }),
    db.event.findMany({ select: { id: true, name: true }, orderBy: { startDate: "desc" } }),
    db.vendor.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return <AdminUsers users={JSON.parse(JSON.stringify(users))} events={events} vendors={vendors} />;
}
