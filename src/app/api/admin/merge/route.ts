import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";
import { recomputeVendor } from "@/lib/vendorAggregate";

// Merge a duplicate vendor (source) into a canonical one (target): reassign the
// source's reputation + menu + presence to the target, mark the source MERGED,
// and record a fully-reversible VendorMerge audit entry.
export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const { sourceId, targetId } = await req.json();
  if (!sourceId || !targetId || sourceId === targetId) return NextResponse.json({ error: "Pick two different vendors." }, { status: 400 });
  const [source, target] = await Promise.all([
    db.vendor.findUnique({ where: { id: String(sourceId) } }),
    db.vendor.findUnique({ where: { id: String(targetId) } }),
  ]);
  if (!source || !target) return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  if (source.status === "MERGED") return NextResponse.json({ error: "Source is already merged." }, { status: 409 });

  const moved: { ratings: string[]; items: string[]; photos: string[]; votes: string[]; views: string[]; appearances: string[]; follows: string[] } =
    { ratings: [], items: [], photos: [], votes: [], views: [], appearances: [], follows: [] };
  const deletedFollows: { userId: string; eventId: string | null }[] = [];

  await db.$transaction(async (tx) => {
    const move = async (ids: string[], upd: (ids: string[]) => Promise<unknown>) => { if (ids.length) await upd(ids); };

    moved.ratings = (await tx.rating.findMany({ where: { vendorId: source.id }, select: { id: true } })).map((x) => x.id);
    await move(moved.ratings, (ids) => tx.rating.updateMany({ where: { id: { in: ids } }, data: { vendorId: target.id } }));

    moved.items = (await tx.item.findMany({ where: { vendorId: source.id }, select: { id: true } })).map((x) => x.id);
    await move(moved.items, (ids) => tx.item.updateMany({ where: { id: { in: ids } }, data: { vendorId: target.id } }));

    moved.photos = (await tx.photo.findMany({ where: { vendorId: source.id }, select: { id: true } })).map((x) => x.id);
    await move(moved.photos, (ids) => tx.photo.updateMany({ where: { id: { in: ids } }, data: { vendorId: target.id } }));

    moved.votes = (await tx.vote.findMany({ where: { vendorId: source.id }, select: { id: true } })).map((x) => x.id);
    await move(moved.votes, (ids) => tx.vote.updateMany({ where: { id: { in: ids } }, data: { vendorId: target.id } }));

    moved.views = (await tx.vendorView.findMany({ where: { vendorId: source.id }, select: { id: true } })).map((x) => x.id);
    await move(moved.views, (ids) => tx.vendorView.updateMany({ where: { id: { in: ids } }, data: { vendorId: target.id } }));

    // appearances: skip any event the target already works (unique [vendorId, eventId])
    const tgtEvents = new Set((await tx.appearance.findMany({ where: { vendorId: target.id }, select: { eventId: true } })).map((a) => a.eventId));
    const srcApps = await tx.appearance.findMany({ where: { vendorId: source.id }, select: { id: true, eventId: true } });
    moved.appearances = srcApps.filter((a) => !tgtEvents.has(a.eventId)).map((a) => a.id);
    await move(moved.appearances, (ids) => tx.appearance.updateMany({ where: { id: { in: ids } }, data: { vendorId: target.id } }));

    // follows: move non-conflicting; delete duplicates where the user already follows the target
    const tgtFollowers = new Set((await tx.follow.findMany({ where: { vendorId: target.id, targetType: "VENDOR" }, select: { userId: true } })).map((f) => f.userId));
    const srcFollows = await tx.follow.findMany({ where: { vendorId: source.id, targetType: "VENDOR" }, select: { id: true, userId: true, eventId: true } });
    moved.follows = srcFollows.filter((f) => !tgtFollowers.has(f.userId)).map((f) => f.id);
    await move(moved.follows, (ids) => tx.follow.updateMany({ where: { id: { in: ids } }, data: { vendorId: target.id } }));
    for (const f of srcFollows.filter((f) => tgtFollowers.has(f.userId))) { deletedFollows.push({ userId: f.userId, eventId: f.eventId }); await tx.follow.delete({ where: { id: f.id } }); }

    await tx.vendor.update({ where: { id: source.id }, data: { status: "MERGED", mergedIntoId: target.id } });
  });

  await recomputeVendor(source.id);
  await recomputeVendor(target.id);

  await recordAudit({
    actorId: admin.id, action: "UPDATE", entityType: "VendorMerge", entityId: source.id,
    label: `Merge ${source.name} → ${target.name}`,
    before: { sourceId: source.id, targetId: target.id, sourceName: source.name, targetName: target.name, sourcePrevStatus: source.status, sourcePrevMergedIntoId: source.mergedIntoId, moved, deletedFollows },
    after: null,
  });

  return NextResponse.json({ ok: true, target: target.name, source: source.name, moved: { ratings: moved.ratings.length, items: moved.items.length, appearances: moved.appearances.length, follows: moved.follows.length, photos: moved.photos.length } });
}
