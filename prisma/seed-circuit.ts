// CircuitEats — seed-circuit.ts
// DEEP multi-event demo graph built on REAL vendors + REAL festivals (researched
// 2026-07). Touring vendors appear at many events so cross-event reputation is
// real: a vendor's global rating aggregates all events, per-event scopes differ.
// EVERYTHING it touches is flagged isTest=true so it shows in demo but is purged
// before prod (see prisma/purge-test.ts). Runs after seed.ts + seed-extras.ts.
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const D = (s: string) => new Date(s);

// ── real festivals (the circuit) ──
const EVENTS: { slug: string; name: string; city: string; region: string; venue: string; lat: number; lng: number; start: string; end: string; type: string; web?: string; desc?: string }[] = [
  { slug: "naperville-ribfest-2026", name: "Naperville Ribfest 2026", city: "Naperville", region: "IL", venue: "Knoch Park, Naperville, IL", lat: 41.7508, lng: -88.1535, start: "2026-07-03", end: "2026-07-05", type: "rib" },
  { slug: "ribfest-chicago-2026", name: "Ribfest Chicago 2026", city: "Chicago", region: "IL", venue: "Chicago, IL (North Center)", lat: 41.9484, lng: -87.6553, start: "2026-06-05", end: "2026-06-07", type: "rib" },
  { slug: "happy-harrys-ribfest-2026", name: "Happy Harry's Ribfest 2026", city: "West Fargo", region: "ND", venue: "Red River Valley Fairgrounds, West Fargo, ND", lat: 46.8747, lng: -96.9003, start: "2026-08-13", end: "2026-08-16", type: "rib" },
  { slug: "columbus-jazz-rib-2026", name: "Columbus Jazz & Rib Fest 2026", city: "Columbus", region: "OH", venue: "West Bank & Bicentennial Park, Scioto Mile, Columbus, OH", lat: 39.9556, lng: -83.0033, start: "2026-07-24", end: "2026-07-26", type: "rib",
    web: "https://www.hotribscooljazz.org/",
    desc: "A FREE summertime tradition on the downtown riverfront — the finest in live jazz across multiple stages, paired with award-winning pitmasters serving smoky BBQ. Presented by Columbus Recreation & Parks. Fri–Sat 11am–10pm, Sun 11am–8pm." },
  { slug: "best-in-the-west-nugget-2026", name: "Best in the West Nugget Rib Cook-off 2026", city: "Sparks", region: "NV", venue: "Nugget Casino Resort, Sparks, NV", lat: 39.5349, lng: -119.7527, start: "2026-08-26", end: "2026-09-07", type: "rib" },
  { slug: "brushy-creek-bbq-2026", name: "Brushy Creek Backyard BBQ Cook-Off 2026", city: "Round Rock", region: "TX", venue: "Brushy Creek Community Center Park, Round Rock, TX", lat: 30.5083, lng: -97.6789, start: "2026-05-02", end: "2026-05-02", type: "rib" },
  { slug: "sweetwater-rattlesnake-2026", name: "Sweetwater Rattlesnake Roundup 2026", city: "Sweetwater", region: "TX", venue: "Nolan County Coliseum, Sweetwater, TX", lat: 32.4709, lng: -100.4059, start: "2026-03-13", end: "2026-03-15", type: "chili" },
  { slug: "pflugerville-chili-pfest-2026", name: "Pflugerville Pfall Chili Pfest 2026", city: "Pflugerville", region: "TX", venue: "Downtown Pflugerville, TX", lat: 30.4394, lng: -97.6200, start: "2026-10-17", end: "2026-10-17", type: "chili" },
];

