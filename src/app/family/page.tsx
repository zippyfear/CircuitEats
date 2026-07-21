import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const NAV: [string, string][] = [["#what", "What it is"], ["#goals", "Goals"], ["#family", "The family"], ["#coming", "What's coming"], ["#about", "About"]];

const GOALS = [
  ["One trustworthy graph", "Ratings backed by real presence — you were actually there (geo + QR) — not anonymous noise. Reputation you can believe."],
  ["Reputation that travels", "A vendor's standing follows them across every event they work. Do great at one fest, and it lifts you everywhere — the best rise across the whole circuit."],
  ["Every kind of event", "Food fests, markets, fairs, cons, crawls — one network, one profile, wherever the circuit goes."],
  ["Free for fans, powerful for vendors", "Rating is always free. Vendors get their reputation, their menu, live rankings, and orders straight to the POS they already run."],
];

const COMING = [
  ["🔴", "Live rankings, everywhere", "Scan, rate, and see who's winning right now — at every event, in every category."],
  ["🧾", "Order ahead to their own POS", "Skip the line — order in Circuit, paid through the vendor's existing Toast/Square. We never touch your card."],
  ["🍷", "Wine & beer crawls", "A different format: rate the venues on environment and staff, not just the food. Your favorite bar's reputation follows it across every crawl."],
  ["🔔", "Follow your favorites", "Get a ping when a vendor you love is booked at an event near you — never miss them again."],
  ["📱", "Circuit in your pocket", "A native app, so the whole circuit travels with you."],
];

export default async function FamilyPage() {
  const all = await db.vertical.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const platform = all.find((v) => v.isPlatform);
  const verticals = all.filter((v) => !v.isPlatform);

  return (
    <>
      <header className="circnav">
        <div className="circnav-in">
          <a href="#top" className="circbrand">{platform?.emoji ?? "🎯"} Circuit</a>
          <nav className="circnav-links">{NAV.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</nav>
          <a href="/" className="circcta">Visit CircuitEats →</a>
        </div>
      </header>

      <main className="wrap" style={{ maxWidth: 900 }} id="top">
        <section className="circhero">
          <div className="fam-emoji">{platform?.emoji ?? "🎯"}</div>
          <h1 style={{ fontSize: 40, letterSpacing: "-.03em", margin: "6px 0 4px" }}>Circuit</h1>
          <div className="fam-tag" style={{ fontSize: 19 }}>{platform?.tagline}</div>
          <p className="muted" style={{ maxWidth: 620, margin: "12px auto 0", lineHeight: 1.6, fontSize: 15.5 }}>
            The reputation network for the event circuit — and the vendors who travel it.
          </p>
        </section>

        <section id="what" className="circsec">
          <div className="eyebrow">What Circuit is</div>
          <p className="circbody">The best food vendors, brewers, makers, and pitmasters don't belong to one event — they work a whole <b>circuit</b> of festivals, fairs, markets, and crawls. Today their reputation resets at every gate. <b>Circuit gives each of them one profile and one reputation that follows them everywhere they go.</b></p>
          <p className="circbody">Fans find the genuinely best food and drink — ranked live, verified by people who were actually there. Vendors carry their name, their awards, and their standing from event to event. It's the reputation graph the circuit never had.</p>
        </section>

        <section id="goals" className="circsec">
          <div className="eyebrow">The goals</div>
          <div className="goalgrid">
            {GOALS.map(([t, d]) => <div className="goalcard" key={t}><b>{t}</b><p className="muted">{d}</p></div>)}
          </div>
        </section>

        <section id="family" className="circsec">
          <div className="eyebrow">The family — one graph, every kind of event</div>
          <div className="famgrid">
            {verticals.map((v) => {
              const live = v.key === "eats";
              return (
                <div className="famcard" key={v.id} style={{ borderTopColor: v.accent }}>
                  <div className="famcard-top"><span className="fam-emoji2">{v.emoji}</span><b style={{ color: v.accent, fontSize: 16 }}>{v.brandName}</b><span className={`fam-badge ${live ? "live" : ""}`}>{live ? "LIVE" : "SOON"}</span></div>
                  <div className="fam-tag2">{v.tagline}</div>
                  <div className="muted fam-blurb">{v.blurb}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="coming" className="circsec">
          <div className="eyebrow">What's yet to come</div>
          <div className="cominglist">
            {COMING.map(([ic, t, d]) => (
              <div className="comingrow" key={t}><span className="coming-ic">{ic}</span><div><b>{t}</b><div className="muted" style={{ fontSize: 13.5, marginTop: 2, lineHeight: 1.55 }}>{d}</div></div></div>
            ))}
          </div>
        </section>

        <section id="about" className="circsec">
          <div className="eyebrow">About us</div>
          <p className="circbody">Circuit started at a Wisconsin rib fest — watching the same great vendors show up fest after fest, their reputation starting from zero every single time. We're building the network that finally carries it with them. Reputation that follows the vendor, across every event on the circuit.</p>
          <p className="muted" style={{ fontSize: 13.5 }}>Proudly hosted by <a href="https://smokestackpit.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-ink)" }}>SmokeStack</a>. CircuitEats is live today; the rest of the family is on its way.</p>
        </section>

        <div className="foot">Reputation that follows the vendor across every event — the <b>Circuit</b> family.</div>
      </main>
    </>
  );
}
