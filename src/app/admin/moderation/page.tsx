import { db } from "@/lib/db";
import { getModConfig } from "@/lib/moderation";
import AdminModeration from "@/components/AdminModeration";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const [config, photosRaw, usersRaw, alertsRaw] = await Promise.all([
    getModConfig(),
    db.photo.findMany({
      where: { OR: [{ flagCount: { gt: 0 } }, { status: { not: "VISIBLE" } }] },
      orderBy: [{ status: "asc" }, { flagCount: "desc" }],
      take: 40,
      include: { user: { select: { email: true } }, vendor: { select: { name: true, slug: true } } },
    }),
    db.user.findMany({
      where: { OR: [{ photoStrikes: { gt: 0 } }, { photoBanned: true }, { ratingBanned: true }] },
      orderBy: { photoStrikes: "desc" },
      take: 40,
      select: { id: true, email: true, photoStrikes: true, photoBanned: true, ratingBanned: true },
    }),
    db.auditLog.findMany({
      where: { entityType: { in: ["Photo", "User", "ModerationConfig"] } },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  return <AdminModeration
    config={config}
    photos={JSON.parse(JSON.stringify(photosRaw))}
    users={usersRaw}
    alerts={JSON.parse(JSON.stringify(alertsRaw))}
  />;
}
