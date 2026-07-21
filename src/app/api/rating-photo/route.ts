import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/roles";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Any signed-in rater can attach a photo to their review (distinct from the
// owner-only logo/gallery upload). Stores dev-local + a Photo record.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const vendorId = form.get("vendorId") as string | null;
  const itemId = (form.get("itemId") as string) || null;
  if (!file || !vendorId) return NextResponse.json({ error: "file + vendorId required." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Images only." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Max 5MB." }, { status: 400 });

  // moderation gates: banned users can't post; one photo per vendor per day
  const u = await db.user.findUnique({ where: { id: user.id }, select: { photoBanned: true, ratingBanned: true } });
  if (u?.photoBanned || u?.ratingBanned) return NextResponse.json({ error: "Photo posting is disabled on your account." }, { status: 403 });
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const todayCount = await db.photo.count({ where: { userId: user.id, vendorId, createdAt: { gte: dayStart } } });
  if (todayCount >= 1) return NextResponse.json({ error: "You can add one photo per vendor per day." }, { status: 429 });

  const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "").slice(0, 4);
  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  const url = `/api/file/${name}`;

  await db.photo.create({ data: { userId: user.id, url, vendorId, itemId } });
  return NextResponse.json({ ok: true, url });
}
