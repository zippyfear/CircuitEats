import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Liveness/readiness probe: confirms the app is up and the DB is reachable.
// 200 = healthy, 503 = degraded. Used by monitoring + the deploy smoke gate.
export async function GET() {
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up", ms: Date.now() - started, time: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ status: "error", db: "down", error: (e as Error).message, time: new Date().toISOString() }, { status: 503 });
  }
}
