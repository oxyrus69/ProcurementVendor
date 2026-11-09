import type { ReactNode } from "react";
import { ViewTabs, type ViewTab } from "./ViewTabs";

/**
 * Zona C — contextual sub-header: judul tegas, lencana jumlah, deskripsi satu baris,
 * segmented view switcher, dan tombol sekunder/primer di kanan.
 */
export function PageHeader({
  title,
  description,
  count,
  countLabel = "data",
  tabs = [],
  actions,
  secondaryActions,
  children,
}: {
  title: string;
  description: string;
  count?: number;
  countLabel?: string;
  tabs?: ViewTab[];
  actions?: ReactNode;
  secondaryActions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)] pb-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">{title}</h1>
            {count !== undefined && (
              <span className="rounded border border-[var(--border)] bg-white px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums text-slate-600">
                {count} {countLabel}
              </span>
            )}
          </div>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-500">{description}</p>
          {children}
        </div>
        <div className="no-print flex shrink-0 flex-wrap items-center gap-2">
          {secondaryActions}
          {actions}
        </div>
      </div>
      <ViewTabs tabs={tabs} />
    </div>
  );
}
