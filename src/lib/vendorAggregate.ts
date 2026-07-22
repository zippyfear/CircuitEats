import { db } from "@/lib/db";

// Recompute a vendor's cached global aggregates from its current Rating rows.
// Used after a merge/rollback moves ratings between vendors.
export async function recomputeVendor(vendorId: string) {
  const rows = await db.rating.findMany({ where: { vendorId }, select: { score: true, weight: true } });
  if (!rows.length) { await db.vendor.update({ where: { id: vendorId }, data: { ratingAvg: 0, ratingCount: 0 } }); return; }
  const w = rows.reduce((a, r) => a + r.weight, 0) || rows.length;
  const avg = Math.round((rows.reduce((a, r) => a + r.score * r.weight, 0) / w) * 10) / 10;
  await db.vendor.update({ where: { id: vendorId }, data: { ratingAvg: avg, ratingCount: rows.length } });
}
