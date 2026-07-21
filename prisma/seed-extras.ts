// CircuitEats — seed-extras.ts
// Layers everything added after the Phase-1 base seed (prisma/seed.ts) so ONE
// run reproduces the full current-state DB: portion variants + per-unit qty,
// event geo/check-in token, the admin account (owner + platform admin), a MOCK
// POS connection, moderation config, the Circuit-family verticals, and promos.
// Idempotent. Run AFTER prisma/seed.ts.  npx tsx prisma/seed-extras.ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// portion variants (label, priceCents, note?) + the item's priced-by unit
const ITEMS: Record<string, { unit: string | null; v: [string, number, string?][] }> = {
  "cowboys-bbq|Baby Back Ribs":        { unit: "rib",  v: [["2 bones", 600], ["4 bones", 1100], ["Half rack", 1600, "6 bones"], ["Full rack", 2900, "12 bones"]] },
  "franklin-road-smoke|Baby Back Ribs":{ unit: "rib",  v: [["3 bones", 850], ["Half rack", 1700], ["Full rack", 3000]] },
  "aussom-aussie|Baby Back Ribs":      { unit: "rib",  v: [["3 bones", 800], ["Half rack", 1700], ["Full rack", 2900]] },
  "bbq-king-smokehouse|St. Louis Ribs":{ unit: "rib",  v: [["3 bones", 750], ["Half rack", 1600], ["Full rack", 2800]] },
  "smoke-barrel|Ribs":                 { unit: "rib",  v: [["Half rack", 1500], ["Full rack", 2700]] },
  "big-show-bbq|Ribs":                 { unit: "rib",  v: [["Half rack", 1600], ["Full rack", 2800]] },
  "cowboys-bbq|Brisket Plate":         { unit: "lb",   v: [["Sliced 1/3 lb", 1400], ["Plate 1/2 lb + 2 sides", 1800], ["1 lb to-go", 2600]] },
  "franklin-road-smoke|Brisket":       { unit: "lb",   v: [["1/3 lb", 1400], ["1/2 lb", 1900], ["1 lb", 3400]] },
  "aussom-aussie|Brisket":             { unit: "lb",   v: [["1/3 lb", 1300], ["1/2 lb", 1900], ["Plate + 2 sides", 2400]] },
  "big-show-bbq|2-Meat Plate":         { unit: "lb",   v: [["2-Meat Plate", 2600], ["3-Meat Plate", 3200]] },
  "cowboys-bbq|Burnt Ends":            { unit: null,   v: [["1/2 lb", 1400], ["1 lb", 2500]] },
  "bbq-king-smokehouse|Pulled Pork":   { unit: null,   v: [["Sandwich", 1000], ["1/2 lb", 1300], ["Plate + 2 sides", 1500]] },
  "cowboys-bbq|Pulled Pork Sandwich":  { unit: null,   v: [["Sandwich", 1100], ["Loaded Sandwich", 1400], ["Plate", 1600]] },
  "cowboys-bbq|Mac & Cheese":          { unit: null,   v: [["Small", 500], ["Medium", 700], ["Large", 1000]] },
  "smoke-barrel|Mac & Cheese":         { unit: null,   v: [["Small", 600], ["Medium", 800], ["Large", 1100]] },
  "smoke-barrel|Baked Beans":          { unit: null,   v: [["Cup", 400], ["Pint", 700]] },
  "cowboys-bbq|Cornbread":             { unit: null,   v: [["1 piece", 400], ["3-pack", 1000]] },
  "aussom-aussie|Smoked Sausage":      { unit: "link", v: [["1 link", 900], ["2 links", 1600]] },
  "bbq-king-smokehouse|House Sauce Combo": { unit: null, v: [["4 oz cup", 400], ["Sampler (3-pack)", 1200]] },
};
function qtyFor(unit: string | null, label: string): number | null {
  const l = label.toLowerCase();
  if (unit === "rib") { if (l.includes("half rack")) return 6; if (l.includes("full rack")) return 12; const m = l.match(/(\d+)\s*bone/); return m ? +m[1] : null; }
  if (unit === "link") { const m = l.match(/(\d+)\s*link/); return m ? +m[1] : null; }
  if (unit === "lb") { if (l.includes("1/3")) return 1 / 3; if (l.includes("1/2")) return 0.5; if (/(^|\s)1\s*lb/.test(l)) return 1; return null; }
  return null;
}

const VERTICALS = [
  { key: "circuit", brandName: "Circuit", tagline: "The best of everything, at the best events.", whatWord: "of everything", placeWord: "events", blurb: "The reputation network for events and the vendors who work them — one profile that travels every event, everywhere.", accent: "#DE7127", emoji: "🎯", isPlatform: true, sortOrder: 0 },
  { key: "eats", brandName: "CircuitEats", tagline: "Best food, best festivals.", whatWord: "food", placeWord: "festivals", blurb: "Food festivals, rib fests, BBQ competitions and food-truck rallies.", accent: "#DE7127", emoji: "🍖", sortOrder: 1 },
  { key: "market", brandName: "CircuitMarket", tagline: "Best makers, best markets.", whatWord: "makers", placeWord: "markets", blurb: "Farmers markets, maker markets and pop-up marketplaces.", accent: "#3A9D5D", emoji: "🧺", sortOrder: 2 },
  { key: "fair", brandName: "CircuitFair", tagline: "Best of the fair, best fairs.", whatWord: "of the fair", placeWord: "fairs", blurb: "County and state fairs — food, rides, livestock and blue-ribbon everything.", accent: "#C6403B", emoji: "🎡", sortOrder: 3 },
  { key: "con", brandName: "CircuitCon", tagline: "Best of the floor, best cons.", whatWord: "of the floor", placeWord: "cons", blurb: "Comic, anime and fan conventions — artist alley, exhibitors and vendors.", accent: "#6C63FF", emoji: "🦸", sortOrder: 4 },
  { key: "brew", brandName: "CircuitBrew", tagline: "Best pours, best fests.", whatWord: "pours", placeWord: "fests", blurb: "Beer, wine, cider and spirits festivals and tastings.", accent: "#C08A2D", emoji: "🍺", sortOrder: 5 },
  { key: "arts", brandName: "CircuitArts", tagline: "Best art, best art fairs.", whatWord: "art", placeWord: "art fairs", blurb: "Art fairs, craft shows and fine-art festivals.", accent: "#1FA2A8", emoji: "🎨", sortOrder: 6 },
  { key: "night", brandName: "CircuitNight", tagline: "Best stalls, best night markets.", whatWord: "stalls", placeWord: "night markets", blurb: "Night markets and evening street-food bazaars.", accent: "#4B4E9E", emoji: "🌙", sortOrder: 7 },
];

