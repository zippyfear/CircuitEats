import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

export const MOD_DEFAULTS = { flagHideThreshold: 3, photoBanStrikes: 3, ratingBanStrikes: 5 };

// Admin-tunable thresholds (singleton). Created with defaults on first read.
export async function getModConfig() {
  return db.moderationConfig.upsert({ where: { id: "default" }, update: {}, create: { id: "default", ...MOD_DEFAULTS } });
}

// Run after a flag is recorded. If the photo crossed the (configurable) hide
// threshold, hide it, strike the owner, and escalate to photo-ban / rating-ban.
// actorId = the user whose flag triggered this (for the audit trail).
export async function applyFlagCascade(photoId: string, actorId: string) {
  const cfg = await getModConfig();
  const photo = await db.photo.findUnique({ where: { id: photoId }, select: { id: true, status: true, userId: true, flagCount: true } });
  if (!photo || photo.status !== "VISIBLE" || photo.flagCount < cfg.flagHideThreshold) return { hidden: false };

  await db.photo.update({ where: { id: photoId }, data: { status: "HIDDEN" } });
  await recordAudit({ actorId, action: "UPDATE", entityType: "Photo", entityId: photoId, label: `Auto-hidden (${photo.flagCount} flags)`, before: { status: "VISIBLE" }, after: { status: "HIDDEN" } });

  const owner = await db.user.update({ where: { id: photo.userId }, data: { photoStrikes: { increment: 1 } }, select: { photoStrikes: true, photoBanned: true, ratingBanned: true, email: true } });
  const pen: { photoBanned?: boolean; ratingBanned?: boolean } = {};
  if (owner.photoStrikes >= cfg.photoBanStrikes && !owner.photoBanned) pen.photoBanned = true;
  if (owner.photoStrikes >= cfg.ratingBanStrikes && !owner.ratingBanned) pen.ratingBanned = true;
  if (Object.keys(pen).length) {
    await db.user.update({ where: { id: photo.userId }, data: pen });
    if (pen.photoBanned) await db.photo.updateMany({ where: { userId: photo.userId, status: "VISIBLE" }, data: { status: "HIDDEN" } });
    const parts = [pen.photoBanned ? "photo-ban" : null, pen.ratingBanned ? "rating-ban" : null].filter(Boolean).join(" + ");
    await recordAudit({ actorId, action: "UPDATE", entityType: "User", entityId: photo.userId, label: `Auto ${parts} — ${owner.email} (${owner.photoStrikes} strikes)`, before: { photoBanned: owner.photoBanned, ratingBanned: owner.ratingBanned }, after: { photoBanned: pen.photoBanned ?? owner.photoBanned, ratingBanned: pen.ratingBanned ?? owner.ratingBanned } });
  }
  return { hidden: true, strikes: owner.photoStrikes, ...pen };
}
