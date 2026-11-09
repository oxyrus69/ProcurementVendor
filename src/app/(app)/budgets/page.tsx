import Link from "next/link";
import { ArrowRight, Landmark, Percent, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { TelemetryAndDssRail } from "@/components/ui/TelemetryAndDssRail";
import { MetricRows, SectionPanel, UtilisationBar } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { getBudgetBundle } from "@/server/services/moduleData";
import { getDashboardData } from "@/server/services/dashboard";
import { formatCompactRupiah, formatNumber, formatPercent, formatRupiah, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const [budgets, dashboard] = await Promise.all([getBudgetBundle(), getDashboardData()]);

  const totals = budgets.reduce(
    (acc, b) => ({
      allocated: acc.allocated + b.allocated,
      committed: acc.committed + b.committed,
      spent: acc.spent + b.spent,
      available: acc.available + b.available,
      poValue: acc.poValue + b.poValue,
    }),
    { allocated: 0, committed: 0, spent: 0, available: 0, poValue: 0 },
  );
  const utilisation = totals.allocated > 0 ? ((totals.committed + totals.spent) / totals.allocated) * 100 : 0;
  const tight = budgets.filter((b) => b.utilisation > 90);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pagu anggaran"
        description="Alokasi per cost center, pagu yang sudah terkunci, dan sisa dana yang masih bisa dipakai."
        count={budgets.length}
        countLabel="cost center"
        secondaryActions={
          <Link href="/requisitions" className="btn btn-secondary">
            <ArrowRight className="size-3.5" aria-hidden="true" />Pengajuan terkait
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Cara pagu dihitung"
            subtitle="Tiga komponen yang menentukan sisa dana"
            tabs={[
              {
                id: "komponen",
                label: "Komponen",
                children: (
                  <MetricRows
                    items={[
                      { label: "Alokasi tahunan", value: formatRupiah(totals.allocated) },
                      { label: "Pagu terkunci", value: formatRupiah(totals.committed) },
                      { label: "Realisasi tertagih", value: formatRupiah(totals.spent) },
                      { label: "Sisa tersedia", value: formatRupiah(totals.available) },
                      { label: "Utilisasi", value: formatPercent(utilisation, 1) },
                    ]}
                  />
                ),
              },
              {
                id: "aturan",
                label: "Aturan",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Kunci saat persetujuan">
                      Pagu dikunci sebesar nilai estimasi PR ketika pengajuan disetujui, bukan ketika PO diterbitkan.
                    </NotePanel>
                    <NotePanel title="Lepas saat pelunasan">
                      Nilai aktual dicatat pada realisasi tertagih ketika invoice lunas, dan pagu terkunci berkurang sesuai nilai PR.
                    </NotePanel>
                    <NotePanel title="Peringatan utilisasi">
                      Cost center di atas 90% utilisasi ditandai peringatan karena ruang untuk pengajuan baru menjadi sangat sempit.
                    </NotePanel>
                  </div>
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard
          label="Utilisasi pagu"
          value={formatPercent(utilisation, 1)}
          footer={`${formatCompactRupiah(totals.committed + totals.spent)} terpakai dari ${formatCompactRupiah(totals.allocated)}`}
          tone={utilisation > 90 ? "danger" : utilisation > 70 ? "warning" : "success"}
          series={budgets.map((b) => b.utilisation)}
        />
        <KpiStatCard label="Pagu terkunci" value={formatCompactRupiah(totals.committed)} footer="Nilai PR yang sudah disetujui" tone="warning" />
        <KpiStatCard label="Realisasi tertagih" value={formatCompactRupiah(totals.spent)} footer="Invoice lunas yang sudah dibayar" tone="success" />
        <KpiStatCard
          label="Sisa tersedia"
          value={formatCompactRupiah(totals.available)}
          footer={tight.length ? `${tight.length} cost center di atas 90%` : "Semua cost center masih lapang"}
          tone={tight.length ? "warning" : "success"}
        />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Pagu per cost center" description="Utilisasi dihitung dari pagu terkunci ditambah realisasi tertagih." bare>
            <EnterpriseDataGrid
              count={budgets.length}
              totalLabel={`Total tersedia ${formatCompactRupiah(totals.available)}`}
              filters={[
                { label: "Di atas 90%", value: "TIGHT", count: tight.length },
                { label: "Lapang", value: "ROOMY", count: budgets.length - tight.length },
              ]}
              searchPlaceholder="Cari cost center atau kode..."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Cost center</th>
                    <th className="text-right">Alokasi</th>
                    <th className="text-right">Terkunci</th>
                    <th className="text-right">Tertagih</th>
                    <th className="text-right">Tersedia</th>
                    <th className="w-44">Utilisasi</th>
                    <th className="text-right">Nilai PO</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((b) => (
                    <tr key={b.id} data-row data-status={b.utilisation > 90 ? "TIGHT" : "ROOMY"}>
                      <td className="sticky-col">
                        <div className="font-medium text-slate-800">{b.departmentName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{b.code}</div>
                      </td>
                      <td className="num">{formatRupiah(b.allocated)}</td>
                      <td className="num">{formatRupiah(b.committed)}</td>
                      <td className="num">{formatRupiah(b.spent)}</td>
                      <td className="num font-semibold text-slate-900">{formatRupiah(b.available)}</td>
                      <td>
                        <UtilisationBar pct={b.utilisation} />
                      </td>
                      <td className="num text-slate-500">{formatRupiah(b.poValue)}</td>
                    </tr>
                  ))}
                  {!budgets.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-[12px] text-slate-400">
                        Belum ada cost center terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>

          <SectionPanel title="Posisi keseluruhan" description="Gabungan seluruh cost center pada tahun anggaran berjalan.">
            <div className="grid gap-4 md:grid-cols-2">
              <MetricRows
                items={[
                  { label: "Total alokasi", value: formatRupiah(totals.allocated) },
                  { label: "Total pagu terkunci", value: formatRupiah(totals.committed) },
                  { label: "Total realisasi tertagih", value: formatRupiah(totals.spent) },
                  { label: "Total sisa tersedia", value: formatRupiah(totals.available), emphasis: true, tone: "success" },
                ]}
              />
              <div className="inset p-4">
                <Landmark className="size-4 text-slate-500" aria-hidden="true" />
                <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Nilai purchase order beredar</h3>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">{formatRupiah(totals.poValue)}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Nilai kontrak yang sudah diterbitkan ke vendor. Sebagian belum masuk realisasi tertagih karena invoice belum lunas.
                </p>
              </div>
            </div>
          </SectionPanel>
        </div>

        <TelemetryAndDssRail
          alerts={dashboard.dssAlerts.map((a) => ({ ...a }))}
          health={[
            { label: "Cost center ketat", value: tight.length, tone: "danger" as const },
            { label: "Cost center lapang", value: budgets.length - tight.length, tone: "success" as const },
            { label: "Total cost center", value: budgets.length, tone: "warning" as const },
          ]}
          audits={dashboard.recentActivity.slice(0, 5).map((a) => ({
            action: a.action,
            entity: a.entity,
            actor: a.actor,
            at: formatDate(a.at),
            tone: "info" as const,
          }))}
        />
      </div>

      <p className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Wallet className="size-3" aria-hidden="true" />Sisa tersedia {formatRupiah(totals.available)}.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Percent className="size-3" aria-hidden="true" />Utilisasi gabungan {formatPercent(utilisation, 1)}.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Landmark className="size-3" aria-hidden="true" />Tahun anggaran {budgets[0]?.fiscalYear ?? "—"} · {formatNumber(budgets.length)} cost center.
        </span>
      </p>
    </div>
  );
}
