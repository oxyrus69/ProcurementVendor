"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";

export interface GridFilter { label: string; value: string; count: number }

/**
 * EnterpriseDataGrid (Zona D2): toolbar pencarian, filter chip berhitung,
 * pengatur kerapatan, ekspor CSV, tabel padat, dan footer ringkasan agregat.
 * Pemfilteran berjalan pada baris yang sudah dirender server agar tetap murah.
 */
export function EnterpriseDataGrid({
  children,
  count,
  totalLabel,
  exportHref,
  filters = [],
  searchPlaceholder = "Cari nomor, vendor, atau status...",
  emptyMessage = "Tidak ada data yang cocok dengan filter aktif.",
  actions,
}: {
  children: ReactNode;
  count: number;
  totalLabel?: string;
  exportHref?: string;
  filters?: GridFilter[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  actions?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(count);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    const rows = tableRef.current?.querySelectorAll<HTMLTableRowElement>("tbody tr[data-row]");
    const needle = query.trim().toLowerCase();
    let shown = 0;
    rows?.forEach((row) => {
      const text = (row.textContent || "").toLowerCase();
      const matchesText = !needle || text.includes(needle);
      const matchesStatus = !status || (row.dataset.status || "").toUpperCase() === status.toUpperCase();
      const show = matchesText && matchesStatus;
      row.hidden = !show;
      if (show) shown += 1;
    });
    setVisible(shown);
  }, [query, status, children, count]);

  const active = Boolean(query.trim()) || Boolean(status);
  const reset = () => { setQuery(""); setStatus(null); };

  return (
    <section className={`panel overflow-hidden ${compact ? "density-compact" : ""}`}>
      <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-slate-50/70 p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="field pl-9 pr-9"
              placeholder={searchPlaceholder}
              aria-label="Cari dalam tabel"
            />
            {query ? (
              <button onClick={() => setQuery("")} className="absolute right-2.5 top-2 rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Bersihkan pencarian">
                <X className="size-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-3 top-2.5 hidden rounded border border-[var(--border)] bg-white px-1.5 font-mono text-[10px] text-slate-400 sm:block">/</kbd>
            )}
          </div>

          {filters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pb-0.5" role="group" aria-label="Filter status">
              <button onClick={() => setStatus(null)} aria-pressed={!status} className="chip">
                Semua<span className="chip-count">{count}</span>
              </button>
              {filters.map((filter) => (
                <button key={filter.value} onClick={() => setStatus((v) => (v === filter.value ? null : filter.value))} aria-pressed={status === filter.value} className="chip">
                  {filter.label}<span className="chip-count">{filter.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="no-print flex shrink-0 items-center gap-2">
          {actions}
          <button onClick={() => setCompact((v) => !v)} className="btn btn-secondary !min-h-8 !px-2.5 !py-1.5" aria-pressed={compact}>
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />{compact ? "Standar" : "Ringkas"}
          </button>
          {exportHref && (
            <Link href={exportHref} className="btn btn-secondary !min-h-8 !px-2.5 !py-1.5">
              <Download className="size-3.5" aria-hidden="true" />CSV
            </Link>
          )}
        </div>
      </div>

      <div ref={tableRef} className="overflow-x-auto">
        {children}
        {active && visible === 0 && (
          <p className="border-t border-[var(--border)] px-4 py-10 text-center text-[13px] text-slate-500">{emptyMessage}</p>
        )}
      </div>

      <footer className="flex flex-col gap-1 border-t border-[var(--border)] bg-slate-50/60 px-4 py-2.5 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {active ? <><span className="font-mono tabular-nums text-slate-700">{visible}</span> dari <span className="font-mono tabular-nums">{count}</span> baris cocok</> : <>Menampilkan <span className="font-mono tabular-nums">{count}</span> baris data</>}
          {active && <button onClick={reset} className="ml-2 font-semibold text-[var(--interactive)] hover:underline">atur ulang</button>}
        </span>
        {totalLabel && <span className="font-mono tabular-nums text-slate-700">{totalLabel}</span>}
      </footer>
    </section>
  );
}

/** Ringkasan agregat kecil (Zona D1) yang dipakai di atas grid. */
export function GridSummary({ items }: { items: { label: string; value: string; tone?: "neutral" | "warning" | "danger" | "success" }[] }) {
  const tone = { neutral: "text-slate-900", warning: "text-amber-700", danger: "text-red-700", success: "text-emerald-700" };
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-[var(--border)] bg-white px-4 py-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{item.label}</span>
          <span className={`metric-value text-[15px] font-semibold ${tone[item.tone ?? "neutral"]}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function useGridMemo<T>(factory: () => T, deps: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}
