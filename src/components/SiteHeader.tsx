import AuthNav from "@/components/AuthNav";

// Global site header — appears on every page via the root layout.
// Brand → home; primary nav (Events / Circuit); auth on the right.
// (Vendors + Search links are added alongside the /vendors + search build.)
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
          <a href="/family">Circuit</a>
        </nav>
        <div className="sh-auth"><AuthNav /></div>
      </div>
    </header>
  );
}