// ── new REAL touring vendors + chili teams (existing 6 are added via APPEARANCES) ──
const NEW_VENDORS = [
  { slug: "texas-outlaw-bbq", name: "Texas Outlaw BBQ", home: "Elizabethtown, KY", base: 9.1, items: [["Championship Ribs", "Ribs", 1700, "rib"], ["Sliced Brisket", "Brisket", 1900, null]] },
  { slug: "desperados-bbq", name: "Desperado's BBQ", home: "Hinckley, OH", base: 8.6, items: [["Baby Back Ribs", "Ribs", 1600, "rib"], ["Pulled Pork", "Pulled Pork", 1000, null]] },
  { slug: "pigfoot-bbq", name: "Pigfoot BBQ", home: "Chicago, IL", base: 8.9, items: [["Award-Winning Ribs", "Ribs", 1800, "rib"], ["Burnt Ends", "Burnt Ends", 1400, null]] },
  { slug: "porky-chicks-bbq", name: "Porky Chicks BBQ", home: "Buffalo, NY", base: 8.7, items: [["Competition Ribs", "Ribs", 1700, "rib"], ["Smoked Chicken", "Chicken", 1200, null]] },
  { slug: "lone-star-chili-co", name: "Lone Star Chili Co.", home: "San Antonio, TX", base: 8.8, items: [["Championship Chili", "Chili", 800, null], ["Green Chile Stew", "Chili", 900, null]] },
  { slug: "five-alarm-chili", name: "Five Alarm Chili Co.", home: "Terlingua, TX", base: 8.3, items: [["Terlingua Red", "Chili", 800, null], ["Brisket Chili", "Chili", 1000, null]] },
  // ── Columbus Jazz & Rib Fest 2026 — real lineup (hotribscooljazz.org/food-vendors) ──
  { slug: "armadillos-bbq", name: "Armadillo's BBQ", home: "Touring nationwide", base: 8.4, items: [["St. Louis Ribs", "Ribs", 1600, "rib"], ["Smoked Chicken", "Chicken", 1200, null]] },
  { slug: "austins-texas-lightning", name: "Austin's Texas Lightning", home: "Austin, TX", base: 8.5, items: [["Texas Lightning Ribs", "Ribs", 1700, "rib"], ["Brisket", "Brisket", 1800, null]] },
  { slug: "carolina-rib-king", name: "Carolina Rib King", home: "South Carolina", base: 8.6, items: [["Carolina Ribs", "Ribs", 1600, "rib"], ["Pulled Pork", "Pulled Pork", 1100, null]] },
  { slug: "chicago-bbq-company", name: "Chicago BBQ Company", home: "Chicago, IL", base: 8.2, items: [["Chicago-Style Ribs", "Ribs", 1600, "rib"]] },
  { slug: "mojos-famous-bbq", name: "Mojo's Famous BBQ", home: "Touring since 2001", base: 8.7, items: [["Famous Ribs", "Ribs", 1700, "rib"], ["Burnt Ends", "Burnt Ends", 1400, null]] },
  { slug: "buck-em-bbq", name: "Buck 'Em BBQ", home: "Touring nationwide", base: 8.3, items: [["Competition Ribs", "Ribs", 1600, "rib"]] },
  { slug: "off-the-bone-bbq", name: "Off The Bone BBQ", home: "Touring nationwide", base: 8.5, items: [["Fall-Off-The-Bone Ribs", "Ribs", 1700, "rib"], ["Secret Sauce Sampler", "Sauce", 900, null]] },
  { slug: "belly-out-bbq", name: "Belly Out BBQ", home: "Columbus, OH", base: 8.8, items: [["Award Brisket", "Brisket", 1900, null], ["Pork Belly Bites", "Pulled Pork", 1300, null]] },
  { slug: "taestys", name: "Taesty's", home: "Columbus, OH", base: 8.1, items: [["Fried Chicken & Mac", "Chicken", 1300, null]] },
  { slug: "juniors-sweetpotato-pie", name: "Junior's Sweetpotato Pie", home: "Columbus, OH", base: 9.0, items: [["Sweet Potato Pie", "Dessert", 600, null]] },
] as const;

