import { db } from "@/lib/db";

// Crowd photo-moderation thresholds (tunable).
export const FLAG_HIDE_THRESHOLD = 3;  // distinct users flag a photo → it's hidden
export const PHOTO_BAN_STRIKES = 3;    // hidden-photo strikes → user can't post photos (and theirs are pulled)
export const RATING_BAN_STRIKES = 5;   // strikes → user can't rate at all

// Run after a flag is recorded. If the photo crossed the hide threshold, hide it,
// strike the owner, and escalate to photo-ban / rating-ban as strikes pile up.
export async function applyFlagCascade(photoId: string) {
  const photo = await db.photo.findUnique({ where: { id: photoId }, select: { id: true, status: true, userId: true, flagCount: true } });
  if (!photo || photo.status !== "VISIBLE" || photo.flagCount < FLAG_HIDE_THRESHOLD) return { hidden: false };

  await db.photo.update({ where: { id: photoId }, data: { status: "HIDDEN" } });
  const owner = await db.user.update({ where: { id: photo.userId }, data: { photoStrikes: { increment: 1 } }, select: { photoStrikes: true, photoBanned: true, ratingBanned: true } });

  const pen: { photoBanned?: boolean; ratingBanned?: boolean } = {};
  if (owner.photoStrikes >= PHOTO_BAN_STRIKES && !owner.photoBanned) pen.photoBanned = true;
  if (owner.photoStrikes >= RATING_BAN_STRIKES && !owner.ratingBanned) pen.ratingBanned = true;
  if (Object.keys(pen).length) {
    await db.user.update({ where: { id: photo.userId }, data: pen });
    // "removed from pics": pull their remaining visible photos when photo-banned
    if (pen.photoBanned) await db.photo.updateMany({ where: { userId: photo.userId, status: "VISIBLE" }, data: { status: "HIDDEN" } });
  }
  return { hidden: true, strikes: owner.photoStrikes, ...pen };
}