const PROMOS = [
  { lead: "Hosting provided by SmokeStack", blurb: "The open-source BBQ platform that turns live pit telemetry into on-time, on-temp cooks — real-time monitoring, smart wrap & pull calls, and an AI pitmaster in your corner.", ctaLabel: "smokestackpit.com ↗" },
  { lead: "Running a cook this weekend?", blurb: "SmokeStack watches the pit so you don't have to — live temps, stall detection, and wrap & pull alerts before you need them.", ctaLabel: "Try SmokeStack ↗" },
  { lead: "Never miss the wrap window again", blurb: "SmokeStack's AI pitmaster calls your wrap and pull with lead time, so dinner hits the table when you promised.", ctaLabel: "See how it works ↗" },
  { lead: "From this pit to yours", blurb: "The vendors you're rating cook on instinct. SmokeStack gives you the same feel with live data — monitor, steer, and perfect your smoke.", ctaLabel: "Explore SmokeStack ↗" },
  { lead: "Powered by SmokeStack", blurb: "The BBQ platform behind CircuitEats. Free, open-source, and built to make every cook your best one.", ctaLabel: "smokestackpit.com ↗" },
  { lead: "Smoke smarter, not harder", blurb: "Real-time pit monitoring plus AI advice from SmokeStack — dial in your temps and let it handle the timing.", ctaLabel: "Get started free ↗" },
];

async function main() {
  // 1. event geo / segmentation / check-in token
  await db.event.updateMany({ where: { slug: "elkhorn-ribfest-2026" }, data: { city: "Elkhorn", region: "WI", geoRadiusM: 800 } });
  await db.event.updateMany({ where: { slug: "elkhorn-ribfest-2026", checkInToken: null }, data: { checkInToken: "elk26-seedtoken" } });

  // 2. portion variants + per-unit qty + unit + "from" price
  let vc = 0;
  for (const [key, def] of Object.entries(ITEMS)) {
    const [vslug, name] = key.split("|");
    const vendor = await db.vendor.findUnique({ where: { slug: vslug } });
    if (!vendor) continue;
    const item = await db.item.findFirst({ where: { vendorId: vendor.id, name } });
    if (!item) continue;
    await db.itemVariant.deleteMany({ where: { itemId: item.id } });
    let so = 0; const prices: number[] = [];
    for (const [label, priceCents, note] of def.v) {
      await db.itemVariant.create({ data: { itemId: item.id, label, priceCents, note: note ?? null, qty: qtyFor(def.unit, label), sortOrder: so++ } });
      prices.push(priceCents); vc++;
    }
    await db.item.update({ where: { id: item.id }, data: { unit: def.unit, typicalPriceCents: Math.min(...prices) } });
  }

  // 3. admin account: test@cowboys.com = Cowboys owner + PLATFORM ADMIN + MOCK POS
  const admin = await db.user.upsert({ where: { email: "test@cowboys.com" }, update: {}, create: { email: "test@cowboys.com", displayName: "test", reviewerScore: 0.6 } });
  const cowboys = await db.vendor.findUnique({ where: { slug: "cowboys-bbq" } });
  if (cowboys) {
    await db.vendor.update({ where: { id: cowboys.id }, data: { claimed: true, ownerUserId: admin.id } });
    await db.membership.upsert({ where: { userId_scope_targetId: { userId: admin.id, scope: "VENDOR", targetId: cowboys.id } }, update: { role: "OWNER" }, create: { userId: admin.id, scope: "VENDOR", targetId: cowboys.id, role: "OWNER" } });
    await db.posConnection.upsert({ where: { vendorId: cowboys.id }, update: {}, create: { vendorId: cowboys.id, provider: "MOCK", active: true } });
  }
  if (!(await db.membership.findFirst({ where: { userId: admin.id, scope: "PLATFORM", role: "ADMIN" } }))) {
    await db.membership.create({ data: { userId: admin.id, scope: "PLATFORM", role: "ADMIN" } });
  }

  // 4. moderation config singleton
  await db.moderationConfig.upsert({ where: { id: "default" }, update: {}, create: { id: "default", flagHideThreshold: 3, photoBanStrikes: 3, ratingBanStrikes: 5 } });

  // 5. Circuit-family verticals
  for (const v of VERTICALS) await db.vertical.upsert({ where: { key: v.key }, update: v, create: v });

  // 6. host-promo messages
  if ((await db.promoMessage.count()) === 0) for (const m of PROMOS) await db.promoMessage.create({ data: m });

  console.log(`✅ seed-extras: ${vc} variants+units, admin(test@cowboys.com=owner+platform-admin), Cowboys MOCK POS, ModerationConfig, ${VERTICALS.length} verticals, promos.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
