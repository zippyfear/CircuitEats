import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";

// Vote on photo quality (+1 / -1). One vote per user per photo (changeable).
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { photoId, value } = await req.json();
  const v = value === 1 ? 1 : value === -1 ? -1 : 0;
  if (!photoId || v === 0) return NextResponse.json({ error: "photoId + value (1 or -1) required." }, { status: 400 });

  const photo = await db.photo.findUnique({ where: { id: photoId }, select: { id: true, status: true } });
  if (!photo || photo.status !== "VISIBLE") return NextResponse.json({ error: "Photo not available." }, { status: 404 });

  await db.photoVote.upsert({
    where: { userId_photoId: { userId: user.id, photoId } },
    update: { value: v },
    create: { userId: user.id, photoId, value: v },
  });
  const agg = await db.photoVote.aggregate({ where: { photoId }, _sum: { value: true } });
  const score = agg._sum.value ?? 0;
  await db.photo.update({ where: { id: photoId }, data: { score } });
  return NextResponse.json({ ok: true, score, myVote: v });
}
