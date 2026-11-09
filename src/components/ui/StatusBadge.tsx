import { humanizeStatus } from "@/lib/format";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const styles: Record<StatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
};

export function toneForStatus(status: string): StatusTone {
  if (/PAID|MATCHED_PASSED|FULLY_RECEIVED|APPROVED$|APPROVED_FOR|CONVERTED|PREFERRED/.test(status) && !/HOLD/.test(status)) return "success";
  if (/TOLERANCE_PASSED|PENDING|EVALUATION|PARTIALLY|PROBATION|OPEN|DRAFT|ISSUED/.test(status)) return "warning";
  if (/HOLD|REJECTED|BLACKLIST|CANCELLED|UNVERIFIED/.test(status)) return "danger";
  if (/AWARDED|ACKNOWLEDGED/.test(status)) return "info";
  return "neutral";
}

const dots: Record<StatusTone, string> = {
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-red-600",
  info: "text-blue-600",
  neutral: "text-slate-400",
};

/** Lencana status dengan label berbahasa Indonesia. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = toneForStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-1 text-[11px] font-semibold ${styles[tone]}`}>
      <span className={`size-1.5 shrink-0 rounded-full bg-current ${dots[tone]}`} aria-hidden="true" />
      {label ?? humanizeStatus(status)}
    </span>
  );
}

/** Dot ringkas untuk baris tabel yang sudah padat. */
export function StatusDot({ status }: { status: string }) {
  const tone = toneForStatus(status);
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-slate-700 ${dots[tone]}`} title={humanizeStatus(status)}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{humanizeStatus(status)}</span>;
}
