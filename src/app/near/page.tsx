import { db } from "@/lib/db";
import NearMe, { type NearEvent } from "@/components/NearMe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Near me" };

function fmt(a: Date, b: Date) {
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = a.toLocaleDateString("en-US", o), e = b.toLocaleDateString("en-US", o);
  return `${s === e ? s : `${s} – ${e}`}, ${b.getFullYear()}`;
}

export default async function NearPage() {
  const now = new Date();
  const rows = await db.event.findMany({ where: { status: "ACTIVE" }, include: { _count: { select: { appearances: true } } }, orderBy: { startDate: "desc" } });
  const events: NearEvent[] = rows.map((e) => ({
    id: e.id, slug: e.slug, name: e.name, venue: e.venue, city: e.city, region: e.region,
    lat: e.lat, lng: e.lng, dateLabel: fmt(e.startDate, e.endDate), upcoming: e.endDate >= now, vendors: e._count.appearances,
  }));

  return (
    <main className="wrap">
      <h1 style={{ fontSize: 24, margin: "6px 0 2px", letterSpacing: "-.02em" }}>Near me</h1>
      <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Find events happening close to you across the circuit.</div>
      <NearMe events={events} />
    </main>
  );
}
