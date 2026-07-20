import { resolveEventConfig, PLATFORM_DEFAULTS } from "@/lib/config";
import { NextResponse } from "next/server";

// Resolved config for an event (proves the platform-default ← preset ← override chain, §20.6).
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("eventSlug");
  const cfg = slug ? await resolveEventConfig(slug) : PLATFORM_DEFAULTS;
  return NextResponse.json(cfg);
}
