import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Rating requires sign-in (viewing is open; write actions are gated).

function weightedAvg(rows: { score: number; weight: number }[]) {
  if (rows.length === 0) return { avg: 0, count: 0 };
  const w = rows.reduce((a, r) => a + r.weight, 0) || rows.length;
  const s = rows.reduce((a, r) => a + r.score * r.weight, 0);
  return { avg: Math.round((s / w) * 10) / 10, count: rows.length };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to rate." }, { status: 401 });
  const userId = session.user.id;
  const { itemId, vendorId, score } = await req.json();
  if (!itemId || !vendorId || typeof score !== "number" || score < 1 || score > 10) {
    return NextResponse.json({ error: "Provide itemId, vendorId, and a score 1–10." }, { status: 400 });
  }

  await db.rating.upsert({
    where: { userId_itemId: { userId, itemId } },
    update: { score, weight: 1.5, verified: true },
    create: { userId, itemId, vendorId, score, weight: 1.5, verified: true, tags: [] },
  });

  const [itemRows, vendorRows] = await Promise.all([
    db.rating.findMany({ where: { itemId }, select: { score: true, weight: true } }),
    db.rating.findMany({ where: { vendorId }, select: { score: true, weight: true } }),
  ]);
  const it = weightedAvg(itemRows);
  const ve = weightedAvg(vendorRows);

  await Promise.all([
    db.item.update({ where: { id: itemId }, data: { ratingAvg: it.avg, ratingCount: it.count } }),
    db.vendor.update({ where: { id: vendorId }, data: { ratingAvg: ve.avg, ratingCount: ve.count } }),
  ]);

  return NextResponse.json({ itemAvg: it.avg, itemCount: it.count, vendorAvg: ve.avg });
}
