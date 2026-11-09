import Link from "next/link";
import { ArrowRight, ShieldAlert, Activity, History } from "lucide-react";

export interface RailAlert { title: string; detail: string; href?: string; hrefLabel?: string; tone?: "warning" | "danger"; metric?: string }
export interface RailAudit { action: string; entity: string; actor?: string; at?: string; tone?: "success" | "warning" | "danger" | "info" }

const alertTone = { warning: "bg-amber-500", danger: "bg-red-500" };

/** Zona D3 — rail telemetri: rekomendasi DSS, kesehatan proses, aliran aktivitas. */
export function TelemetryAndDssRail({ alerts, audits, health }: { alerts: RailAlert[]; audits: RailAudit[]; health: { label: string; value: number; tone: "success" | "warning" | "danger" }[] }) {
  const total = Math.max(health.reduce((sum, item) => sum + item.value, 0), 1);
  const color = { success: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-red-500" };
  return (
    <aside className="space-y-4">
      <section className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <ShieldAlert className="size-4 text-amber-600" aria-hidden="true" />
          <h2 className="text-[13px] font-semibold text-slate-900">Rekomendasi DSS</h2>
          {alerts.length > 0 && <span className="ml-auto rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-amber-700">{alerts.length}</span>}
        </div>
        <div className="divide-y divide-slate-100">
          {alerts.length ? alerts.slice(0, 4).map((alert, i) => (
            <div key={i} className="p-4">
              <div className="flex gap-2.5">
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${alertTone[alert.tone ?? "warning"]}`} aria-hidden="true" />
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-[13px] font-medium text-slate-800">{alert.title}</h3>
                    {alert.metric && <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-slate-700">{alert.metric}</span>}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{alert.detail}</p>
                  {alert.href && (
                    <Link href={alert.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--interactive)] hover:underline">
                      {alert.hrefLabel ?? "Tinjau"} <ArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )) : <p className="p-4 text-xs leading-5 text-slate-500">Tidak ada anomali yang memerlukan tindakan. Semua ambang batas berada di dalam toleransi.</p>}
        </div>
      </section>

      <section className="panel p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-slate-900">Kesehatan proses</h2>
          <Activity className="size-4 text-slate-400" aria-hidden="true" />
        </div>
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Distribusi status dokumen">
          {health.map((item) => <div key={item.label} className={color[item.tone]} style={{ width: `${(item.value / total) * 100}%` }} title={`${item.label}: ${item.value}`} />)}
        </div>
        <div className="mt-3 space-y-2">
          {health.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-500"><span className={`size-2 rounded-full ${color[item.tone]}`} aria-hidden="true" />{item.label}</span>
              <span className="font-mono font-semibold tabular-nums text-slate-800">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <h2 className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3 text-[13px] font-semibold text-slate-900">
          <History className="size-4 text-slate-400" aria-hidden="true" />Aktivitas terbaru
        </h2>
        <div className="p-4">
          {audits.length ? (
            <ol className="timeline">
              {audits.slice(0, 6).map((audit, i) => (
                <li key={i} className="timeline-item" data-tone={audit.tone ?? "neutral"}>
                  <div className="font-mono text-[11px] font-semibold text-slate-700">{audit.action}</div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">{audit.entity}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
                    {audit.actor && <span className="truncate">{audit.actor}</span>}
                    {audit.at && <time className="shrink-0">{audit.at}</time>}
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="text-xs text-slate-500">Belum ada aktivitas tercatat pada periode ini.</p>}
        </div>
      </section>
    </aside>
  );
}
