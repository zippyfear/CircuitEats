import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type Snap = Record<string, unknown> | null;
type Action = "CREATE" | "UPDATE" | "DELETE" | "ROLLBACK";

// Write one audit entry. No-op UPDATEs (before deep-equals after) are skipped.
export async function recordAudit(a: {
  actorId: string; action: Action; entityType: string; entityId: string;
  label?: string | null; before?: Snap; after?: Snap;
}) {
  if (a.action === "UPDATE" && a.before && a.after && JSON.stringify(a.before) === JSON.stringify(a.after)) return null;
  return db.auditLog.create({
    data: {
      actorId: a.actorId, action: a.action, entityType: a.entityType, entityId: a.entityId,
      label: a.label ?? null,
      before: (a.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (a.after ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

// ── snapshots: the editable/restorable fields per entity (before/after + rollback) ──
export async function snapVendor(id: string): Promise<Snap> {
  const v = await db.vendor.findUnique({ where: { id }, select: { name: true, bio: true, website: true, homeBase: true, logoUrl: true, customLinks: true, socials: true, status: true } });
  return v as Snap;
}
export async function snapEvent(id: string): Promise<Snap> {
  const e = await db.event.findUnique({ where: { id }, select: { name: true, venue: true, city: true, region: true, website: true, description: true, status: true, startDate: true, endDate: true } });
  return e ? { ...e, startDate: e.startDate.toISOString(), endDate: e.endDate.toISOString() } : null;
}
export async function snapUser(id: string): Promise<Snap> {
  const u = await db.user.findUnique({ where: { id }, select: { displayName: true, reviewerScore: true, email: true } });
  return u as Snap;
}
export async function snapItem(id: string): Promise<Snap> {
  const it = await db.item.findUnique({
    where: { id },
    select: { name: true, categoryId: true, typicalPriceCents: true, unit: true, vendorId: true, variants: { orderBy: { sortOrder: "asc" }, select: { label: true, priceCents: true, note: true, qty: true, sortOrder: true } } },
  });
  return it as Snap;
}

export function snapFor(entityType: string, id: string): Promise<Snap> {
  switch (entityType) {
    case "Vendor": return snapVendor(id);
    case "Event": return snapEvent(id);
    case "User": return snapUser(id);
    case "Item": return snapItem(id);
    default: return Promise.resolve(null);
  }
}
