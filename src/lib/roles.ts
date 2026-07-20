import { db } from "@/lib/db";
import { auth } from "@/auth";

// Auth + role helpers (§20.4 Membership). Enforce ownership on write endpoints.
export async function currentUser() {
  const session = await auth();
  return session?.user?.id ? { id: session.user.id, email: session.user.email ?? "" } : null;
}

export async function isVendorOwner(userId: string, vendorId: string) {
  const vendor = await db.vendor.findUnique({ where: { id: vendorId }, select: { ownerUserId: true } });
  if (vendor?.ownerUserId === userId) return true;
  const m = await db.membership.findFirst({ where: { userId, scope: "VENDOR", targetId: vendorId, role: "OWNER" } });
  return !!m;
}

export async function isEventCoordinator(userId: string, eventId: string) {
  const ev = await db.event.findUnique({ where: { id: eventId }, select: { organizerUserId: true } });
  if (ev?.organizerUserId === userId) return true;
  const m = await db.membership.findFirst({ where: { userId, scope: "EVENT", targetId: eventId, role: "COORDINATOR" } });
  return !!m;
}
