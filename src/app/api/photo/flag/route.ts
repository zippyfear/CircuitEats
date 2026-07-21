import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";
import { applyFlagCascade } from "@/lib/moderation";

// Flag a photo as inappropriate. Distinct flags accumulate; enough → the photo is
// hidden and its owner takes a strike (see lib/moderation cascade).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { photoId, reason } = await req.json();
  if (!photoId) return NextResponse.json({ error: "photoId required." }, { status: 400 });

  const photo = await db.photo.findUnique({ where: { id: photoId }, select: { id: true, status: true } });
  if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  const existing = await db.photoFlag.findUnique({ where: { userId_photoId: { userId: user.id, photoId } } });
  if (!existing) {
    await db.photoFlag.create({ data: { userId: user.id, photoId, reason: reason ? String(reason).slice(0, 200) : null } });
    const count = await db.photoFlag.count({ where: { photoId } });
    await db.photo.update({ where: { id: photoId }, data: { flagCount: count } });
    await applyFlagCascade(photoId);
  }
  return NextResponse.json({ ok: true });
}
