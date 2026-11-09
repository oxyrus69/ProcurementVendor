import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Kartu KPI empat lapis: label, nilai tabular-nums, delta/sparkline, konteks target.
 */
export function KpiStatCard({
  label,
  value,
  footer,
  hint,
  delta,
  trend = "neutral",
  series,
  tone = "neutral",
}: {
  label: string;
  value: string;
  footer?: string;
  hint?: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  series?: number[];
  tone?: "neutral" | "warning" | "danger" | "success";
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const spark = series && series.length > 1 ? series : undefined;
  const max = spark ? Math.max(...spark) : 0;
  const min = spark ? Math.min(...spark) : 0;
  const points = spark ? spark.map((n, i) => `${(i / (spark.length - 1)) * 64},${22 - ((n - min) / Math.max(max - min, 1)) * 18}`).join(" ") : "";
  const accent = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : "text-[var(--interactive)]";
  return (
    <article className="panel flex flex-col overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
          {hint && <span className="shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] text-slate-400" title={hint}>?</span>}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="metric-value min-w-0 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{value}</div>
          {spark && (
            <svg width="64" height="24" viewBox="0 0 64 24" role="img" aria-label={`Tren ${label}`} className={`shrink-0 ${accent}`}>
              <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        {delta && (
          <div className="mt-2.5 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${trend === "up" ? "bg-emerald-50 text-emerald-700" : trend === "down" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
              <TrendIcon className="size-3" aria-hidden="true" />{delta}
            </span>
            {footer && <span className="min-w-0 truncate text-[11px] text-slate-500">{footer}</span>}
          </div>
        )}
      </div>
      {footer && !delta && <div className="mt-auto border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] leading-4 text-slate-500">{footer}</div>}
    </article>
  );
}

/** Strip KPI horizontal yang konsisten di semua modul. */
export function KpiStrip({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
