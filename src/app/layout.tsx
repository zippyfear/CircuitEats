import "./globals.css";
import type { Metadata } from "next";
import HostPromo from "@/components/HostPromo";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: { default: "CircuitEats — best food on the circuit", template: "%s · CircuitEats" },
  description: "Find the best food at the best events — live, verified ratings that follow every vendor across the circuit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <HostPromo />
      </body>
    </html>
  );
}
