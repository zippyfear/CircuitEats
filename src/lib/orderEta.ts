import { db } from "@/lib/db";

// Order ETA — "tell the user" (SmokeStack principle) applied to food lines.
// ahead   = active orders (PLACED/PREPARING) at this booth queued before ours.
// avgPrep = historical placed→ready minutes for this booth (default 8 if no history).
// etaMin  = prep for your order + a share of the queue ahead of you.
export async function appearanceEta(appearanceId: string, beforeCreatedAt?: Date) {
  const ahead = await db.order.count({
    where: {
      appearanceId,
      status: { in: ["PLACED", "PREPARING"] },
      ...(beforeCreatedAt ? { createdAt: { lt: beforeCreatedAt } } : {}),
    },
  });

  const done = await db.order.findMany({
    where: { appearanceId, readyAt: { not: null } },
    select: { createdAt: true, readyAt: true },
    orderBy: { readyAt: "desc" }, take: 50,
  });
  let avgPrep = 8;
  if (done.length) {
    const mins = done.map((o) => (o.readyAt!.getTime() - o.createdAt.getTime()) / 60000).filter((m) => m > 0 && m < 180);
    if (mins.length) avgPrep = mins.reduce((a, b) => a + b, 0) / mins.length;
  }

  const etaMin = Math.max(2, Math.round(avgPrep + ahead * avgPrep * 0.4));
  return { ahead, etaMin, avgPrep: Math.round(avgPrep) };
}
