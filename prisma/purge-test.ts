// CircuitEats — purge-test.ts
// Removes ALL seeded demo data (isTest=true on Event/Vendor/User and everything
// that hangs off it), leaving only real production data behind. Run at prod
// cutover so the demo circuit never converts to production.
//   npx tsx prisma/purge-test.ts            (dry run — counts only)
//   npx tsx prisma/purge-test.ts --apply    (actually delete)
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const vendors = (await db.vendor.findMany({ where: { isTest: true }, select: { id: true } })).map((v) => v.id);
  const events = (await db.event.findMany({ where: { isTest: true }, select: { id: true } })).map((e) => e.id);
  const users = (await db.user.findMany({ where: { isTest: true }, select: { id: true } })).map((u) => u.id);
  const items = (await db.item.findMany({ where: { vendorId: { in: vendors } }, select: { id: true } })).map((i) => i.id);
  const anyRoot = { OR: [{ vendorId: { in: vendors } }, { eventId: { in: events } }, { userId: { in: users } }] };

  console.log(`Test roots → ${vendors.length} vendors, ${events.length} events, ${users.length} users, ${items.length} items.`);
  if (!APPLY) {
    const [r, o, ph, vo] = await Promise.all([db.rating.count({ where: anyRoot }), db.order.count(), db.photo.count({ where: anyRoot }), db.vote.count({ where: anyRoot })]);
    console.log(`Would delete (dry run): ${r} ratings, ${o} orders, ${ph} photos, ${vo} votes, + appearances/items/memberships/etc. Re-run with --apply to delete.`);
    return;
  }

  // children first (FK order), then joins, then roots
  await db.photoVote.deleteMany({ where: { photo: { OR: [{ vendorId: { in: vendors } }, { userId: { in: users } }] } } });
  await db.photoFlag.deleteMany({ where: { photo: { OR: [{ vendorId: { in: vendors } }, { userId: { in: users } }] } } });
  await db.photo.deleteMany({ where: anyRoot });
  await db.orderItem.deleteMany({ where: { order: { OR: [{ appearance: { OR: [{ vendorId: { in: vendors } }, { eventId: { in: events } }] } }, { userId: { in: users } }] } } });
  await db.order.deleteMany({ where: { OR: [{ appearance: { OR: [{ vendorId: { in: vendors } }, { eventId: { in: events } }] } }, { userId: { in: users } }] } });
  await db.rating.deleteMany({ where: anyRoot });
  await db.vote.deleteMany({ where: anyRoot });
  await db.waitReport.deleteMany({ where: { OR: [{ userId: { in: users } }, { appearance: { OR: [{ vendorId: { in: vendors } }, { eventId: { in: events } }] } }] } });
  await db.checkIn.deleteMany({ where: { OR: [{ userId: { in: users } }, { eventId: { in: events } }] } });
  await db.vendorView.deleteMany({ where: { OR: [{ vendorId: { in: vendors } }, { userId: { in: users } }] } });
  await db.follow.deleteMany({ where: { OR: [{ userId: { in: users } }, { vendorId: { in: vendors } }] } });
  await db.itemVariant.deleteMany({ where: { itemId: { in: items } } });
  await db.appearance.deleteMany({ where: { OR: [{ vendorId: { in: vendors } }, { eventId: { in: events } }] } });
  await db.item.deleteMany({ where: { vendorId: { in: vendors } } });
  await db.posConnection.deleteMany({ where: { vendorId: { in: vendors } } });
  await db.membership.deleteMany({ where: { OR: [{ userId: { in: users } }, { targetId: { in: [...vendors, ...events] } }] } });
  await db.auditLog.deleteMany({ where: { actorId: { in: users } } });
  await db.vendor.deleteMany({ where: { id: { in: vendors } } });
  await db.event.deleteMany({ where: { id: { in: events } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  console.log(`🧹 purged all test data. Remaining: ${await db.vendor.count()} vendors, ${await db.event.count()} events, ${await db.user.count()} users.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
