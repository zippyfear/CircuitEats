import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CircuitEats — live ratings across the circuit",
  description: "The reputation network for traveling food vendors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="sitefoot">
          <div className="sitefoot-in">
            <span className="sitefoot-flame">🔥</span>
            <div>
              <div className="sitefoot-lead">Hosting provided by <a href="https://smokestackpit.com" target="_blank" rel="noopener noreferrer">SmokeStack</a></div>
              <div className="sitefoot-blurb">
                SmokeStack is the open-source BBQ platform that turns live pit telemetry into on-time, on-temp cooks — real-time monitoring, smart wrap &amp; pull calls, and an AI pitmaster in your corner.{" "}
                <a href="https://smokestackpit.com" target="_blank" rel="noopener noreferrer">smokestackpit.com&nbsp;↗</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
