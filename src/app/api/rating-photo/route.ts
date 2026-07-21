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

  const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "").slice(0, 4);
  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  const url = `/api/file/${name}`;

  await db.photo.create({ data: { userId: user.id, url, vendorId, itemId } });
  return NextResponse.json({ ok: true, url });
}
