import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/roles";
import { followedUpcoming, markNotifsSeen } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const metadata = { title: "Following" };

function fmt(a: Date, b: Date) {
  const o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const s = a.toLocaleDateString("en-US", o), e = b.toLocaleDateString("en-US", o);
  return `${s === e ? s : `${s} – ${e}`}, ${b.getFullYear()}`;
}

export default async function Following() {
  const me = await currentUser();
  if (!me) redirect("/signin");

  const follows = await db.follow.findMany({
    where: { userId: me.id, targetType: "VENDOR", vendorId: { not: null } },
    include: { vendor: true },
    orderBy: { createdAt: "desc" },
  });
  const vendors = follows.map((f) => f.vendor).filter((v): v is NonNullable<typeof v> => !!v);

  // in-app notification feed: followed vendors at upcoming events
  const feed = await followedUpcoming(me.id);
  // viewing the feed clears the bell
  await markNotifsSeen(me.id);

  return (
    <main className="wrap" style={{ maxWidth: 640 }}>
      <a className="back" href="/">‹ Home</a>
      <h1 style={{ fontSize: 24, letterSpacing: "-.02em", margin: "0 0 4px" }}>Following</h1>
      <p className="muted" style={{ marginTop: 0 }}>Vendors you follow — and when they’re next on the circuit.</p>

      <div className="eyebrow">🔔 Coming up</div>
      {feed.length === 0 ? (
        <p className="muted" style={{ margin: "0 0 18px" }}>No upcoming events for the vendors you follow yet.</p>
      ) : (
        <div className="card" style={{ marginBottom: 18 }}>
          {feed.map((a) => (
            <a className="erow" href={`/e/${a.event.slug}`} key={a.id}>
              <div>
                <div className="e-name"><b>{a.vendor.name}</b> is at {a.event.name}</div>
                <div className="e-meta">{a.event.venue ?? ([a.event.city, a.event.region].filter(Boolean).join(", ") || "on the circuit")}</div>
              </div>
              <div className="e-right"><div className="e-dates tnum">{fmt(a.event.startDate, a.event.endDate)}</div></div>
            </a>
          ))}
        </div>
      )}

      <div className="eyebrow">Vendors</div>
      {vendors.length === 0 ? (
        <p className="muted">You’re not following anyone yet. Tap <b>☆ Follow</b> on a vendor page.</p>
      ) : (
        <div className="card">
          {vendors.map((v, i) => (
            <a className={`row ${v.ratingAvg < 5 ? "worst" : ""}`} href={`/v/${v.slug}`} key={v.id}>
              <div className="rank">{i + 1}</div>
              <div><div className="v-name">{v.name}</div><div className="v-sub tnum">{v.homeBase ?? "on the circuit"}</div></div>
              <div className="score"><div className="bar"><i style={{ width: `${Math.max(4, v.ratingAvg * 10)}%` }} /></div><div className="sc tnum">{v.ratingAvg.toFixed(1)}</div></div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
