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
  { slug: "german-fest-milwaukee-2026", name: "German Fest Milwaukee 2026", city: "Milwaukee", region: "WI", venue: "Henry Maier Festival Park, Milwaukee, WI", lat: 43.0285, lng: -87.8977, start: "2026-07-24", end: "2026-07-26", type: "german",
    web: "https://germanfest.com/",
    desc: "One of the largest German festivals in North America — a Milwaukee lakefront tradition since 1981. Authentic German food (brats, pretzels, schnitzel, strudel), German beer, live bands, the Dachshund Derby and more across 75 acres of Henry Maier Festival Park." },
  // ── SE Wisconsin + Chicago cluster ──
  { slug: "festa-italiana-2026", name: "Festa Italiana 2026", city: "Milwaukee", region: "WI", venue: "Henry Maier Festival Park, Milwaukee, WI", lat: 43.0285, lng: -87.8977, start: "2026-07-09", end: "2026-07-11", type: "italian",
    desc: "Milwaukee's celebration of all things Italian on the lakefront — pasta, pizza, cannoli, live music and the famous Sunday fireworks." },
  { slug: "milwaukee-irish-fest-2026", name: "Milwaukee Irish Fest 2026", city: "Milwaukee", region: "WI", venue: "Henry Maier Festival Park, Milwaukee, WI", lat: 43.0285, lng: -87.8977, start: "2026-08-13", end: "2026-08-16", type: "irish",
    desc: "The world's largest celebration of Irish music and culture — four days on Milwaukee's lakefront with Irish food, music on multiple stages, dance and sports." },
  { slug: "wisconsin-state-fair-2026", name: "Wisconsin State Fair 2026", city: "West Allis", region: "WI", venue: "Wisconsin State Fair Park, West Allis, WI", lat: 43.0195, lng: -88.0126, start: "2026-08-06", end: "2026-08-16", type: "fair",
    desc: "Eleven days of food, fun and tradition — the legendary cream puffs, cheese curds, corn dogs, livestock shows, rides and entertainment at State Fair Park." },
  { slug: "taste-of-chicago-2026", name: "Taste of Chicago 2026", city: "Chicago", region: "IL", venue: "Grant Park, Chicago, IL", lat: 41.8763, lng: -87.6191, start: "2026-07-08", end: "2026-07-12", type: "food",
    desc: "The iconic FREE food festival in Grant Park — 80+ local food vendors, Chef's Stage demos, SummerDance and headline music across five days." },
  { slug: "windy-city-smokeout-2026", name: "Windy City Smokeout 2026", city: "Chicago", region: "IL", venue: "United Center grounds, Chicago, IL", lat: 41.8807, lng: -87.6742, start: "2026-07-08", end: "2026-07-12", type: "rib",
    desc: "The nation's premier outdoor country-music + BBQ festival — barbecue pros from across the country serving ribs, brisket and smoked meats outside the United Center." },
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
  // ── German Fest Milwaukee 2026 — generic demo vendors (site publishes no roster; do NOT name real businesses) ──
  { slug: "brat-haus-mke", name: "Brat Haus MKE", home: "Milwaukee, WI", base: 8.6, items: [["Bratwurst mit Kraut", "Sausage", 900, null], ["Currywurst", "Sausage", 1000, null]] },
  { slug: "bavarian-pretzel-haus", name: "Bavarian Pretzel Haus", home: "Milwaukee, WI", base: 8.9, items: [["Giant Bavarian Pretzel", "Pretzels", 800, null], ["Pretzel mit Obatzda", "Pretzels", 1100, null]] },
  { slug: "schnitzel-wagen", name: "Schnitzel Wagen", home: "Madison, WI", base: 8.4, items: [["Pork Schnitzel Plate", "Schnitzel", 1400, null], ["Jägerschnitzel", "Schnitzel", 1600, null]] },
  { slug: "schwarzwald-strudel", name: "Schwarzwald Strudel Co.", home: "Milwaukee, WI", base: 8.7, items: [["Apple Strudel", "Dessert", 700, null], ["Black Forest Cake", "Dessert", 800, null]] },
  // ── Festa Italiana / Irish Fest / State Fair / Taste of Chicago — generic demo vendors (no public rosters; no real businesses named) ──
  { slug: "nonnas-pasta-wagon", name: "Nonna's Pasta Wagon", home: "Milwaukee, WI", base: 8.8, items: [["Cavatelli al Forno", "Pasta", 1200, null], ["Chicken Parm", "Chicken", 1400, null]] },
  { slug: "lakefront-pizza-oven", name: "Lakefront Pizza Oven", home: "Milwaukee, WI", base: 8.5, items: [["Wood-Fired Margherita", "Pizza", 1300, null], ["Sicilian Slice", "Pizza", 600, null]] },
  { slug: "mke-cannoli-co", name: "MKE Cannoli Co.", home: "Milwaukee, WI", base: 9.0, items: [["Classic Cannoli", "Dessert", 500, null], ["Tiramisu Cup", "Dessert", 700, null]] },
  { slug: "galway-fish-chips", name: "Galway Fish & Chips", home: "Chicago, IL", base: 8.6, items: [["Beer-Battered Fish & Chips", "Fish & Chips", 1400, null]] },
  { slug: "celtic-bakehouse", name: "Celtic Bakehouse", home: "Milwaukee, WI", base: 8.4, items: [["Soda Bread & Jam", "Dessert", 600, null], ["Currant Scones", "Dessert", 500, null]] },
  { slug: "fairgrounds-cream-puffs", name: "Fairgrounds Cream Puffs", home: "West Allis, WI", base: 9.3, items: [["Original Cream Puff", "Cream Puffs", 600, null], ["Chocolate Cream Puff", "Cream Puffs", 700, null]] },
  { slug: "curd-wagon", name: "The Curd Wagon", home: "Madison, WI", base: 8.9, items: [["Fried Cheese Curds", "Cheese Curds", 900, null], ["Garlic Curds", "Cheese Curds", 1000, null]] },
  { slug: "corn-dog-castle", name: "Corn Dog Castle", home: "West Allis, WI", base: 8.2, items: [["Jumbo Corn Dog", "Sides", 700, null]] },
  { slug: "deep-dish-dreams", name: "Deep Dish Dreams", home: "Chicago, IL", base: 8.7, items: [["Deep Dish Slice", "Pizza", 900, null], ["Italian Beef Sandwich", "Sides", 1100, null]] },
  { slug: "maxwell-street-polish-co", name: "Maxwell Street Polish Co.", home: "Chicago, IL", base: 8.5, items: [["Maxwell Street Polish", "Sausage", 800, null]] },
  { slug: "windy-city-elotes", name: "Windy City Elotes", home: "Chicago, IL", base: 8.8, items: [["Elote (Street Corn)", "Sides", 600, null]] },
] as const;

