import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CircuitEats — live ratings across the circuit",
  description: "The reputation network for traveling food vendors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
