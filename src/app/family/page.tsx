import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const all = await db.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const platform = all.find((v) => v.isPlatform);
  const verticals = all.filter((v) => !v.isPlatform);

  return (
    <main className="wrap" style={{ maxWidth: 900 }}>
      <a className="back" href="/">‹ CircuitEats</a>

      <div className="famhero">
        <div className="fam-emoji">{platform?.emoji ?? "🎯"}</div>
        <h1 style={{ fontSize: 34, letterSpacing: "-.03em", margin: "6px 0 2px" }}>{platform?.brandName ?? "Circuit"}</h1>
        <div className="fam-tag">{platform?.tagline}</div>
        <p className="muted" style={{ maxWidth: 560, margin: "8px auto 0", lineHeight: 1.6 }}>{platform?.blurb}</p>
      </div>

      <div className="eyebrow" style={{ marginTop: 22 }}>The family — one reputation graph, every kind of event</div>
      <div className="famgrid">
        {verticals.map((v) => {
          const live = v.key === "eats";
          return (
            <div className="famcard" key={v.id} style={{ borderTopColor: v.accent }}>
              <div className="famcard-top">
                <span className="fam-emoji2">{v.emoji}</span>
                <b style={{ color: v.accent, fontSize: 16 }}>{v.brandName}</b>
                <span className={`fam-badge ${live ? "live" : ""}`}>{live ? "LIVE" : "SOON"}</span>
              </div>
              <div className="fam-tag2">{v.tagline}</div>
              <div className="muted fam-blurb">{v.blurb}</div>
            </div>
          );
        })}
      </div>

      <div className="foot">Reputation that follows the vendor across every event — the <b>Circuit</b> family.</div>
    </main>
  );
}
