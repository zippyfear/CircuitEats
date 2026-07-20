import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function Following() {
  const me = await currentUser();
  if (!me) redirect("/signin");
  const follows = await db.follow.findMany({
    where: { userId: me.id, targetType: "VENDOR", vendorId: { not: null } },
    include: { vendor: true },
    orderBy: { createdAt: "desc" },
  });
  const vendors = follows.map((f) => f.vendor).filter((v): v is NonNullable<typeof v> => !!v);

  return (
    <main className="wrap" style={{ maxWidth: 640 }}>
      <a className="back" href="/">‹ Home</a>
      <h1 style={{ fontSize: 24, letterSpacing: "-.02em", margin: "0 0 4px" }}>Following</h1>
      <p className="muted" style={{ marginTop: 0 }}>Vendors you follow — we&apos;ll surface when they&apos;re at an event near you.</p>
      {vendors.length === 0 ? (
        <p className="muted">You&apos;re not following anyone yet. Tap <b>☆ Follow</b> on a vendor page.</p>
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
