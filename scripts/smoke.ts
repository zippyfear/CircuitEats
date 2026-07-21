// CircuitEats — smoke.ts
// Fast regression check: hits the running dev server, asserts pages render, APIs
// return the right shape, auth/role gates hold, and the rate + order happy-paths
// work. Grabs fixture ids from the DB. Exits non-zero on any failure.
// Best run right after a reset:  npx tsx prisma/reset.ts && npx tsx scripts/smoke.ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const BASE = process.env.SMOKE_BASE ?? "http://localhost:4600";

let pass = 0; const fails: string[] = [];
const check = (name: string, cond: boolean) => { if (cond) pass++; else fails.push(name); };

type Jar = Record<string, string>;
function absorb(res: Response, jar: Jar) {
  const sc = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  for (const c of sc) { const nv = c.split(";")[0]; const i = nv.indexOf("="); if (i > 0) jar[nv.slice(0, i).trim()] = nv.slice(i + 1).trim(); }
}
const header = (jar: Jar) => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
async function login(email: string): Promise<string> {
  const jar: Jar = {};
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`); absorb(csrfRes, jar);
  const { csrfToken } = await csrfRes.json();
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: header(jar) }, body: new URLSearchParams({ csrfToken, email, json: "true" }), redirect: "manual" });
  absorb(res, jar);
  return header(jar);
}
const get = (path: string, cookie?: string) => fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {}, redirect: "manual" });
const post = (path: string, data: unknown, cookie?: string) => fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(data), redirect: "manual" });

async function main() {
  const cowboys = await db.vendor.findUnique({ where: { slug: "cowboys-bbq" } });
  const event = await db.event.findUnique({ where: { slug: "elkhorn-ribfest-2026" } });
  if (!cowboys || !event) { console.error("Fixtures missing — run reset/seed first."); process.exit(1); }
  const appearance = await db.appearance.findFirst({ where: { vendorId: cowboys.id, eventId: event.id } });
  const mac = await db.item.findFirst({ where: { vendorId: cowboys.id, name: "Mac & Cheese" } });

  // public pages → 200
  for (const p of ["/", "/family", "/signin", `/e/${event.slug}`, `/e/${event.slug}/c/ribs`, `/v/${cowboys.slug}`, `/v/${cowboys.slug}/order`]) {
    check(`GET ${p} → 200`, (await get(p)).status === 200);
  }
  // public API shapes
  const lb = await (await get("/api/leaderboard?scope=global")).json();
  check("leaderboard.vendors[]", Array.isArray(lb.vendors) && lb.vendors.length > 0);
  const cat = await (await get(`/api/category?eventSlug=${event.slug}&categorySlug=ribs&scope=global`)).json();
  check("category.ranking[]", Array.isArray(cat.ranking) && cat.ranking.length > 0);
  check("category per-unit (rib avg)", cat.ranking[0]?.unit === "rib" && cat.ranking[0]?.avgUnitCents > 0);
  const vert = await (await get("/api/verticals")).json();
  check("verticals: Circuit + 7", vert.platform?.brandName === "Circuit" && vert.verticals?.length === 7);

  // gates (anon)
  check("anon rate → 401", (await post("/api/rate", { itemId: "x", vendorId: "x", score: 5 })).status === 401);
  check("anon /admin → 307", (await get("/admin")).status === 307);
  check("anon analytics → 307", (await get(`/v/${cowboys.slug}/analytics`)).status === 307);

  // admin + non-admin gates
  const admin = await login("test@cowboys.com");
  check("admin /admin → 200", (await get("/admin", admin)).status === 200);
  check("admin /admin/moderation → 200", (await get("/admin/moderation", admin)).status === 200);
  const diner = await login("smoke-diner@ce.app");
  check("non-admin /api/admin/user → 403", (await post("/api/admin/user", { op: "create", email: "x@y.z" }, diner)).status === 403);

  // rate happy-path
  const rateRes = await post("/api/rate", { itemId: mac!.id, vendorId: cowboys.id, score: 9 }, diner);
  const rate = await rateRes.json();
  check("rate → 200 + itemAvg", rateRes.status === 200 && typeof rate.itemAvg === "number");

  // order + mock POS handoff + advance
  const orderRes = await post("/api/order", { appearanceId: appearance!.id, tableLabel: "5", items: [{ itemId: mac!.id, variantLabel: "Large", qty: 1 }] }, diner);
  const order = await orderRes.json();
  check("order → 200 + MOCK POS accepted", orderRes.status === 200 && order.pos?.accepted === true);
  check("order advance → 200", (await post("/api/order/advance", { orderId: order.orderId, status: "PREPARING" }, admin)).status === 200);

  console.log(`\nSMOKE: ${pass} passed · ${fails.length} failed`);
  if (fails.length) { console.log("FAILED:\n  ✗ " + fails.join("\n  ✗ ")); process.exit(1); }
  console.log("✅ all smoke checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
