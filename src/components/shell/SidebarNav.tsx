"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, FileText, Gavel, Package, Truck, Receipt, Users, Store, ShieldAlert, Settings, History } from "lucide-react";
import type { AppNavigationItem } from "./navigation";

const icons = { dashboard: LayoutDashboard, wallet: Wallet, file: FileText, gavel: Gavel, package: Package, truck: Truck, receipt: Receipt, users: Users, store: Store, shield: ShieldAlert, settings: Settings, history: History };
const badgeTone = { warning: "bg-amber-500 text-white", danger: "bg-red-500 text-white", neutral: "bg-slate-800 text-slate-300" };

export function SidebarNav({ items }: { items: AppNavigationItem[] }) {
  const pathname = usePathname();
  const groups = [...new Set(items.map((item) => item.group))];
  return <nav className="space-y-5" aria-label="Navigasi modul">
    {groups.map((group) => (
      <div key={group}>
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{group}</div>
        <div className="space-y-1">
          {items.filter((item) => item.group === group).map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
            const Icon = icons[item.icon as keyof typeof icons] || FileText;
            const tone = badgeTone[item.badgeTone ?? "neutral"];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors ${active ? "bg-slate-800 font-medium text-white" : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"}`}
              >
                <Icon className={`size-4 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`} aria-hidden="true" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${tone}`}>{item.badge}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    ))}
  </nav>;
}