// vendorSlug → [ [eventSlug, ratingDelta] ]  (touring vendors span many events)
const APPEARANCES: Record<string, [string, number][]> = {
  "cowboys-bbq": [["naperville-ribfest-2026", 0.2], ["brushy-creek-bbq-2026", 0.1], ["sweetwater-rattlesnake-2026", 0.1], ["pflugerville-chili-pfest-2026", -0.2], ["columbus-jazz-rib-2026", 0.2]],
  "aussom-aussie": [["naperville-ribfest-2026", 0.3], ["ribfest-chicago-2026", 0.4], ["happy-harrys-ribfest-2026", 0.2]],
  "big-show-bbq": [["columbus-jazz-rib-2026", 0.1], ["best-in-the-west-nugget-2026", -0.1]],
  "bbq-king-smokehouse": [["columbus-jazz-rib-2026", 0.2], ["naperville-ribfest-2026", 0.1]],
  "smoke-barrel": [["happy-harrys-ribfest-2026", 0.1]],
  "franklin-road-smoke": [["naperville-ribfest-2026", 0.0]],
  "texas-outlaw-bbq": [["best-in-the-west-nugget-2026", 0.3], ["columbus-jazz-rib-2026", 0.2], ["ribfest-chicago-2026", 0.1], ["windy-city-smokeout-2026", 0.2]],
  "desperados-bbq": [["best-in-the-west-nugget-2026", 0.1], ["columbus-jazz-rib-2026", 0.0]],
  "pigfoot-bbq": [["naperville-ribfest-2026", 0.3], ["ribfest-chicago-2026", 0.2], ["happy-harrys-ribfest-2026", 0.1], ["columbus-jazz-rib-2026", 0.3], ["windy-city-smokeout-2026", 0.3]],
  // Columbus lineup (real): traveling teams get a 2nd stop for graph density
  "armadillos-bbq": [["columbus-jazz-rib-2026", 0.1], ["happy-harrys-ribfest-2026", 0.0]],
  "austins-texas-lightning": [["columbus-jazz-rib-2026", 0.1], ["best-in-the-west-nugget-2026", 0.2]],
  "carolina-rib-king": [["columbus-jazz-rib-2026", 0.2]],
  "chicago-bbq-company": [["columbus-jazz-rib-2026", 0.0], ["ribfest-chicago-2026", 0.3], ["windy-city-smokeout-2026", 0.4]],
  "mojos-famous-bbq": [["columbus-jazz-rib-2026", 0.2], ["windy-city-smokeout-2026", 0.2]],
  "buck-em-bbq": [["columbus-jazz-rib-2026", 0.1]],
  "off-the-bone-bbq": [["columbus-jazz-rib-2026", 0.1]],
  "belly-out-bbq": [["columbus-jazz-rib-2026", 0.3]],
  "taestys": [["columbus-jazz-rib-2026", 0.0]],
  "juniors-sweetpotato-pie": [["columbus-jazz-rib-2026", 0.2]],
  // German Fest Milwaukee (local WI vendors, single-event — realistic)
  "brat-haus-mke": [["german-fest-milwaukee-2026", 0.2], ["wisconsin-state-fair-2026", 0.1]],
  "bavarian-pretzel-haus": [["german-fest-milwaukee-2026", 0.3], ["wisconsin-state-fair-2026", 0.2]],
  "schnitzel-wagen": [["german-fest-milwaukee-2026", 0.1]],
  "schwarzwald-strudel": [["german-fest-milwaukee-2026", 0.2]],
  // Festa Italiana (MKE locals; cannoli + pizza also work the State Fair)
  "nonnas-pasta-wagon": [["festa-italiana-2026", 0.2]],
  "lakefront-pizza-oven": [["festa-italiana-2026", 0.1], ["wisconsin-state-fair-2026", 0.0]],
  "mke-cannoli-co": [["festa-italiana-2026", 0.3], ["milwaukee-irish-fest-2026", 0.1]],
  // Irish Fest
  "galway-fish-chips": [["milwaukee-irish-fest-2026", 0.2], ["taste-of-chicago-2026", 0.1]],
  "celtic-bakehouse": [["milwaukee-irish-fest-2026", 0.2]],
  // Wisconsin State Fair
  "fairgrounds-cream-puffs": [["wisconsin-state-fair-2026", 0.4]],
  "curd-wagon": [["wisconsin-state-fair-2026", 0.3], ["german-fest-milwaukee-2026", 0.1]],
  "corn-dog-castle": [["wisconsin-state-fair-2026", 0.0]],
  // Taste of Chicago
  "deep-dish-dreams": [["taste-of-chicago-2026", 0.2]],
  "maxwell-street-polish-co": [["taste-of-chicago-2026", 0.1]],
  "windy-city-elotes": [["taste-of-chicago-2026", 0.3]],
  "porky-chicks-bbq": [["happy-harrys-ribfest-2026", 0.2], ["columbus-jazz-rib-2026", 0.1]],
  "lone-star-chili-co": [["pflugerville-chili-pfest-2026", 0.3], ["sweetwater-rattlesnake-2026", 0.2]],
  "five-alarm-chili": [["sweetwater-rattlesnake-2026", 0.4], ["pflugerville-chili-pfest-2026", 0.1]],
};

