// CircuitEats — seed.ts  (Phase 1 seed data)
// Loads the category taxonomy + the Elkhorn Ribfest 2026 seed dataset
// (from Documents\Ribfest_Ratings + mock circuit vendors) so the app runs on
// real rows, not mock JSON. Idempotent via upserts on slug/email.
//
// Run on the dev VM after `prisma migrate dev`:  npx tsx prisma/seed.ts
import { PrismaClient, VendorStatus, EventStatus } from "@prisma/client";
const db = new PrismaClient();

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const CATEGORIES = [
  "Ribs","Brisket","Pulled Pork","Chicken","Burnt Ends","Sausage",
  "Mac & Cheese","Beans","Slaw","Cornbread","Sides","Sauce","Dessert","Drinks","Other",
];

// vendor → { global avg, count, homeBase, items:[name,category,priceCents,avg,count] }
const VENDORS = [
  { name: "Cowboys BBQ", home: "Fort Worth, TX", avg: 8.7, count: 22100, items: [
    ["Baby Back Ribs","Ribs",1600,9.2,3100],["Brisket Plate","Brisket",1800,8.9,2600],
    ["Burnt Ends","Burnt Ends",1400,9.4,1900],["Pulled Pork Sandwich","Pulled Pork",1100,8.6,1400],
    ["Mac & Cheese","Mac & Cheese",700,8.1,900],["Cornbread","Cornbread",400,7.9,700],
  ]},
  { name: "Aussom Aussie", home: "Austin, TX", avg: 8.8, count: 48200, items: [
    ["Baby Back Ribs","Ribs",1700,8.7,5200],["Brisket","Brisket",1900,8.9,6100],["Smoked Sausage","Sausage",900,8.4,2100],
  ]},
  { name: "BBQ King Smokehouse", home: "Kansas City, MO", avg: 8.3, count: 31500, items: [
    ["St. Louis Ribs","Ribs",1600,8.2,4200],["Pulled Pork","Pulled Pork",1000,8.4,3100],["House Sauce Combo","Sauce",1200,8.0,1500],
  ]},
  { name: "Smoke & Barrel", home: "Nashville, TN", avg: 7.9, count: 12800, items: [
    ["Ribs","Ribs",1500,7.6,1800],["Mac & Cheese","Mac & Cheese",800,8.4,1600],["Baked Beans","Beans",500,7.8,900],
  ]},
  { name: "Franklin Road Smoke", home: "Franklin, TN", avg: 8.6, count: 39800, items: [
    ["Baby Back Ribs","Ribs",1700,8.9,6800],["Brisket","Brisket",1900,8.6,5900],
  ]},
  // the coasting champ — global reputation dragged down (Case study #1)
  { name: "Big Show BBQ", home: "Elkhorn, WI", avg: 4.2, count: 9800, items: [
    ["2-Meat Plate","Brisket",2600,4.0,4100],["Ribs","Ribs",1600,4.4,3200],
  ]},
];

async function main() {
  // Categories
  const cat: Record<string, string> = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = await db.category.upsert({
      where: { slug: slug(CATEGORIES[i]) },
      update: { sortOrder: i },
      create: { name: CATEGORIES[i], slug: slug(CATEGORIES[i]), sortOrder: i },
    });
    cat[CATEGORIES[i]] = c.id;
  }

  // Demo user (for seeded ratings)
  const user = await db.user.upsert({
    where: { email: "seed@circuiteats.app" },
    update: {},
    create: { email: "seed@circuiteats.app", displayName: "Seed Reviewer", reviewerScore: 0.8 },
  });

  // EventType preset: FESTIVAL (§20.2 — vocab + feature defaults for the launch vertical)
  const festival = await db.eventType.upsert({
    where: { key: "FESTIVAL" },
    update: {},
    create: {
      key: "FESTIVAL", name: "Food Festival",
      vocab: { container: "Festival", containerPlural: "Festivals", participant: "Vendor", participantPlural: "Vendors", offering: "Dish", offeringPlural: "Dishes" },
      features: { rating: true, voting: true, ordering: false, waitTimes: true, ticketing: false, schedule: true },
      theme: { accent: "#DE7127" },
    },
  });

  // Event: Elkhorn Ribfest 2026 (attached to FESTIVAL preset + a coordinator config override)
  const eventCfg = {
    eventTypeId: festival.id,
    containerKind: "EVENT" as const,
    config: { features: { ordering: false }, theme: { accent: "#DE7127" } },
  };
  const event = await db.event.upsert({
    where: { slug: "elkhorn-ribfest-2026" },
    update: eventCfg,
    create: {
      name: "Elkhorn Ribfest 2026", slug: "elkhorn-ribfest-2026",
      venue: "Walworth County Fairgrounds, Elkhorn, WI",
      lat: 42.6828, lng: -88.5443,
      startDate: new Date("2026-07-15"), endDate: new Date("2026-07-19"),
      status: EventStatus.ACTIVE, official: false,
      ...eventCfg,
    },
  });

  // Vendors + items + appearances + a couple ratings each
  for (const v of VENDORS) {
    const vendor = await db.vendor.upsert({
      where: { slug: slug(v.name) },
      update: { ratingAvg: v.avg, ratingCount: v.count, homeBase: v.home },
      create: {
        name: v.name, slug: slug(v.name), homeBase: v.home,
        status: VendorStatus.ACTIVE, ratingAvg: v.avg, ratingCount: v.count,
      },
    });

    // Appearance at Elkhorn
    await db.appearance.upsert({
      where: { vendorId_eventId: { vendorId: vendor.id, eventId: event.id } },
      update: {},
      create: {
        vendorId: vendor.id, eventId: event.id,
        boothLabel: `Booth ${VENDORS.indexOf(v) + 1}`,
        qrSlug: `${slug(v.name)}-elkhorn26`,
      },
    });

    for (const [name, category, price, iavg, icount] of v.items as [string,string,number,number,number][]) {
      // find-or-create item by (vendor,name)
      const existing = await db.item.findFirst({ where: { vendorId: vendor.id, name } });
      const item = existing
        ? await db.item.update({ where: { id: existing.id }, data: { ratingAvg: iavg, ratingCount: icount } })
        : await db.item.create({
            data: {
              vendorId: vendor.id, name, categoryId: cat[category] ?? cat["Other"],
              typicalPriceCents: price, ratingAvg: iavg, ratingCount: icount,
            },
          });

      // one seeded verified rating (idempotent on [userId,itemId])
      await db.rating.upsert({
        where: { userId_itemId: { userId: user.id, itemId: item.id } },
        update: { score: Math.round(iavg) },
        create: {
          userId: user.id, vendorId: vendor.id, itemId: item.id, eventId: event.id,
          score: Math.round(iavg), verified: true, weight: 1.5,
          tags: v.name === "Big Show BBQ" ? ["skip"] : ["worth-the-wait"],
          note: v.name === "Cowboys BBQ" && name.includes("Ribs") ? "great bark" : undefined,
        },
      });
    }
  }

  console.log("✅ Seeded:", CATEGORIES.length, "categories,", VENDORS.length, "vendors, 1 event (Elkhorn Ribfest 2026).");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
