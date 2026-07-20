import { db } from "@/lib/db";
import AdminAudit from "@/components/AdminAudit";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { email: true } } } });
  return <AdminAudit logs={JSON.parse(JSON.stringify(logs))} />;
}
