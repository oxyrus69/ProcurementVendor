"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CornerDownLeft, Search, X } from "lucide-react";

export interface NavigationItem { href: string; label: string; group?: string; badge?: number }

export function CommandPalette({ items }: { items: NavigationItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = useMemo(
    () => items.filter((item) => `${item.label} ${item.group || ""} ${item.href}`.toLowerCase().includes(query.trim().toLowerCase())),
    [items, query],
  );

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);
  useEffect(() => { setCursor(0); }, [query]);

  const navigate = (href: string) => { setOpen(false); setQuery(""); router.push(href); };

  return <>
    <button
      onClick={() => setOpen(true)}
      className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-slate-50 px-2.5 py-1.5 text-left text-xs text-slate-500 transition-colors hover:border-slate-300 hover:bg-white sm:w-64"
    >
      <Search className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="hidden truncate sm:inline">Cari modul atau dokumen...</span>
      <kbd className="ml-auto hidden rounded border border-[var(--border)] bg-white px-1.5 font-mono text-[10px] text-slate-400 md:inline">Ctrl K</kbd>
    </button>

    {open && (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/30 px-4 pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-label="Navigasi cepat" className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-slate-950/10">
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
            <Search className="size-4 text-slate-400" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, filtered.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
                if (e.key === "Enter" && filtered[cursor]) navigate(filtered[cursor].href);
              }}
              className="h-12 flex-1 border-0 text-[13px] outline-none"
              placeholder="Ketik nama modul atau rute..."
              aria-label="Cari navigasi"
            />
            <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.length ? filtered.map((item, index) => (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                onMouseEnter={() => setCursor(index)}
                className={`group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${index === cursor ? "bg-slate-100" : "hover:bg-slate-50"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-slate-800">{item.label}</div>
                  {item.group && <div className="text-[11px] text-slate-400">{item.group}</div>}
                </div>
                {item.badge !== undefined && <span className="rounded bg-slate-100 px-1.5 font-mono text-[11px] tabular-nums text-slate-600">{item.badge}</span>}
                <ArrowUpRight className={`size-4 ${index === cursor ? "text-blue-600" : "text-slate-300"}`} aria-hidden="true" />
              </button>
            )) : <div className="px-4 py-8 text-center text-[13px] text-slate-500">Tidak ada modul yang cocok dengan “{query}”.</div>}
          </div>
          <footer className="flex items-center justify-between border-t border-[var(--border)] bg-slate-50 px-4 py-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5"><CornerDownLeft className="size-3" aria-hidden="true" />Enter buka · ↑↓ navigasi</span>
            <span>Esc tutup</span>
          </footer>
        </section>
      </div>
    )}
  </>;
}
