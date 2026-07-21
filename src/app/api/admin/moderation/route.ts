import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";

// Admin moderation actions — dispatched by `op`. All audited.
export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const b = await req.json();

  try {
    if (b.op === "config") {
      const clamp = (n: unknown, d: number) => (typeof n === "number" && n >= 1 && n <= 100 ? Math.round(n) : d);
      const before = await db.moderationConfig.findUnique({ where: { id: "default" } });
      const data = { flagHideThreshold: clamp(b.flagHideThreshold, before?.flagHideThreshold ?? 3), photoBanStrikes: clamp(b.photoBanStrikes, before?.photoBanStrikes ?? 3), ratingBanStrikes: clamp(b.ratingBanStrikes, before?.ratingBanStrikes ?? 5) };
      const cfg = await db.moderationConfig.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
      await recordAudit({ actorId: admin.id, action: "UPDATE", entityType: "ModerationConfig", entityId: "default", label: "Thresholds updated", before: before ? { flagHideThreshold: before.flagHideThreshold, photoBanStrikes: before.photoBanStrikes, ratingBanStrikes: before.ratingBanStrikes } : null, after: data });
      return NextResponse.json({ ok: true, config: cfg });
    }

    if (b.op === "photo") {
      const photo = await db.photo.findUnique({ where: { id: String(b.photoId ?? "") }, select: { id: true, status: true, score: true, flagCount: true } });
      if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
      const before = { status: photo.status, score: photo.score, flagCount: photo.flagCount };
      const data: Record<string, unknown> = {};
      if (["VISIBLE", "HIDDEN", "BANNED"].includes(b.status)) data.status = b.status;
      if (typeof b.score === "number") data.score = Math.round(b.score);
      if (b.clearFlags) { await db.photoFlag.deleteMany({ where: { photoId: photo.id } }); data.flagCount = 0; }
      const updated = await db.photo.update({ where: { id: photo.id }, data, select: { status: true, score: true, flagCount: true } });
      await recordAudit({ actorId: admin.id, action: "UPDATE", entityType: "Photo", entityId: photo.id, label: `Admin: photo → ${updated.status}${b.clearFlags ? " (flags cleared)" : ""}`, before, after: updated });
      return NextResponse.json({ ok: true });
    }

    if (b.op === "user") {
      const target = await db.user.findUnique({ where: { id: String(b.userId ?? "") }, select: { id: true, email: true, photoStrikes: true, photoBanned: true, ratingBanned: true } });
      if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
      const before = await snapUserStanding(target.id);
      const data: Record<string, unknown> = {};
      if (typeof b.photoBanned === "boolean") data.photoBanned = b.photoBanned;
      if (typeof b.ratingBanned === "boolean") data.ratingBanned = b.ratingBanned;
      if (typeof b.photoStrikes === "number" && b.photoStrikes >= 0) data.photoStrikes = Math.round(b.photoStrikes);
      // restoring photo posting also un-hides their auto-hidden photos
      if (b.photoBanned === false && b.restorePhotos) await db.photo.updateMany({ where: { userId: target.id, status: "HIDDEN" }, data: { status: "VISIBLE" } });
      await db.user.update({ where: { id: target.id }, data });
      await recordAudit({ actorId: admin.id, action: "UPDATE", entityType: "User", entityId: target.id, label: `Admin standing: ${target.email}`, before, after: await snapUserStanding(target.id) });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown op." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function snapUserStanding(id: string) {
  const u = await db.user.findUnique({ where: { id }, select: { photoStrikes: true, photoBanned: true, ratingBanned: true } });
  return u as Record<string, unknown>;
}
