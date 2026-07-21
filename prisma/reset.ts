// CircuitEats — reset.ts
// Wipes every table (TRUNCATE ... CASCADE — no FK-order pain) and re-seeds the
// full known-good state (base seed + extras). One command → clean, deterministic
// dev DB. All data is synthetic; safe on the dev box only.  npx tsx prisma/reset.ts
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
const db = new PrismaClient();

// every model → table (order irrelevant with CASCADE)
const TABLES = [
  "AuditLog", "Badge", "UserBadge", "Contribution", "CheckIn", "WaitReport", "Order", "OrderItem",
  "PhotoVote", "PhotoFlag", "Photo", "Vote", "Follow", "Rating", "ItemVariant", "Item",
  "Appearance", "PosConnection", "VendorView", "Membership", "Vendor", "Event", "EventType",
  "Category", "Vertical", "PromoStat", "PromoMessage", "ModerationConfig", "User",
];

async function main() {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  console.log(`🧨 truncated ${TABLES.length} tables`);
  await db.$disconnect();
  console.log("🌱 seeding…");
  execSync("npx tsx prisma/seed.ts && npx tsx prisma/seed-extras.ts", { stdio: "inherit", cwd: process.cwd() });
  console.log("✅ reset complete — clean, deterministic dev DB.");
}
main().catch((e) => { console.error(e); process.exit(1); });
