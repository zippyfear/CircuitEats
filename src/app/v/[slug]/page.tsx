import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import RateWidget from "@/components/RateWidget";
import { resolveEventConfig, PLATFORM_DEFAULTS } from "@/lib/config";
import WaitWidget from "@/components/WaitWidget";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await db.vendor.findUnique({
    where: { slug },
    include: {
      items: { orderBy: { ratingAvg: "desc" }, include: { category: true } },
      appearances: { include: { event: true }, take: 1 },
    },
  });
  if (!vendor) notFound();

  const appearance = vendor.appearances[0];
  const worst = vendor.ratingAvg < 5;
  // Config-driven vocabulary + feature-flags (§20) — resolved from this event's preset + overrides.
  const cfg = appearance ? await resolveEventConfig(appearance.event.slug) : PLATFORM_DEFAULTS;
  const authed = !!(await auth())?.user; // view is open; rating/wait actions gated on sign-in

  return (
    <main className="wrap">
      <a className="back" href="/">‹ All vendors</a>
      <div className="vhero">
        {vendor.ratingCount > 15000 && <span className="ontour">◎ On tour</span>}
        <div>
          <h1>{vendor.name}</h1>
          <div className="ev">
            {appearance ? `${appearance.event.name} · ${appearance.boothLabel ?? ""}` : vendor.homeBase ?? "On the circuit"}
          </div>
        </div>
      </div>

      <div className="vstats">
        <div className="vstat">
          <div className="l">Global rating</div>
          <div className="n tnum" style={{ color: worst ? "var(--bad)" : undefined }}>
            {vendor.ratingAvg.toFixed(1)}<small>/10</small>
          </div>
        </div>
        <div className="vstat">
          <div className="l">Ratings</div>
          <div className="n tnum">{vendor.ratingCount.toLocaleString()}</div>
        </div>
        <div className="vstat">
          <div className="l">Home base</div>
          <div className="n" style={{ fontSize: 15 }}>{vendor.homeBase ?? "—"}</div>
        </div>
      </div>

      {cfg.features.waitTimes && appearance && (
        <WaitWidget appearanceId={appearance.id} initialWait={appearance.currentWaitMin} rating={vendor.ratingAvg} authed={authed} />
      )}

      <div className="eyebrow">{cfg.vocab.offeringPlural} · tap ★ to rate{cfg.features.ordering ? " · order ahead available" : ""}</div>
      <div className="card">
        {vendor.items.map((it) => (
          <div className="item" key={it.id}>
            <div className="info">
              <div className="nm">{it.name}</div>
              <div className="mt">
                <span className="s">★ {it.ratingAvg.toFixed(1)}</span> · {it.category?.name ?? "Other"} · {it.ratingCount.toLocaleString()} ratings
              </div>
            </div>
            <div className="price tnum">{it.typicalPriceCents ? `$${(it.typicalPriceCents / 100).toFixed(0)}` : ""}</div>
            <RateWidget itemId={it.id} vendorId={vendor.id} current={it.ratingAvg} authed={authed} />
          </div>
        ))}
      </div>

      <div className="foot">Ratings here roll up to {vendor.name}&apos;s global reputation — across every event on the circuit.</div>
    </main>
  );
}
