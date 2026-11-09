import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk · NexusProcure",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--canvas)]">{children}</div>;
}
