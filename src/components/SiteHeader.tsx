import AuthNav from "@/components/AuthNav";

// Global site header — appears on every page via the root layout.
// Brand → home; primary nav (Events / Vendors / Circuit); search; auth.
export default function SiteHeader() {
  return (
    <header className="siteheader">
      <div className="siteheader-in">
        <a className="sh-brand" href="/" aria-label="CircuitEats home">
          <span className="flame">🔥</span>
          <span className="sh-name">CircuitEats</span>
        </a>
        <nav className="sh-links">
          <a href="/">Events</a>
          <a href="/vendors">Vendors</a>
          <a href="/family">Circuit</a>
        </nav>
        <form className="sh-search" action="/search" role="search">
          <input type="search" name="q" placeholder="Search…" aria-label="Search vendors and events" />
        </form>
        <div className="sh-auth"><AuthNav /></div>
      </div>
    </header>
  );
}
