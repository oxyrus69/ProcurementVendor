"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { AppNavigationItem } from "../shell/navigation";

export function MobileNav({ items }: { items: AppNavigationItem[] }) {
  const [open, setOpen] = useState(false);
  const groups = [...new Set(items.map((item) => item.group))];
  return <>
    <button onClick={() => setOpen(true)} className="rounded-md border border-[var(--border)] bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50 md:hidden" aria-label="Buka navigasi">
      <Menu className="size-4" aria-hidden="true" />
    </button>
    {open && (
      <div className="fixed inset-0 z-50 bg-slate-950/35" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
        <aside className="h-full w-72 max-w-[85vw] overflow-y-auto bg-slate-950 p-4 text-slate-300 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">NexusProcure</div>
              <div className="text-[11px] text-slate-500">Source-to-Pay Console</div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800" aria-label="Tutup navigasi">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <nav className="space-y-5" aria-label="Navigasi modul">
            {groups.map((group) => (
              <div key={group}>
                <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{group}</div>
                <div className="space-y-1">
                  {items.filter((item) => item.group === group).map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-md px-3 py-2.5 text-[13px] transition-colors hover:bg-slate-800 hover:text-white">
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined && <span className="rounded bg-slate-800 px-1.5 font-mono text-[10px] font-semibold tabular-nums">{item.badge}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>
      </div>
    )}
  </>;
}