const clamp = (n: number) => Math.max(1, Math.min(10, n));
const wavg = (rows: { score: number; weight: number }[]) => { if (!rows.length) return { avg: 0, count: 0 }; const w = rows.reduce((a, r) => a + r.weight, 0) || rows.length; return { avg: Math.round((rows.reduce((a, r) => a + r.score * r.weight, 0) / w) * 10) / 10, count: rows.length }; };

async function main() {
  // categories: ensure focus-specific ones exist (Chili; German Fest adds Pretzels/Schnitzel)
  let so = 16;
  for (const name of ["Chili", "Pretzels", "Schnitzel", "Pizza", "Pasta", "Fish & Chips", "Cheese Curds", "Cream Puffs"]) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await db.category.upsert({ where: { name }, update: {}, create: { name, slug, sortOrder: so++ } });
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
      await db.appearance.upsert({ where: { vendorId_eventId: { vendorId: vendor.id, eventId } }, update: {}, create: { vendorId: vendor.id, eventId, qrSlug: `${vslug}-${eslug}`, boothLabel: null } });
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

  // spread rating dates across the ~14 days before the anchor so time-series/trend
  // charts actually draw (all seeds otherwise stamp createdAt = seed time → flat).
  // Deterministic (index-based, fixed anchor) so `reset` stays reproducible.
  {
    const DAY = 86400000;
    const anchor = new Date("2026-07-20T18:00:00Z").getTime();
    const allR = await db.rating.findMany({ select: { id: true }, orderBy: { id: "asc" } });
    for (let i = 0; i < allR.length; i++) {
      const created = new Date(anchor - ((i * 61) % 14) * DAY - ((i * 37) % 24) * 3600000);
      await db.rating.update({ where: { id: allR[i].id }, data: { createdAt: created } });
    }
  }

  // FULL recompute of every item + vendor aggregate from actual Rating rows, so cached
  // ratingAvg/ratingCount are always consistent (fixes stale base-seed numbers like a
  // vendor showing 19 while one of its items still showed a hardcoded 1,900).
  const allItems = await db.item.findMany({ select: { id: true } });
  for (const it of allItems) { const rows = await db.rating.findMany({ where: { itemId: it.id }, select: { score: true, weight: true } }); const a = wavg(rows); await db.item.update({ where: { id: it.id }, data: { ratingAvg: a.avg, ratingCount: a.count } }); }
  const allVendors = await db.vendor.findMany({ select: { id: true } });
  for (const v of allVendors) { const rows = await db.rating.findMany({ where: { vendorId: v.id }, select: { score: true, weight: true } }); const a = wavg(rows); await db.vendor.update({ where: { id: v.id }, data: { ratingAvg: a.avg, ratingCount: a.count } }); }

  // belt-and-suspenders: flag ALL seeded roots as test (dev DB is all synthetic)
  await db.event.updateMany({ data: { isTest: true } });
  await db.vendor.updateMany({ data: { isTest: true } });
  await db.user.updateMany({ data: { isTest: true } });

  const [ev, ve, ra] = await Promise.all([db.event.count(), db.vendor.count(), db.rating.count()]);
  console.log(`✅ seed-circuit: ${EVENTS.length} real events + ${NEW_VENDORS.length} vendors added → ${ev} events, ${ve} vendors, ${ra} ratings. All flagged isTest.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
