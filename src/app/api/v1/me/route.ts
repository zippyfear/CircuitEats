import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { currentUser } from "@/lib/roles";
import { unreadNotifCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/v1/me — the signed-in user's profile + follow count + unread notifications. 401 if anon.
export async function GET() {
  const me = await currentUser();
  if (!me) return fail(401, "unauthenticated", "Sign in required");

  const u = await db.user.findUnique({ where: { id: me.id }, select: { id: true, email: true, displayName: true, ratingMode: true } });
  if (!u) return fail(404, "not_found", "User not found");

  const [followCount, unread] = await Promise.all([
    db.follow.count({ where: { userId: me.id, targetType: "VENDOR", vendorId: { not: null } } }),
    unreadNotifCount(me.id),
  ]);

  return ok({ id: u.id, email: u.email, displayName: u.displayName, ratingMode: u.ratingMode, followCount, unreadNotifications: unread });
}