// vendorSlug → [ [eventSlug, ratingDelta] ]  (touring vendors span many events)
const APPEARANCES: Record<string, [string, number][]> = {
  "cowboys-bbq": [["naperville-ribfest-2026", 0.2], ["brushy-creek-bbq-2026", 0.1], ["sweetwater-rattlesnake-2026", 0.1], ["pflugerville-chili-pfest-2026", -0.2], ["columbus-jazz-rib-2026", 0.2]],
  "aussom-aussie": [["naperville-ribfest-2026", 0.3], ["ribfest-chicago-2026", 0.4], ["happy-harrys-ribfest-2026", 0.2]],
  "big-show-bbq": [["columbus-jazz-rib-2026", 0.1], ["best-in-the-west-nugget-2026", -0.1]],
  "bbq-king-smokehouse": [["columbus-jazz-rib-2026", 0.2], ["naperville-ribfest-2026", 0.1]],
  "smoke-barrel": [["happy-harrys-ribfest-2026", 0.1]],
  "franklin-road-smoke": [["naperville-ribfest-2026", 0.0]],
  "texas-outlaw-bbq": [["best-in-the-west-nugget-2026", 0.3], ["columbus-jazz-rib-2026", 0.2], ["ribfest-chicago-2026", 0.1]],
  "desperados-bbq": [["best-in-the-west-nugget-2026", 0.1], ["columbus-jazz-rib-2026", 0.0]],
  "pigfoot-bbq": [["naperville-ribfest-2026", 0.3], ["ribfest-chicago-2026", 0.2], ["happy-harrys-ribfest-2026", 0.1], ["columbus-jazz-rib-2026", 0.3]],
  // Columbus lineup (real): traveling teams get a 2nd stop for graph density
  "armadillos-bbq": [["columbus-jazz-rib-2026", 0.1], ["happy-harrys-ribfest-2026", 0.0]],
  "austins-texas-lightning": [["columbus-jazz-rib-2026", 0.1], ["best-in-the-west-nugget-2026", 0.2]],
  "carolina-rib-king": [["columbus-jazz-rib-2026", 0.2]],
  "chicago-bbq-company": [["columbus-jazz-rib-2026", 0.0], ["ribfest-chicago-2026", 0.3]],
  "mojos-famous-bbq": [["columbus-jazz-rib-2026", 0.2]],
  "buck-em-bbq": [["columbus-jazz-rib-2026", 0.1]],
  "off-the-bone-bbq": [["columbus-jazz-rib-2026", 0.1]],
  "belly-out-bbq": [["columbus-jazz-rib-2026", 0.3]],
  "taestys": [["columbus-jazz-rib-2026", 0.0]],
  "juniors-sweetpotato-pie": [["columbus-jazz-rib-2026", 0.2]],
  "porky-chicks-bbq": [["happy-harrys-ribfest-2026", 0.2], ["columbus-jazz-rib-2026", 0.1]],
  "lone-star-chili-co": [["pflugerville-chili-pfest-2026", 0.3], ["sweetwater-rattlesnake-2026", 0.2]],
  "five-alarm-chili": [["sweetwater-rattlesnake-2026", 0.4], ["pflugerville-chili-pfest-2026", 0.1]],
};

const clamp = (n: number) => Math.max(1, Math.min(10, n));
const wavg = (rows: { score: number; weight: number }[]) => { if (!rows.length) return { avg: 0, count: 0 }; const w = rows.reduce((a, r) => a + r.weight, 0) || rows.length; return { avg: Math.round((rows.reduce((a, r) => a + r.score * r.weight, 0) / w) * 10) / 10, count: rows.length }; };

