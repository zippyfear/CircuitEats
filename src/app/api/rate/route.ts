import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Attribute to the signed-in user; fall back to a shared "web guest" when anonymous.
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

function weightedAvg(rows: { score: number; weight: number }[]) {
  if (rows.length === 0) return { avg: 0, count: 0 };
  const w = rows.reduce((a, r) => a + r.weight, 0) || rows.length;
  const s = rows.reduce((a, r) => a + r.score * r.weight, 0);
  return { avg: Math.round((s / w) * 10) / 10, count: rows.length };
}

export async function POST(req: Request) {
  const { itemId, vendorId, score } = await req.json();
  if (!itemId || !vendorId || typeof score !== "number" || score < 1 || score > 10) {
    return NextResponse.json({ error: "Provide itemId, vendorId, and a score 1–10." }, { status: 400 });
  }
  const userId = await currentUserId();

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
