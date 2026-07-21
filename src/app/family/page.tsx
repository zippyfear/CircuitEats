import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const NAV: [string, string][] = [["#what", "What it is"], ["#market", "Market"], ["#model", "Model"], ["#numbers", "Projections"], ["#family", "The family"], ["#roadmap", "Roadmap"], ["#about", "About"]];

const GOALS = [
  ["One trustworthy graph", "Ratings backed by real presence — you were actually there (geo + QR), not anonymous noise."],
  ["Reputation that travels", "A vendor's standing follows them across every event they work — the best rise across the whole circuit."],
  ["Every kind of event", "Food fests, markets, fairs, cons, crawls — one network, one profile."],
  ["Free for fans, powerful for vendors", "Rating is free. Vendors get reputation, menu, live rankings, and orders to the POS they already run."],
];

// ── projection model (illustrative — pre-revenue; assumptions stated on-page) ──
const YEARS = ["Yr 1", "Yr 2", "Yr 3", "Yr 4", "Yr 5"];
const VENUES = [10, 100, 500, 2000, 6000];
const EVENTS = [50, 300, 1500, 5000, 15000];
const GMV = [10, 65, 300, 1100, 3500];       // $M order volume through Circuit
const REVENUE = [0.15, 0.9, 4.2, 15, 44];     // $M — 1% take + subs + event fees
const FANS = [0.03, 0.2, 0.9, 3, 10];         // M rating users
const MARKETSIZE = [{ label: "TAM", sub: "US event + venue F&B GMV", value: 32 }, { label: "SAM", sub: "food/drink fests + indie venues", value: 8 }, { label: "SOM", sub: "Yr-5 capture", value: 3.5 }]; // $B

