import { db } from "@/lib/db";
import AdminEvents from "@/components/AdminEvents";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const events = await db.event.findMany({ orderBy: { startDate: "desc" }, include: { _count: { select: { appearances: true } } } });
  return <AdminEvents events={JSON.parse(JSON.stringify(events))} />;
}
