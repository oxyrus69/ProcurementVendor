import Link from "next/link";
import { ArrowRight, CircleCheck, FilePlus2, HandCoins, Percent, Timer } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { TelemetryAndDssRail } from "@/components/ui/TelemetryAndDssRail";
import { EmptyCell, MetricRows, SectionPanel } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { ActionForm, RowAction } from "@/components/ui/ActionForm";
import { getRequisitionBundle } from "@/server/services/moduleData";
import { getDashboardData } from "@/server/services/dashboard";
import { approveRequisition, convertPrToRfq, createRequisition } from "@/server/actions/procurement";
import { getSession } from "@/server/auth";
import { formatCompactRupiah, formatDate, formatNumber, formatPercent, formatRupiah, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RequisitionsPage() {
  const session = await getSession();
  const [bundle, dashboard] = await Promise.all([getRequisitionBundle(), getDashboardData()]);
  const canCreate = session ? ["SUPER_ADMIN", "DEPT_APPROVER"].includes(session.role) : false;
  const canApprove = session ? ["SUPER_ADMIN", "PROCUREMENT_OFFICER"].includes(session.role) : false;

  const filters = [
    { label: "Menunggu", value: "PENDING_APPROVAL", count: bundle.counts.PENDING_APPROVAL ?? 0 },
    { label: "Disetujui", value: "APPROVED_FOR_SOURCING", count: bundle.counts.APPROVED_FOR_SOURCING ?? 0 },
    { label: "Sudah RFQ/PO", value: "CONVERTED_TO_RFQ_PO", count: bundle.counts.CONVERTED_TO_RFQ_PO ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase requisition"
        description="Pengajuan kebutuhan departemen, penguncian pagu, dan konversi menjadi tender RFQ."
        count={bundle.rows.length}
        countLabel="pengajuan"
        secondaryActions={
          <Link href="/rfq" className="btn btn-secondary">
            <ArrowRight className="size-3.5" aria-hidden="true" />Buka tender
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Aturan purchase requisition"
            subtitle="Apa yang terjadi pada setiap status"
            tabs={[
              {
                id: "aturan",
                label: "Aturan",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Penguncian pagu">
                      Persetujuan PR langsung mengenkripsi pagu cost center sebesar nilai estimasi. Pagu baru dilepas ketika invoice lunas
                      dicatat pada actual spent.
                    </NotePanel>
                    <NotePanel title="Syarat konversi">
                      Hanya PR berstatus disetujui untuk sourcing yang bisa dijadikan RFQ. Setelah dikonversi, status berubah menjadi
                      sudah jadi RFQ/PO dan tidak bisa diubah lagi.
                    </NotePanel>
                    <NotePanel title="Ambang tender">
                      Pengajuan di atas Rp 50.000.000 wajib melewati tender RFQ agar perbandingan penawaran tercatat.
                    </NotePanel>
                  </div>
                ),
              },
              {
                id: "ringkasan",
                label: "Ringkasan nilai",
                children: (
                  <MetricRows
                    items={[
                      { label: "Total nilai estimasi", value: formatRupiah(bundle.totalValue) },
                      { label: "Menunggu persetujuan", value: formatRupiah(bundle.rows.filter((r) => r.status === "PENDING_APPROVAL").reduce((s, r) => s + r.estimatedTotal, 0)) },
                      { label: "Siap sourcing", value: formatRupiah(bundle.rows.filter((r) => r.status === "APPROVED_FOR_SOURCING").reduce((s, r) => s + r.estimatedTotal, 0)) },
                      { label: "Sudah jadi RFQ/PO", value: formatRupiah(bundle.rows.filter((r) => r.status === "CONVERTED_TO_RFQ_PO").reduce((s, r) => s + r.estimatedTotal, 0)), emphasis: true, tone: "success" },
                    ]}
                  />
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard
          label="Menunggu persetujuan"
          value={String(bundle.counts.PENDING_APPROVAL ?? 0)}
          footer="Perlu keputusan approver pada hari yang sama"
          tone={(bundle.counts.PENDING_APPROVAL ?? 0) > 0 ? "warning" : "success"}
          delta={(bundle.counts.PENDING_APPROVAL ?? 0) > 0 ? "Perlu tindakan" : undefined}
          trend={(bundle.counts.PENDING_APPROVAL ?? 0) > 0 ? "up" : "neutral"}
        />
        <KpiStatCard label="Siap di-sourcing" value={String(bundle.counts.APPROVED_FOR_SOURCING ?? 0)} footer="Pagu sudah terkunci, tinggal jadi tender" />
        <KpiStatCard label="Sudah jadi RFQ/PO" value={String(bundle.counts.CONVERTED_TO_RFQ_PO ?? 0)} footer="Alur lanjut ke tender atau PO langsung" tone="success" />
        <KpiStatCard
          label="Nilai estimasi terkumpul"
          value={formatCompactRupiah(bundle.totalValue)}
          footer={`Rata-rata ${formatCompactRupiah(bundle.rows.length ? bundle.totalValue / bundle.rows.length : 0)} per pengajuan`}
        />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {canCreate && (
            <SectionPanel
              title="Pengajuan baru"
              description="Satu baris barang per pengajuan. Pagu diperiksa saat persetujuan, bukan saat pengajuan."
              actions={<span className="font-mono text-[11px] text-slate-400">{bundle.catalog.length} item katalog</span>}
            >
              <ActionForm action={createRequisition} className="grid gap-3 md:grid-cols-12">
                <input name="title" required placeholder="Judul pengajuan" className="field md:col-span-4" />
                <select name="costCenterId" required className="field md:col-span-2">
                  <option value="">Cost center</option>
                  {bundle.budgets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.departmentName}
                    </option>
                  ))}
                </select>
                <select name="itemId" required className="field md:col-span-3">
                  <option value="">Barang katalog</option>
                  {bundle.catalog.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.itemCode} · {i.name}
                    </option>
                  ))}
                </select>
                <input name="qty" type="number" min="1" step="1" required placeholder="Qty" className="field md:col-span-1" />
                <input name="unitPrice" type="number" min="1" step="1" required placeholder="Harga satuan" className="field md:col-span-2" />
                <input name="justification" placeholder="Justifikasi (opsional)" className="field md:col-span-10" />
                <button type="submit" className="btn btn-primary md:col-span-2">
                  <FilePlus2 className="size-3.5" aria-hidden="true" />Ajukan
                </button>
              </ActionForm>
            </SectionPanel>
          )}

          <SectionPanel
            title="Daftar pengajuan"
            description="Urut berdasarkan tanggal kebutuhan terdekat. Gunakan kolom aksi untuk menyetujui atau mengonversi."
            bare
          >
            <EnterpriseDataGrid
              count={bundle.rows.length}
              totalLabel={`Nilai estimasi ${formatCompactRupiah(bundle.totalValue)}`}
              filters={filters}
              searchPlaceholder="Cari nomor PR, judul, atau cost center..."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Nomor PR</th>
                    <th>Judul &amp; pengaju</th>
                    <th>Cost center</th>
                    <th className="text-right">Nilai estimasi</th>
                    <th>Dibutuhkan</th>
                    <th>Status</th>
                    <th className="row-actions">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.rows.map((row) => {
                    const days = daysUntil(row.neededByDate);
                    return (
                      <tr key={row.id} data-row data-status={row.status}>
                        <td className="sticky-col">
                          <Link href={`/requisitions/${row.id}`} className="row-link font-mono text-[12px]">
                            {row.prNumber}
                          </Link>
                        </td>
                        <td>
                          <div className="font-medium text-slate-800">{row.title}</div>
                          <div className="text-[11px] text-slate-500">{row.requester}</div>
                        </td>
                        <td>
                          <div className="text-[12px] text-slate-700">{row.costCenter}</div>
                          <div className="font-mono text-[10px] text-slate-400">{row.costCenterCode}</div>
                        </td>
                        <td className="num">{formatRupiah(row.estimatedTotal)}</td>
                        <td>
                          <div className="text-[12px] text-slate-700">{formatDate(row.neededByDate)}</div>
                          {days !== null && days >= 0 && <div className="font-mono text-[10px] text-slate-400">{days} hari lagi</div>}
                        </td>
                        <td>
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="row-actions">
                          <div className="no-print flex flex-wrap items-center justify-end gap-1.5">
                            {canApprove && row.status === "PENDING_APPROVAL" && (
                              <RowAction action={approveRequisition} label="Setujui" variant="success" hiddenFields={{ prId: row.id }} confirm confirmMessage="Kunci pagu?" />
                            )}
                            {canApprove && row.status === "APPROVED_FOR_SOURCING" && (
                              <RowAction action={convertPrToRfq} label="Jadikan RFQ" variant="primary" hiddenFields={{ prId: row.id }} />
                            )}
                            <Link href={`/requisitions/${row.id}`} className="btn btn-secondary !min-h-7 !px-2 !py-1 text-[11px]">
                              Detail
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!bundle.rows.length && <EmptyCell colSpan={7} message="Belum ada pengajuan. Buat pengajuan pertama pada formulir di atas." />}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>
        </div>

        <TelemetryAndDssRail
          alerts={dashboard.dssAlerts.map((a) => ({ ...a }))}
          health={[
            { label: "Siap di-sourcing", value: bundle.counts.APPROVED_FOR_SOURCING ?? 0, tone: "warning" as const },
            { label: "Menunggu persetujuan", value: bundle.counts.PENDING_APPROVAL ?? 0, tone: "danger" as const },
            { label: "Sudah jadi RFQ/PO", value: bundle.counts.CONVERTED_TO_RFQ_PO ?? 0, tone: "success" as const },
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

      <SectionPanel title="Cara pagu dikenakan" description="Urutan pemeriksaan yang dijalankan sistem sebelum sebuah pengajuan disetujui.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="inset p-4">
            <HandCoins className="size-4 text-slate-500" aria-hidden="true" />
            <h3 className="mt-2 text-[12px] font-semibold text-slate-800">1. Pagu tersedia</h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Alokasi dikurangi pagu terkunci dan realisasi tertagih. Sisa harus cukup untuk nilai estimasi PR.
            </p>
          </div>
          <div className="inset p-4">
            <Percent className="size-4 text-slate-500" aria-hidden="true" />
            <h3 className="mt-2 text-[12px] font-semibold text-slate-800">2. Ambang tender</h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Di atas Rp 50 juta, pengajuan harus melewati tender agar perbandingan penawaran vendor tercatat rapi.
            </p>
          </div>
          <div className="inset p-4">
            <Timer className="size-4 text-slate-500" aria-hidden="true" />
            <h3 className="mt-2 text-[12px] font-semibold text-slate-800">3. Tanggal kebutuhan</h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Tanggal dibutuhkan menentukan tenggat tender dan tanggal pengiriman pada PO. Tenggat RFQ ideal 7 hari sebelum kebutuhan.
            </p>
          </div>
        </div>
      </SectionPanel>

      <p className="no-print flex items-center gap-2 text-[11px] text-slate-400">
        <CircleCheck className="size-3" aria-hidden="true" />
        Utilisasi pagu saat ini {formatPercent(dashboard.totals.utilizationPct, 1)} dari total alokasi.
      </p>
    </div>
  );
}