async function main() {
  // categories: ensure Chili exists
  for (const name of ["Chili"]) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await db.category.upsert({ where: { name }, update: {}, create: { name, slug, sortOrder: 16 } });
  }
  const cats = new Map((await db.category.findMany()).map((c) => [c.name, c.id]));

  // CHILI EventType preset
  const chili = await db.eventType.upsert({
    where: { key: "CHILI" }, update: {},
    create: { key: "CHILI", name: "Chili Fest", vocab: { container: "Chili Fest", containerPlural: "Chili Fests", participant: "Team", participantPlural: "Teams", offering: "Chili", offeringPlural: "Chilis" }, features: { rating: true, voting: true, ordering: false, waitTimes: false, schedule: true }, theme: { accent: "#C6403B" } },
  });
  const festival = await db.eventType.findUnique({ where: { key: "FESTIVAL" } });

  // events
  const eventBy = new Map<string, string>();
  for (const e of EVENTS) {
    const isChili = e.type === "chili";
    const row = await db.event.upsert({
      where: { slug: e.slug }, update: { isTest: true },
      create: { name: e.name, slug: e.slug, venue: e.venue, city: e.city, region: e.region, lat: e.lat, lng: e.lng, geoRadiusM: 800, startDate: D(e.start), endDate: D(e.end), website: e.web ?? null, description: e.desc ?? null, status: "ACTIVE", official: false, containerKind: "EVENT", eventTypeId: (isChili ? chili.id : festival?.id), config: { features: { ordering: false, voting: isChili } }, isTest: true },
    });
    eventBy.set(e.slug, row.id);
  }

  // new vendors + items (+ rib variants)
  for (const v of NEW_VENDORS) {
    const vendor = await db.vendor.upsert({ where: { slug: v.slug }, update: { isTest: true }, create: { name: v.name, slug: v.slug, homeBase: v.home, status: "ACTIVE", ratingAvg: v.base, ratingCount: 0, isTest: true } });
    for (const [name, category, price, unit] of v.items) {
      const existing = await db.item.findFirst({ where: { vendorId: vendor.id, name } });
      const item = existing ?? await db.item.create({ data: { vendorId: vendor.id, name, categoryId: cats.get(category) ?? cats.get("Other")!, typicalPriceCents: price, unit: unit as string | null } });
      if (unit === "rib" && !(await db.itemVariant.findFirst({ where: { itemId: item.id } }))) {
        await db.itemVariant.createMany({ data: [{ itemId: item.id, label: "Half rack", priceCents: price, qty: 6, sortOrder: 0 }, { itemId: item.id, label: "Full rack", priceCents: price + 1200, qty: 12, sortOrder: 1 }] });
      }
    }
  }

  // diner pool (24 test users) for per-event ratings (respects @@unique[userId,itemId])
  const diners: string[] = [];
  for (let i = 1; i <= 24; i++) { const u = await db.user.upsert({ where: { email: `diner${i}@ce.app` }, update: { isTest: true }, create: { email: `diner${i}@ce.app`, displayName: `Diner ${i}`, reviewerScore: 0.5 + (i % 5) * 0.1, isTest: true } }); diners.push(u.id); }

  // appearances + per-event ratings + chili votes
  const touchedVendors = new Set<string>();
  const touchedItems = new Set<string>();
  for (const [vslug, apps] of Object.entries(APPEARANCES)) {
    const vendor = await db.vendor.findUnique({ where: { slug: vslug }, include: { items: true } });
    if (!vendor) continue;
    touchedVendors.add(vendor.id);
    const vbase = (NEW_VENDORS.find((n) => n.slug === vslug)?.base) ?? vendor.ratingAvg;
    const primary = vendor.items[0]; // rate the signature item
    if (!primary) continue;
    touchedItems.add(primary.id);
    let dc = (vslug.length * 7) % diners.length; // deterministic starting cursor per vendor
    for (const [eslug, delta] of apps) {
      const eventId = eventBy.get(eslug); if (!eventId) continue;
      await db.appearance.upsert({ where: { vendorId_eventId: { vendorId: vendor.id, eventId } }, update: {}, create: { vendorId: vendor.id, eventId, qrSlug: `${vslug}-${eslug}`, boothLabel: "Booth" } });
      const target = vbase + delta;
      for (const s of [clamp(Math.round(target)), clamp(Math.round(target) + 1), clamp(Math.round(target) - 1)]) {
        const userId = diners[dc % diners.length]; dc++;
        await db.rating.upsert({ where: { userId_itemId: { userId, itemId: primary.id } }, update: {}, create: { userId, vendorId: vendor.id, itemId: primary.id, eventId, score: s, verified: true, weight: 1.5, presence: "QR", tags: s >= 8 ? ["worth-the-wait"] : s <= 5 ? ["skip"] : [] } });
      }
      // People's Choice votes at chili fests
      const ev = EVENTS.find((e) => e.slug === eslug);
      if (ev?.type === "chili" && primary.categoryId) {
        for (let k = 0; k < 3; k++) { const userId = diners[(dc + k) % diners.length]; await db.vote.upsert({ where: { userId_eventId_categoryId: { userId, eventId, categoryId: primary.categoryId } }, update: { vendorId: vendor.id }, create: { userId, eventId, categoryId: primary.categoryId, vendorId: vendor.id } }); }
      }
    }
  }

  // recompute aggregates for touched vendors + items (global = across all events)
  for (const itemId of touchedItems) { const rows = await db.rating.findMany({ where: { itemId }, select: { score: true, weight: true } }); const a = wavg(rows); await db.item.update({ where: { id: itemId }, data: { ratingAvg: a.avg, ratingCount: a.count } }); }
  for (const vendorId of touchedVendors) { const rows = await db.rating.findMany({ where: { vendorId }, select: { score: true, weight: true } }); const a = wavg(rows); await db.vendor.update({ where: { id: vendorId }, data: { ratingAvg: a.avg, ratingCount: a.count } }); }

  // belt-and-suspenders: flag ALL seeded roots as test (dev DB is all synthetic)
  await db.event.updateMany({ data: { isTest: true } });
  await db.vendor.updateMany({ data: { isTest: true } });
  await db.user.updateMany({ data: { isTest: true } });

  const [ev, ve, ra] = await Promise.all([db.event.count(), db.vendor.count(), db.rating.count()]);
  console.log(`✅ seed-circuit: ${EVENTS.length} real events + ${NEW_VENDORS.length} vendors added → ${ev} events, ${ve} vendors, ${ra} ratings. All flagged isTest.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
