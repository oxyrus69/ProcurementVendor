import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusProcure",
  description: "B2B E-Procurement, Vendor Portal, RFQ Bidding & 3-Way Matching",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">{children}</body>
    </html>
  );
}
