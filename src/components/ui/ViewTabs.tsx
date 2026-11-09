"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ViewTab { href: string; label: string; count?: number }

/** Segmented view switcher yang menandai rute aktif (Zona C). */
export function ViewTabs({ tabs }: { tabs: ViewTab[] }) {
  const pathname = usePathname();
  if (tabs.length < 2) return null;
  return (
    <div className="no-print mt-4 overflow-x-auto">
      <div className="segmented" role="group" aria-label="Pilih tampilan">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== "/admin" && pathname.startsWith(`${tab.href}/`));
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} data-active={active ? "true" : undefined}>
              {tab.label}
              {tab.count !== undefined && <span className="ml-1.5 font-mono text-[10px] tabular-nums opacity-70">{tab.count}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
