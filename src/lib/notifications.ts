import { db } from "@/lib/db";

// In-app notifications (no email/push). A "notification" = a vendor you follow is
// appearing at an upcoming event. Computed on the fly from follows + appearances;
// unread state is tracked by User.notifsSeenAt (cleared when the feed is viewed).

export async function followedUpcoming(userId: string) {
  const follows = await db.follow.findMany({
    where: { userId, targetType: "VENDOR", vendorId: { not: null } },
    select: { vendorId: true },
  });
  const vendorIds = follows.map((f) => f.vendorId!).filter(Boolean);
  if (!vendorIds.length) return [];
  const now = new Date();
  return db.appearance.findMany({
    where: { vendorId: { in: vendorIds }, event: { status: "ACTIVE", endDate: { gte: now } } },
    include: { vendor: true, event: true },
    orderBy: { event: { startDate: "asc" } },
  });
}

export async function unreadNotifCount(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { notifsSeenAt: true } });
  const since = u?.notifsSeenAt ?? new Date(0);
  const apps = await followedUpcoming(userId);
  return apps.filter((a) => a.createdAt > since).length;
}

export async function markNotifsSeen(userId: string) {
  await db.user.update({ where: { id: userId }, data: { notifsSeenAt: new Date() } });
}
