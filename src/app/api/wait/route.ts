import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Worth-the-Wait (§15 #1): crowd wait reports → rolling median → Appearance.currentWaitMin.
async function currentUserId() {
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  const guest = await db.user.upsert({
    where: { email: "webguest@circuiteats.app" },
    update: {},
    create: { email: "webguest@circuiteats.app", displayName: "Web Guest", reviewerScore: 0.5 },
  });
  return guest.id;
}

function median(ns: number[]): number | null {
  if (!ns.length) return null;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

// worth-the-wait index = rating ÷ wait × 10 (higher = better value). 9.0 @ 5min = 18.0; 9.0 @ 34min = 2.6.
export function worthWait(rating: number, waitMin: number | null): number | null {
  if (!waitMin || waitMin <= 0) return null;
  return Math.round((rating / waitMin) * 100) / 10;
}

export async function POST(req: Request) {
  const { appearanceId, waitMin } = await req.json();
  if (!appearanceId || typeof waitMin !== "number" || waitMin < 0 || waitMin > 240) {
    return NextResponse.json({ error: "Provide appearanceId and waitMin (0–240)." }, { status: 400 });
  }
  const userId = await currentUserId();
  await db.waitReport.create({ data: { userId, appearanceId, waitMin } });

  const since = new Date(Date.now() - 30 * 60_000); // 30-min rolling window
  const recent = await db.waitReport.findMany({ where: { appearanceId, createdAt: { gte: since } }, select: { waitMin: true } });
  const cur = median(recent.map((r) => r.waitMin)) ?? waitMin;

  const appearance = await db.appearance.update({
    where: { id: appearanceId },
    data: { currentWaitMin: cur, waitUpdatedAt: new Date() },
    include: { vendor: true },
  });

  return NextResponse.json({ currentWaitMin: cur, worthWait: worthWait(appearance.vendor.ratingAvg, cur), reports: recent.length });
}
