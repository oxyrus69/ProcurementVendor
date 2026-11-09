import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dokumen · NexusProcure",
};

/**
 * Dokumen A4 berdiri sendiri: tanpa sidebar, topbar, maupun padding aplikasi.
 * Seluruh dekorasi shell disembunyikan oleh aturan @media print pada globals.css.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100 py-6">{children}</div>;
}
