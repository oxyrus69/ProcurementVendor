import { formatCompactRupiah, formatRupiah } from "@/lib/format";

/**
 * Grafik SVG + tabel matriks angka di bawahnya (selalu terbaca layar baca & cetak A4).
 */
export function ChartCardWithDataMatrix({
  title,
  description,
  rows,
  unit = "rupiah",
  highlight,
}: {
  title: string;
  description: string;
  rows: { label: string; value: number; display?: string }[];
  unit?: "rupiah" | "number";
  highlight?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  const fmt = (n: number) => (unit === "rupiah" ? formatCompactRupiah(n) : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n));
  const full = (n: number) => (unit === "rupiah" ? formatRupiah(n) : new Intl.NumberFormat("id-ID").format(n));

  return (
    <section className="panel overflow-hidden">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</div>
          <div className="metric-value text-[13px] font-semibold text-slate-900">{fmt(total)}</div>
        </div>
      </header>
      <div className="p-4">
        <svg viewBox="0 0 640 180" className="h-44 w-full" role="img" aria-label={`${title}. ${description}`}>
          {[0, 1, 2, 3].map((i) => <line key={i} x1="44" x2="636" y1={i * 44 + 4} y2={i * 44 + 4} stroke="#e2e8f0" strokeDasharray="4 4" />)}
          <text x="40" y="12" textAnchor="end" fontSize="9" fill="#94a3b8">{fmt(max)}</text>
          <text x="40" y="148" textAnchor="end" fontSize="9" fill="#94a3b8">0</text>
          {rows.map((row, i) => {
            const width = rows.length ? 500 / rows.length : 100;
            const height = (row.value / max) * 132;
            const x = 50 + i * width;
            const isHighlight = highlight === row.label;
            return (
              <g key={row.label}>
                <rect x={x} y={140 - height} width={Math.max(width - 18, 12)} height={height} rx="3" fill={isHighlight ? "#0f172a" : "#2563eb"} opacity={isHighlight ? 1 : 0.82} />
                <text x={x + Math.max(width - 18, 12) / 2} y="160" textAnchor="middle" fontSize="10" fill="#64748b">{row.label.length > 12 ? `${row.label.slice(0, 11)}…` : row.label}</text>
              </g>
            );
          })}
        </svg>
        <table className="mt-2 w-full text-xs">
          <caption className="sr-only">{title} — data lengkap</caption>
          <thead>
            <tr className="border-y border-[var(--border)] text-left text-slate-500">
              <th className="py-2 font-medium">{unit === "rupiah" ? "Divisi" : "Kategori"}</th>
              <th className="py-2 text-right font-medium">Nilai</th>
              <th className="py-2 text-right font-medium">Porsi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-slate-100 last:border-0">
                <td className="py-2 text-slate-600">{row.label}</td>
                <td className="py-2 text-right font-mono tabular-nums text-slate-800">{row.display ?? full(row.value)}</td>
                <td className="py-2 text-right font-mono tabular-nums text-slate-500">{total > 0 ? `${((row.value / total) * 100).toFixed(1)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
