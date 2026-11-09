import type { ReactNode } from "react";
import Link from "next/link";

/** Panel D2 yang kosong, dengan ajakan yang bisa ditindaklanjuti. */
export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg border border-[var(--border)] bg-slate-50 text-slate-400">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></svg>
      </div>
      <div>
        <h3 className="text-[13px] font-semibold text-slate-800">{title}</h3>
        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{detail}</p>
      </div>
      {action && <Link href={action.href} className="btn btn-secondary !min-h-8">{action.label}</Link>}
    </div>
  );
}

/** Baris aksi dalam satu tabel: primer opsional + tautan detail. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="no-print flex flex-wrap items-center justify-end gap-1.5">{children}</div>;
}

/** Tombol aksi inline pada baris tabel (server action via form). */
export function RowActionButton({ label, variant = "secondary", title }: { label: string; variant?: "primary" | "secondary" | "success"; title?: string }) {
  return <button className={`btn btn-${variant} !min-h-7 !px-2 !py-1 !text-[11px]`} title={title}>{label}</button>;
}

/** Kotak informasi kontekstual (aturan bisnis, toleransi, dsb). */
export function NotePanel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="inset px-4 py-3">
      {title && <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</div>}
      <div className="text-xs leading-5 text-slate-600">{children}</div>
    </div>
  );
}
