import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

// Serve dev-local uploaded files (runtime-added public files aren't served by `next start`).
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return new NextResponse("bad request", { status: 400 });
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "uploads", name));
    const ext = name.split(".").pop()?.toLowerCase();
    const type = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "application/octet-stream";
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}
