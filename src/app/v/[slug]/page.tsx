import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import RateWidget from "@/components/RateWidget";
import { resolveEventConfig, PLATFORM_DEFAULTS } from "@/lib/config";
import WaitWidget from "@/components/WaitWidget";
import { currentUser, isPlatformAdmin } from "@/lib/roles";
import ViewBeacon from "@/components/ViewBeacon";
import ClaimButton from "@/components/ClaimButton";
import FollowButton from "@/components/FollowButton";
import PhotoControls from "@/components/PhotoControls";

export const dynamic = "force-dynamic";

function fmtRange(a: Date, b: Date) {
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = a.toLocaleDateString("en-US", o), e = b.toLocaleDateString("en-US", o);
  return `${s === e ? s : `${s} – ${e}`}, ${b.getFullYear()}`;
}

export default async function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await db.vendor.findUnique({
    where: { slug },
    include: {
      items: { orderBy: { ratingAvg: "desc" }, include: { category: true, variants: { orderBy: { sortOrder: "asc" } } } },
      // ALL appearances, most-recent first — powers the "On the circuit" section (the reputation-travels moat).
      appearances: { include: { event: true }, orderBy: { event: { startDate: "desc" } } },
      photos: { where: { status: "VISIBLE" }, orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!vendor) notFound();

  const apps = vendor.appearances;          // all events this vendor has worked, newest first
  const appearance = apps[0];               // most-recent = the "current" context for hero/config
  const onTour = apps.length > 1;           // reputation travels: 2+ events = on tour (was: ratingCount>15000)
  const worst = vendor.ratingAvg < 5;

  // per-event reputation rollup: this vendor's avg score + count at each event they've worked
  const eventIds = apps.map((a) => a.eventId);
  const perEvent = eventIds.length
    ? await db.rating.groupBy({ by: ["eventId"], where: { vendorId: vendor.id, eventId: { in: eventIds } }, _avg: { score: true }, _count: { _all: true } })
    : [];
  const evStat = new Map(perEvent.map((p) => [p.eventId as string, { avg: p._avg.score, count: p._count._all }]));

  // Config-driven vocabulary + feature-flags (§20) — resolved from this event's preset + overrides.
  const cfg = appearance ? await resolveEventConfig(appearance.event.slug) : PLATFORM_DEFAULTS;
  const me = await currentUser(); // view is open; rating/wait actions gated on sign-in
  const authed = !!me;
  const isOwner = !!me && vendor.ownerUserId === me.id;
  const isAdmin = !!me && (await isPlatformAdmin(me.id));
  const canClaim = !!me && !vendor.claimed;
  const links = Array.isArray(vendor.customLinks) ? (vendor.customLinks as { label: string; url: string }[]) : [];
  const following = !!me && !!(await db.follow.findFirst({ where: { userId: me.id, targetType: "VENDOR", vendorId: vendor.id } }));
  const followCount = await db.follow.count({ where: { targetType: "VENDOR", vendorId: vendor.id } });

  // viewer prefs + moderation standing (drives rating mode + photo/rating gates)
  const meUser = me ? await db.user.findUnique({ where: { id: me.id }, select: { ratingMode: true, photoBanned: true, ratingBanned: true } }) : null;
  const ratingMode = meUser?.ratingMode ?? "SIMPLE";
  const canPhoto = !!meUser && !meUser.photoBanned && !meUser.ratingBanned;
  const canRate = !meUser || !meUser.ratingBanned;

  // richer-review data: top tags per item + recent reviews (note/photo/tags)
  const vratings = await db.rating.findMany({ where: { vendorId: vendor.id }, orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { displayName: true } }, item: { select: { name: true } } } });
  const tagByItem = new Map<string, Map<string, number>>();
  for (const r of vratings) { if (!r.itemId) continue; const m = tagByItem.get(r.itemId) ?? new Map<string, number>(); for (const t of r.tags) m.set(t, (m.get(t) ?? 0) + 1); tagByItem.set(r.itemId, m); }
  const topTags = (itemId: string) => Array.from(tagByItem.get(itemId)?.entries() ?? []).sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => x[0]);
  const reviews = vratings.filter((r) => r.note || r.photoUrl || r.tags.length > 0).slice(0, 8);
  // photo status/score map (hide crowd-moderated photos; power vote/flag controls)
  const vphotos = await db.photo.findMany({ where: { vendorId: vendor.id }, select: { id: true, url: true, status: true, score: true, userId: true } });
  const photoByUrl = new Map(vphotos.map((p) => [p.url, p]));

  return (
    <main className="wrap">
      {!isOwner && !isAdmin && <ViewBeacon vendorId={vendor.id} />}
      <a className="back" href="/vendors">‹ All vendors</a>
      <div className="vhero">
        {vendor.logoUrl && <img src={vendor.logoUrl} alt="" className="vlogo" />}
        {onTour && <span className="ontour">◎ On tour</span>}
        <div>
          <h1>{vendor.name}</h1>
          <div className="ev">
            {appearance ? `${appearance.event.name}${appearance.boothLabel ? ` · ${appearance.boothLabel}` : ""}` : vendor.homeBase ?? "On the circuit"}
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
          <div className="l">{onTour ? "Events" : "Home base"}</div>
          <div className="n" style={{ fontSize: onTour ? undefined : 15 }}>{onTour ? <span className="tnum">{apps.length}</span> : (vendor.homeBase ?? "—")}</div>
        </div>
      </div>

      <div className="vactions">
        <FollowButton vendorId={vendor.id} initialFollowing={following} initialCount={followCount} authed={authed} />
        <a className="editlink" style={{ margin: 0 }} href={`/v/${vendor.slug}/order`}>🧾 Order</a>
        {(isOwner || isAdmin) && <a className="editlink" style={{ margin: 0 }} href={`/v/${vendor.slug}/edit`}>✎ Edit</a>}
        {(isOwner || isAdmin) && <a className="editlink" style={{ margin: 0 }} href={`/v/${vendor.slug}/analytics`}>📊 Analytics</a>}
        {(isOwner || isAdmin) && <a className="editlink" style={{ margin: 0 }} href={`/v/${vendor.slug}/orders`}>🧾 Queue</a>}
        {(isOwner || isAdmin) && <a className="editlink" style={{ margin: 0 }} href={`/v/${vendor.slug}/tables`}>🔳 Table QRs</a>}
        {canClaim && <ClaimButton vendorId={vendor.id} />}
      </div>
      {links.length > 0 && (
        <div className="vlinks">
          {links.map((l, i) => <a key={i} className="vlink" href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}
        </div>
      )}

      {apps.length > 0 && (
        <>
          <div className="eyebrow">On the circuit · {apps.length} {apps.length === 1 ? "event" : "events"}</div>
          <div className="card">
            {apps.map((a) => {
              const st = evStat.get(a.eventId);
              return (
                <a className="circuit-row" key={a.id} href={`/e/${a.event.slug}`}>
                  <div className="grow">
                    <div className="nm">{a.event.name}</div>
                    <div className="mt">
                      {fmtRange(a.event.startDate, a.event.endDate)}
                      {a.event.city ? ` · ${a.event.city}${a.event.region ? `, ${a.event.region}` : ""}` : ""}
                      {a.boothLabel ? ` · ${a.boothLabel}` : ""}
                    </div>
                  </div>
                  <div className="circuit-score tnum">
                    {st && st.avg != null
                      ? <>★ {st.avg.toFixed(1)} <span className="muted" style={{ fontSize: 12 }}>· {st.count}</span></>
                      : <span className="muted" style={{ fontSize: 12 }}>no ratings yet</span>}
                  </div>
                </a>
              );
            })}
          </div>
        </>
      )}

      {vendor.photos.length > 0 && (
        <div className="photostrip" style={{ marginBottom: 12 }}>
          {vendor.photos.map((p) => <img key={p.id} src={p.url} alt="" className="photo" />)}
        </div>
      )}

      {cfg.features.waitTimes && appearance && (
        <WaitWidget appearanceId={appearance.id} initialWait={appearance.currentWaitMin} rating={vendor.ratingAvg} authed={authed} />
      )}

      <div className="eyebrow">{cfg.vocab.offeringPlural} · tap ★ to rate{cfg.features.ordering ? " · order ahead available" : ""}</div>
      <div className="card">
        {vendor.items.map((it) => {
          const money = (c: number) => "$" + (c % 100 === 0 ? (c / 100).toFixed(0) : (c / 100).toFixed(2));
          const prices = it.variants.length ? it.variants.map((v) => v.priceCents) : (it.typicalPriceCents != null ? [it.typicalPriceCents] : []);
          const lo = prices.length ? Math.min(...prices) : null, hi = prices.length ? Math.max(...prices) : null;
          const wq = it.variants.filter((v) => v.qty != null && v.qty > 0);
          const avgUnit = it.unit && wq.length ? Math.round(wq.reduce((s, v) => s + v.priceCents / (v.qty as number), 0) / wq.length) : null;
          return (
            <div className="item" key={it.id}>
              <div className="info">
                <div className="nm">{it.name}</div>
                <div className="mt">
                  <span className="s">★ {it.ratingAvg.toFixed(1)}</span> · {it.category?.name ?? "Other"} · {it.ratingCount.toLocaleString()} {it.ratingCount === 1 ? "rating" : "ratings"}
                </div>
                {it.variants.length > 0 && (
                  <div className="menu-portions">
                    {it.variants.map((v) => <span className="menu-portion" key={v.id} title={v.note ?? undefined}><b>{v.label}</b> <span className="tnum">{money(v.priceCents)}</span></span>)}
                  </div>
                )}
                {topTags(it.id).length > 0 && (
                  <div className="itemtags">{topTags(it.id).map((t) => <span className="itemtag" key={t}>{t}</span>)}</div>
                )}
              </div>
              <div className="price tnum">{avgUnit != null ? <>{money(avgUnit)}<span className="perunit">/{it.unit}</span></> : lo == null ? "" : lo === hi ? money(lo) : `${money(lo)}+`}</div>
              <RateWidget itemId={it.id} vendorId={vendor.id} current={it.ratingAvg} authed={authed} eventId={appearance?.eventId ?? null} mode={ratingMode} canPhoto={canPhoto} canRate={canRate} />
            </div>
          );
        })}
      </div>

      {reviews.length > 0 && (
        <>
          <div className="eyebrow">Recent reviews</div>
          <div className="card">
            {reviews.map((r) => {
              const ph = r.photoUrl ? photoByUrl.get(r.photoUrl) : null;
              const showPhoto = ph && ph.status === "VISIBLE";
              return (
                <div className="review" key={r.id}>
                  {showPhoto && (
                    <div className="review-photowrap">
                      <img src={r.photoUrl!} alt="" className="review-photo" />
                      <PhotoControls photoId={ph!.id} score={ph!.score} authed={authed} mine={ph!.userId === me?.id} />
                    </div>
                  )}
                  <div className="grow">
                    <div className="review-head"><b>{r.item?.name ?? "—"}</b> <span className="review-score tnum">★ {r.score}</span> <span className="muted" style={{ fontSize: 12 }}>· {r.user.displayName ?? "diner"}{r.verified ? " · ✓ verified" : ""}</span></div>
                    {r.tags.length > 0 && <div className="itemtags">{r.tags.map((t) => <span className="itemtag" key={t}>{t}</span>)}</div>}
                    {r.note && <div className="review-note">“{r.note}”</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="foot">Ratings here roll up to {vendor.name}&apos;s global reputation — across every event on the circuit.</div>
    </main>
  );
}
