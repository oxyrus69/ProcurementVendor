import type { ReactNode } from "react";

/**
 * Panel seksi standar (Zona B): judul ringkas, deskripsi satu baris,
 * aksi opsional di kanan, dan badan yang bisa diisi tabel atau form.
 */
export function SectionPanel({
  title,
  description,
  actions,
  children,
  bodyClassName = "p-4",
  bare,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  bare?: boolean;
}) {
  return (
    <section className="panel overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 max-w-2xl text-[11px] leading-4 text-slate-500">{description}</p>}
        </div>
        {actions && <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {bare ? children : <div className={bodyClassName}>{children}</div>}
    </section>
  );
}

/** Baris definisi label/nilai yang rapi untuk dokumen dan inspector. */
export function FieldList({
  items,
  columns = 1,
}: {
  items: { label: string; value: ReactNode; mono?: boolean }[];
  columns?: 1 | 2;
}) {
  return (
    <dl className={columns === 2 ? "grid gap-x-8 sm:grid-cols-2" : undefined}>
      {items.map((item) => (
        <div key={item.label} className="dl-row">
          <dt>{item.label}</dt>
          <dd className={item.mono ? "font-mono tabular-nums" : undefined}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface TimelineEntry {
  title: string;
  detail?: string;
  at?: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}

/** Riwayat kronologis dokumen: sumber kebenaran siapa melakukan apa dan kapan. */
export function TimelineList({ items }: { items: TimelineEntry[] }) {
  if (!items.length) return <p className="px-1 py-3 text-[12px] text-slate-400">Belum ada aktivitas tercatat.</p>;
  return (
    <ol className="timeline">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className="timeline-item" data-tone={item.tone ?? "neutral"}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[12px] font-semibold text-slate-800">{item.title}</span>
            {item.at && <span className="font-mono text-[10px] tabular-nums text-slate-400">{item.at}</span>}
          </div>
          {item.detail && <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{item.detail}</p>}
        </li>
      ))}
    </ol>
  );
}

/** Sel kosong agar tabel tetap terbaca dengan lebar kolom yang benar. */
export function EmptyCell({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-[12px] text-slate-400">
        {message}
      </td>
    </tr>
  );
}

/** Baris metrik ringkas di dalam panel, dipakai untuk ringkasan finansial. */
export function MetricRows({
  items,
}: {
  items: { label: string; value: string; emphasis?: boolean; tone?: "neutral" | "success" | "warning" | "danger" }[];
}) {
  const toneClass = {
    neutral: "text-slate-900",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-red-700",
  } as const;
  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
          <span className="text-[12px] text-slate-500">{item.label}</span>
          <span
            className={`font-mono text-[13px] font-semibold tabular-nums ${item.emphasis ? toneClass[item.tone ?? "neutral"] : "text-slate-700"}`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Bilah utilisasi horizontal dengan ambang warna yang konsisten. */
export function UtilisationBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(pct, 100));
  const tone = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-600">{pct.toFixed(0)}%</span>
    </div>
  );
}
