import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/roles";
import { recordAudit, snapFor } from "@/lib/audit";
import { recomputeVendor } from "@/lib/vendorAggregate";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});

// Restore the `before` snapshot of an audit entry (undo). The rollback itself is
// recorded as a new ROLLBACK entry, and the original entry is marked reverted.
export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { auditId } = await req.json();
  const entry = await db.auditLog.findUnique({ where: { id: String(auditId ?? "") } });
  if (!entry) return NextResponse.json({ error: "Audit entry not found." }, { status: 404 });
  if (entry.reverted) return NextResponse.json({ error: "Already rolled back." }, { status: 409 });
  if (entry.action === "ROLLBACK") return NextResponse.json({ error: "Can't roll back a rollback." }, { status: 400 });

  const { entityType, entityId, action } = entry;
  const before = obj(entry.before);
  const stateBefore = await snapFor(entityType, entityId); // current, for the rollback audit
  let affectedId = entityId;

  try {
    if (entityType === "Item") {
      if (action === "UPDATE") {
        await db.item.update({ where: { id: entityId }, data: { name: String(before.name ?? ""), categoryId: (before.categoryId as string) ?? null, typicalPriceCents: (before.typicalPriceCents as number) ?? null, unit: (before.unit as string) ?? null } });
        await restoreVariants(entityId, before.variants);
      } else if (action === "CREATE") {
        await db.rating.deleteMany({ where: { itemId: entityId } });
        await db.photo.deleteMany({ where: { itemId: entityId } });
        await db.item.delete({ where: { id: entityId } });
      } else if (action === "DELETE") {
        const created = await db.item.create({ data: { vendorId: String(before.vendorId ?? ""), name: String(before.name ?? ""), categoryId: (before.categoryId as string) ?? null, typicalPriceCents: (before.typicalPriceCents as number) ?? null, unit: (before.unit as string) ?? null } });
        await restoreVariants(created.id, before.variants);
        affectedId = created.id;
      }
    } else if (entityType === "Vendor" && action === "UPDATE") {
      await db.vendor.update({ where: { id: entityId }, data: { name: String(before.name ?? ""), bio: (before.bio as string) ?? null, website: (before.website as string) ?? null, homeBase: (before.homeBase as string) ?? null, logoUrl: (before.logoUrl as string) ?? null, customLinks: (before.customLinks ?? undefined) as never, socials: (before.socials ?? undefined) as never, status: (before.status as never) } });
    } else if (entityType === "Event" && action === "UPDATE") {
      const d: Obj = { name: String(before.name ?? ""), venue: (before.venue as string) ?? null, city: (before.city as string) ?? null, region: (before.region as string) ?? null, website: (before.website as string) ?? null, description: (before.description as string) ?? null, status: before.status as never };
      if (before.startDate) d.startDate = new Date(String(before.startDate));
      if (before.endDate) d.endDate = new Date(String(before.endDate));
      await db.event.update({ where: { id: entityId }, data: d });
    } else if (entityType === "User" && action === "UPDATE") {
      await db.user.update({ where: { id: entityId }, data: { displayName: (before.displayName as string) ?? null, reviewerScore: (before.reviewerScore as number) ?? 0.5 } });
    } else if (entityType === "User" && action === "CREATE") {
      await db.user.delete({ where: { id: entityId } });
    } else if (entityType === "Membership") {
      if (action === "CREATE") {
        await db.membership.deleteMany({ where: { id: entityId } });
      } else if (action === "DELETE") {
        const m = await db.membership.create({ data: { userId: String(before.userId ?? ""), scope: before.scope as never, targetId: (before.targetId as string) ?? null, role: before.role as never } });
        affectedId = m.id;
      } else if (action === "UPDATE") {
        await db.membership.update({ where: { id: entityId }, data: { role: before.role as never } });
      }
    } else if (entityType === "VendorMerge") {
      // undo a merge: move the reassigned rows back to the source, recreate the
      // duplicate follows that were deleted, and restore the source's status.
      const m = obj(before.moved);
      const ids = (k: string) => (Array.isArray(m[k]) ? (m[k] as string[]) : []);
      const srcId = String(before.sourceId ?? entityId);
      const tgtId = String(before.targetId ?? "");
      await db.$transaction(async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const back = (rel: any, list: string[]) => (list.length ? rel.updateMany({ where: { id: { in: list } }, data: { vendorId: srcId } }) : Promise.resolve());
        await back(tx.rating, ids("ratings"));
        await back(tx.item, ids("items"));
        await back(tx.photo, ids("photos"));
        await back(tx.vote, ids("votes"));
        await back(tx.vendorView, ids("views"));
        await back(tx.appearance, ids("appearances"));
        await back(tx.follow, ids("follows"));
        const df = Array.isArray(before.deletedFollows) ? (before.deletedFollows as Obj[]) : [];
        for (const f of df) await tx.follow.create({ data: { userId: String(f.userId), targetType: "VENDOR", vendorId: srcId, eventId: (f.eventId as string) ?? null } });
        await tx.vendor.update({ where: { id: srcId }, data: { status: (before.sourcePrevStatus as never) ?? "ACTIVE", mergedIntoId: (before.sourcePrevMergedIntoId as string) ?? null } });
      });
      await recomputeVendor(srcId);
      if (tgtId) await recomputeVendor(tgtId);
      affectedId = srcId;
    } else {
      return NextResponse.json({ error: `Rollback not supported for ${entityType} ${action}.` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: `Rollback failed: ${(e as Error).message}` }, { status: 500 });
  }

  const stateAfter = await snapFor(entityType, affectedId);
  await recordAudit({ actorId: admin.id, action: "ROLLBACK", entityType, entityId: affectedId, label: `Rollback: ${entry.label ?? entry.action}`, before: stateBefore, after: stateAfter });
  await db.auditLog.update({ where: { id: entry.id }, data: { reverted: true, revertedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

async function restoreVariants(itemId: string, snap: unknown) {
  if (!Array.isArray(snap)) return;
  await db.itemVariant.deleteMany({ where: { itemId } });
  if (snap.length) await db.itemVariant.createMany({ data: snap.map((v: Obj, i: number) => ({ itemId, label: String(v.label ?? ""), priceCents: Number(v.priceCents ?? 0), note: (v.note as string) ?? null, qty: (v.qty as number) ?? null, sortOrder: Number(v.sortOrder ?? i) })) });
}
