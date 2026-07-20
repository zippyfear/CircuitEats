import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { resolveEventConfig } from "@/lib/config";
import { currentUser, isEventCoordinator } from "@/lib/roles";
import EventClaimButton from "@/components/EventClaimButton";
import PeoplesChoice from "@/components/PeoplesChoice";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await db.event.findUnique({ where: { slug }, include: { appearances: { include: { vendor: true } } } });
  if (!event) notFound();
  const cfg = await resolveEventConfig(slug);
  const me = await currentUser();
  const isCoord = !!me && (await isEventCoordinator(me.id, event.id));
  const canClaim = !!me && !event.organizerUserId;
  const theme = (cfg.theme ?? {}) as { accent?: string; bannerUrl?: string; logoUrl?: string };
  const board = event.appearances.map((a) => a.vendor).sort((x, y) => y.ratingAvg - x.ratingAvg);

  // People's Choice data (§15 #6): categories with ≥2 candidate vendors at this event + live tallies.
  type VCat = { categoryId: string; name: string; myVendorId: string | null; candidates: { vendorId: string; name: string; votes: number }[] };
  let voting: VCat[] = [];
  if (cfg.features.voting) {
    const apps = await db.appearance.findMany({ where: { eventId: event.id }, include: { vendor: { include: { items: { include: { category: true } } } } } });
    const catMap = new Map<string, { id: string; name: string; sortOrder: number; vendors: Map<string, string> }>();
    for (const a of apps) for (const it of a.vendor.items) {
      const c = it.category; if (!c) continue;
      if (!catMap.has(c.id)) catMap.set(c.id, { id: c.id, name: c.name, sortOrder: c.sortOrder, vendors: new Map() });
      catMap.get(c.id)!.vendors.set(a.vendor.id, a.vendor.name);
    }
    const tallies = await db.vote.groupBy({ by: ["categoryId", "vendorId"], where: { eventId: event.id }, _count: { _all: true } });
    const tallyMap = new Map<string, number>();
    for (const t of tallies) tallyMap.set(`${t.categoryId}|${t.vendorId}`, t._count._all);
    const myVotes = me ? await db.vote.findMany({ where: { userId: me.id, eventId: event.id }, select: { categoryId: true, vendorId: true } }) : [];
    const myMap = new Map(myVotes.map((v) => [v.categoryId, v.vendorId]));
    voting = Array.from(catMap.values()).filter((c) => c.vendors.size >= 2).sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({
      categoryId: c.id, name: c.name, myVendorId: myMap.get(c.id) ?? null,
      candidates: Array.from(c.vendors.entries()).map(([vid, name]) => ({ vendorId: vid, name, votes: tallyMap.get(`${c.id}|${vid}`) ?? 0 })).sort((a, b) => b.votes - a.votes),
    }));
  }

  return (
    <main className="wrap">
      <a className="back" href="/">‹ Home</a>
      <div className="ehero" style={{ background: theme.bannerUrl ? `center/cover no-repeat url(${theme.bannerUrl})` : `linear-gradient(135deg, ${theme.accent ?? "#DE7127"}, #3a2415)` }}>
        {theme.logoUrl && <img src={theme.logoUrl} className="elogo" alt="" />}
        <div className="ehero-in">
          <h1>{event.name}</h1>
          <div className="esub">{event.venue}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "12px 0 4px" }}>
        {isCoord && <a className="editlink" href={`/e/${slug}/manage`} style={{ margin: 0 }}>✎ Manage event</a>}
        {canClaim && <EventClaimButton eventId={event.id} />}
      </div>

      <div className="eyebrow">{cfg.vocab.participantPlural} — by rating</div>
      <div className="card">
        {board.map((v, i) => (
          <a className={`row ${i === 0 ? "top" : ""} ${v.ratingAvg < 5 ? "worst" : ""}`} href={`/v/${v.slug}`} key={v.id}>
            <div className="rank">{i + 1}</div>
            <div><div className="v-name">{v.name}</div><div className="v-sub tnum">{v.ratingCount.toLocaleString()} ratings</div></div>
            <div className="score"><div className="bar"><i style={{ width: `${Math.max(4, v.ratingAvg * 10)}%` }} /></div><div className="sc tnum">{v.ratingAvg.toFixed(1)}</div></div>
          </a>
        ))}
      </div>

      {cfg.features.voting && voting.length > 0 && <PeoplesChoice eventId={event.id} data={voting} authed={!!me} />}
    </main>
  );
}