function BarChart({ vals, labels, unit = "", prefix = "" }: { vals: number[]; labels: string[]; unit?: string; prefix?: string }) {
  const w = 580, h = 200, pad = 30, max = Math.max(...vals), bw = (w - pad * 2) / vals.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="200" style={{ display: "block" }}>
      {vals.map((v, i) => {
        const bh = max ? (v / max) * (h - pad * 2) : 0, x = pad + i * bw, y = h - pad - bh;
        return (
          <g key={i}>
            <rect x={x + bw * 0.16} y={y} width={bw * 0.68} height={bh} rx="5" fill="var(--accent)" />
            <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--ink)">{prefix}{v}{unit}</text>
            <text x={x + bw / 2} y={h - pad + 15} textAnchor="middle" fontSize="11" fill="var(--muted)">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function AreaChart({ vals, labels, unit = "", prefix = "" }: { vals: number[]; labels: string[]; unit?: string; prefix?: string }) {
  const w = 580, h = 200, pad = 30, max = Math.max(...vals), min = 0;
  const step = (w - pad * 2) / (vals.length - 1);
  const pts = vals.map((v, i) => [pad + i * step, h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="200" style={{ display: "block" }}>
      <path d={area} fill="var(--accent-soft)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3.5" fill="var(--accent-ink)" />
          <text x={p[0]} y={p[1] - 9} textAnchor="middle" fontSize="11.5" fontWeight="800" fill="var(--ink)">{prefix}{vals[i]}{unit}</text>
          <text x={p[0]} y={h - pad + 15} textAnchor="middle" fontSize="11" fill="var(--muted)">{labels[i]}</text>
        </g>
      ))}
    </svg>
  );
}

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
          <p className="muted" style={{ maxWidth: 620, margin: "12px auto 0", lineHeight: 1.6, fontSize: 15.5 }}>The reputation network for the event circuit — and the vendors who travel it. Free ratings build the network; a 1% take on ordering turns it into a business.</p>
        </section>

        <section id="what" className="circsec">
          <div className="eyebrow">What Circuit is</div>
          <p className="circbody">The best food vendors, brewers, and makers don't belong to one event — they work a whole <b>circuit</b> of festivals, fairs, markets, and crawls, and today their reputation resets at every gate. <b>Circuit gives each of them one profile and one reputation that follows them everywhere.</b> Fans find the genuinely best food and drink, ranked live and verified by people who were actually there.</p>
          <div className="goalgrid" style={{ marginTop: 14 }}>
            {GOALS.map(([t, d]) => <div className="goalcard" key={t}><b>{t}</b><p className="muted">{d}</p></div>)}
          </div>
        </section>

        <section id="market" className="circsec">
          <div className="eyebrow">The opportunity</div>
          <div className="statgrid" style={{ margin: "6px 0 14px" }}>
            <div className="statbox"><div className="statnum">$1.3T</div><div className="statlabel">global events market (2025 → $2.5T by 2035)</div></div>
            <div className="statbox"><div className="statnum">$40–75</div><div className="statlabel">on-site F&amp;B spend per festival attendee</div></div>
            <div className="statbox"><div className="statnum">30k+</div><div className="statlabel">US food, drink &amp; music festivals a year</div></div>
          </div>
          <p className="circbody">Every one of those dollars flows through *someone's* ordering rail. Circuit's play: be that rail across the whole circuit — many venues × many events — and take <b>~1% of every order.</b> 1% of a huge, growing GMV dwarfs any subscription.</p>
          <div className="eyebrow" style={{ marginTop: 16 }}>Market sizing ($B of order GMV)</div>
          <div className="card" style={{ padding: "16px 14px 8px" }}><BarChart vals={MARKETSIZE.map((m) => m.value)} labels={MARKETSIZE.map((m) => m.label)} prefix="$" unit="B" /></div>
          <div className="marketkey">{MARKETSIZE.map((m) => <div key={m.label}><b>{m.label}</b> · {m.sub}</div>)}</div>
        </section>

        <section id="model" className="circsec">
          <div className="eyebrow">How Circuit makes money</div>
          <p className="circbody">Ratings stay <b>free</b> — they're the distribution and the moat. The money is a <b>marketplace take on ordering:</b></p>
          <div className="cominglist">
            <div className="comingrow"><span className="coming-ic">①</span><div><b>~1% of every order</b><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Guests order in Circuit, paid through the venue's own POS (Toast/Square) — we never touch a card, we meter the GMV and bill 1%. The money-maker.</div></div></div>
            <div className="comingrow"><span className="coming-ic">②</span><div><b>Venue subscriptions</b><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>A flat fee for the ordering + live-rankings + analytics product (~$99/mo).</div></div></div>
            <div className="comingrow"><span className="coming-ic">③</span><div><b>Coordinator white-label + promoted placement</b><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Branded event pages for organizers; sponsored slots via the built-in CTR ad engine.</div></div></div>
          </div>
          <div className="eyebrow" style={{ marginTop: 16 }}>Unit economics (grounded in real numbers)</div>
          <div className="goalgrid">
            <div className="goalcard"><b>Per festival</b><p className="muted">30,000 attendees × $50 F&amp;B = <b>$1.5M</b> event GMV. As the ordering rail at even 20% adoption → $300K × 1% = <b>~$3,000 / event</b> (up to $15K at full adoption).</p></div>
            <div className="goalcard"><b>Per venue / month</b><p className="muted">$20K/mo ordered through Circuit × 1% = $200 + $99 sub = <b>~$300 / venue / mo</b> ≈ $3.6K/yr — recurring, and it compounds with every venue added.</p></div>
          </div>
        </section>

        <section id="numbers" className="circsec">
          <div className="eyebrow">The projections</div>
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 0 }}>Illustrative 5-year model — the company is pre-revenue. Assumptions: venues 10→6,000, events 50→15,000/yr, ~$20K/mo GMV per venue + $50/attendee per event, ~1% take + subs + event fees. Numbers show what the 1%-of-GMV model can build at scale, not committed forecasts.</p>

          <div className="eyebrow" style={{ marginTop: 14 }}>Revenue ($M / yr)</div>
          <div className="card" style={{ padding: "16px 14px 8px" }}><BarChart vals={REVENUE} labels={YEARS} prefix="$" unit="M" /></div>

          <div className="eyebrow" style={{ marginTop: 16 }}>Order GMV processed ($M / yr)</div>
          <div className="card" style={{ padding: "16px 14px 8px" }}><AreaChart vals={GMV} labels={YEARS} prefix="$" unit="M" /></div>

          <div className="chart2">
            <div><div className="eyebrow">Venues on platform</div><div className="card" style={{ padding: "14px 12px 6px" }}><BarChart vals={VENUES} labels={YEARS} /></div></div>
            <div><div className="eyebrow">Rating fans (millions)</div><div className="card" style={{ padding: "14px 12px 6px" }}><AreaChart vals={FANS} labels={YEARS} unit="M" /></div></div>
          </div>

          <div className="card" style={{ marginTop: 16, overflow: "hidden" }}>
            <table className="promotbl">
              <thead><tr><th>Metric</th>{YEARS.map((y) => <th key={y}>{y}</th>)}</tr></thead>
              <tbody>
                <tr><td>Venues</td>{VENUES.map((v, i) => <td key={i} className="tnum">{v.toLocaleString()}</td>)}</tr>
                <tr><td>Events / yr</td>{EVENTS.map((v, i) => <td key={i} className="tnum">{v.toLocaleString()}</td>)}</tr>
                <tr><td>Order GMV</td>{GMV.map((v, i) => <td key={i} className="tnum">${v}M</td>)}</tr>
                <tr className="win"><td><b>Revenue</b></td>{REVENUE.map((v, i) => <td key={i} className="tnum"><b>${v}M</b></td>)}</tr>
                <tr><td>Fans</td>{FANS.map((v, i) => <td key={i} className="tnum">{v}M</td>)}</tr>
              </tbody>
            </table>
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

        <section id="roadmap" className="circsec">
          <div className="eyebrow">Roadmap to get there</div>
          <div className="cominglist">
            <div className="comingrow"><span className="coming-ic">✅</span><div><b>Built — the reputation engine</b><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Verified ratings, live rankings, moderation, vendor analytics, ordering with POS-handoff (mock), a deep multi-event demo across the real rib &amp; chili circuit.</div></div></div>
            <div className="comingrow"><span className="coming-ic">🔜</span><div><b>Now — production-ready + first pilot</b><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Hosting, real auth, a live venue (East Troy Brewery) — ranks its beers, orders to its Toast, joins wine/beer crawls.</div></div></div>
            <div className="comingrow"><span className="coming-ic">🚀</span><div><b>Next — Toast connector + the 1% take, then scale</b><div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>Turn on real ordering revenue, add crawls + more focuses, follow→notify, native app, and expand the family across every event kind.</div></div></div>
          </div>
        </section>

        <section id="about" className="circsec">
          <div className="eyebrow">About us</div>
          <p className="circbody">Circuit started at a Wisconsin rib fest — watching the same great vendors show up fest after fest, their reputation starting from zero every time. We're building the network that finally carries it with them.</p>
          <p className="muted" style={{ fontSize: 13.5 }}>Proudly hosted by <a href="https://smokestackpit.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-ink)" }}>SmokeStack</a>. CircuitEats is live today; the rest of the family is on its way.</p>
        </section>

        <div className="foot">Reputation that follows the vendor across every event — the <b>Circuit</b> family.</div>
      </main>
    </>
  );
}
