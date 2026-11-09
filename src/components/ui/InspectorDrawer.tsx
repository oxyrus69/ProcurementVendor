"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PanelRightOpen, X } from "lucide-react";

export interface DrawerTab { id: string; label: string; children: ReactNode }

/**
 * Zona E — slide-over inspector: detail entitas tanpa kehilangan konteks tabel,
 * dengan tab ringkasan, riwayat, dan aksi cepat.
 */
export function InspectorDrawer({
  title,
  subtitle,
  trigger = "Inspeksi",
  tabs,
  children,
}: {
  title: string;
  subtitle?: string;
  trigger?: string;
  tabs?: DrawerTab[];
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(tabs?.[0]?.id ?? "ringkasan");

  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  return <>
    <button onClick={() => setOpen(true)} className="btn btn-secondary !min-h-8 !px-2.5 !py-1.5">
      <PanelRightOpen className="size-3.5" aria-hidden="true" />{trigger}
    </button>
    {open && (
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
        <aside role="dialog" aria-modal="true" aria-label={title} className="flex h-full w-full max-w-[520px] flex-col bg-white shadow-xl ring-1 ring-slate-950/5">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-slate-900">{title}</h2>
              {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
            </div>
            <button onClick={() => setOpen(false)} className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800" aria-label="Tutup panel">
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>
          {tabs && tabs.length > 1 && (
            <div className="segmented m-4 mb-0 shrink-0 self-start">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActive(tab.id)} aria-pressed={active === tab.id}>{tab.label}</button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-5">
            {tabs ? tabs.find((tab) => tab.id === active)?.children ?? tabs[0]?.children : children}
          </div>
        </aside>
      </div>
    )}
  </>;
}
