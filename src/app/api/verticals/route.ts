import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// The Circuit family registry — platform + all active verticals with their taglines.
export async function GET() {
  const all = await db.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return NextResponse.json({
    platform: all.find((v) => v.isPlatform) ?? null,
    verticals: all.filter((v) => !v.isPlatform),
  });
}
