import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { currentUser, isVendorOwner, isPlatformAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

function Spark({ series }: { series: { day: string; avg: number }[] }) {
  if (series.length < 2) return <div className="muted" style={{ padding: "10px 2px", fontSize: 12 }}>Not enough rating history yet for a trend.</div>;
  const w = 560, h = 90, pad = 8;
  const min = Math.min(...series.map((p) => p.avg)), max = Math.max(...series.map((p) => p.avg));
  const rng = max - min || 1, step = (w - pad * 2) / (series.length - 1);
  const pts = series.map((p, i) => [pad + i * step, h - pad - ((p.avg - min) / rng) * (h - pad * 2)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="90" style={{ display: "block" }} preserveAspectRatio="none">
      <path d={area} fill="var(--accent-soft)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill="var(--accent-ink)" />
    </svg>
  );
}

export default async function VendorAnalytics({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await currentUser();
  const vendor = await db.vendor.findUnique({ where: { slug }, include: { items: { include: { category: true } } } });
  if (!vendor) notFound();
  if (!user || !((await isVendorOwner(user.id, vendor.id)) || (await isPlatformAdmin(user.id)))) redirect(`/v/${slug}`);

  const now = Date.now();
  const d30 = new Date(now - 30 * 864e5), d7 = new Date(now - 7 * 864e5);
  const [ratings, followers, views7, viewsAll] = await Promise.all([
    db.rating.findMany({ where: { vendorId: vendor.id }, orderBy: { createdAt: "desc" }, take: 500, include: { item: { select: { name: true } }, user: { select: { displayName: true } } } }),
    db.follow.count({ where: { targetType: "VENDOR", vendorId: vendor.id } }),
    db.vendorView.count({ where: { vendorId: vendor.id, createdAt: { gte: d7 } } }),
    db.vendorView.count({ where: { vendorId: vendor.id } }),
  ]);

  // rating trend (daily avg, last 30 days)
  const byDay = new Map<string, { s: number; n: number }>();
  for (const r of ratings) { if (r.createdAt < d30) continue; const k = r.createdAt.toISOString().slice(0, 10); const e = byDay.get(k) ?? { s: 0, n: 0 }; e.s += r.score; e.n++; byDay.set(k, e); }
  const series = Array.from(byDay.entries()).sort().map(([day, e]) => ({ day, avg: Math.round((e.s / e.n) * 10) / 10 }));

  // verified split
  const verified = ratings.filter((r) => r.verified).length;
  const verifiedPct = ratings.length ? Math.round((verified / ratings.length) * 100) : 0;

  // top tags
  const tagCount = new Map<string, number>();
  for (const r of ratings) for (const t of r.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  const topTags = Array.from(tagCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // category ranks (best item vs the field, vendor-level)
  const cats = Array.from(new Map(vendor.items.filter((i) => i.category).map((i) => [i.category!.id, i.category!])).values());
  const ranks: { name: string; rank: number; total: number; score: number }[] = [];
  for (const c of cats) {
    const items = await db.item.findMany({ where: { categoryId: c.id, ratingCount: { gt: 0 } }, select: { vendorId: true, ratingAvg: true } });
    const byVendor = new Map<string, number>();
    for (const it of items) byVendor.set(it.vendorId, Math.max(byVendor.get(it.vendorId) ?? 0, it.ratingAvg));
    const ranked = Array.from(byVendor.entries()).sort((a, b) => b[1] - a[1]);
    const idx = ranked.findIndex(([vid]) => vid === vendor.id);
    if (idx >= 0) ranks.push({ name: c.name, rank: idx + 1, total: ranked.length, score: ranked[idx][1] });
  }
  ranks.sort((a, b) => a.rank - b.rank);

  const reviews = ratings.filter((r) => r.note || r.tags.length > 0).slice(0, 6);
  const kpis: [string, string][] = [
    ["Overall rating", vendor.ratingAvg ? vendor.ratingAvg.toFixed(1) : "—"],
    ["Ratings", vendor.ratingCount.toLocaleString()],
    ["Followers", followers.toLocaleString()],
    ["Views · 7d", views7.toLocaleString()],
    ["Views · all", viewsAll.toLocaleString()],
    ["Verified", `${verifiedPct}%`],
  ];

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <a className="back" href={`/v/${slug}`}>‹ {vendor.name}</a>
      <h1 style={{ fontSize: 24, letterSpacing: "-.02em", margin: "4px 0 2px" }}>{vendor.name} · analytics</h1>
      <p className="muted" style={{ marginTop: 0 }}>Your reputation at a glance — trend, ranks, and what people say.</p>

      <div className="statgrid">
        {kpis.map(([label, n]) => <div className="statbox" key={label}><div className="statnum tnum">{n}</div><div className="statlabel">{label}</div></div>)}
      </div>

      <div className="eyebrow">Rating trend · last 30 days</div>
      <div className="card" style={{ padding: "14px 16px 8px" }}><Spark series={series} /></div>

      <div className="eyebrow" style={{ marginTop: 18 }}>Category ranks</div>
      <div className="card">
        {ranks.length === 0 && <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>No rated categories yet.</div>}
        {ranks.map((r) => (
          <div className="auditrow" key={r.name}>
            <span className={`rankbadge ${r.rank === 1 ? "gold" : ""}`}>#{r.rank}</span>
            <div className="grow"><b>{r.name}</b><div className="v-sub">of {r.total} vendors</div></div>
            <span className="score"><span className="sc tnum">{r.score.toFixed(1)}</span></span>
          </div>
        ))}
      </div>

      <div className="eyebrow" style={{ marginTop: 18 }}>Verified vs remote</div>
      <div className="card" style={{ padding: 16 }}>
        <div className="vbar"><div className="vbar-fill" style={{ width: `${verifiedPct}%` }} /></div>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 7 }}><b style={{ color: "var(--good,#3a9d5d)" }}>{verifiedPct}% verified</b> — {verified.toLocaleString()} of {ratings.length.toLocaleString()} recent ratings came from confirmed-present diners (geo/QR).</div>
      </div>

      {topTags.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: 18 }}>What people say</div>
          <div className="card" style={{ padding: 14 }}>
            <div className="itemtags">{topTags.map(([t, n]) => <span className="itemtag" key={t}>{t} · {n}</span>)}</div>
          </div>
        </>
      )}

      {reviews.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: 18 }}>Recent reviews</div>
          <div className="card">
            {reviews.map((r) => (
              <div className="review" key={r.id}>
                <div className="grow">
                  <div className="review-head"><b>{r.item?.name ?? "—"}</b> <span className="review-score tnum">★ {r.score}</span> <span className="muted" style={{ fontSize: 12 }}>· {r.user.displayName ?? "diner"}{r.verified ? " · ✓ verified" : ""}</span></div>
                  {r.tags.length > 0 && <div className="itemtags">{r.tags.map((t) => <span className="itemtag" key={t}>{t}</span>)}</div>}
                  {r.note && <div className="review-note">“{r.note}”</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
