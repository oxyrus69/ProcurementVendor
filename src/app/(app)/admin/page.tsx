import Link from "next/link";
import { ArrowRight, FileSpreadsheet, Printer, ShieldAlert, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid, GridSummary } from "@/components/ui/EnterpriseDataGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ChartCardWithDataMatrix } from "@/components/ui/ChartCardWithDataMatrix";
import { TelemetryAndDssRail } from "@/components/ui/TelemetryAndDssRail";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { NotePanel } from "@/components/ui/Primitives";
import { getDashboardData } from "@/server/services/dashboard";
import { formatCompactRupiah, formatPercent, formatRupiah, formatRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CommandDashboard() {
  const data = await getDashboardData();
  const health = [
    { label: "Selesai diterima", value: data.workflow.fullyReceived, tone: "success" as const },
    { label: "Menunggu penerimaan", value: data.workflow.awaitingReceipt, tone: "warning" as const },
    { label: "Invoice ditahan", value: data.workflow.invoiceHolds, tone: "danger" as const },
    { label: "Siap dibayar", value: data.workflow.payable, tone: "success" as const },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dasbor komando pengadaan"
        description="Kesehatan alur source-to-pay: pengajuan, tender, penerimaan, dan verifikasi tagihan pada satu layar."
        count={data.documents.pr + data.documents.po + data.documents.invoice}
        countLabel="dokumen aktif"
        secondaryActions={
          <Link href="/api/export/three-way-match" className="btn btn-secondary">
            <FileSpreadsheet className="size-3.5" aria-hidden="true" />Ekspor 3-way match
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Cara membaca dasbor ini"
            subtitle="Aturan bisnis di balik setiap angka"
            tabs={[
              {
                id: "aturan",
                label: "Aturan",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Toleransi 3-way match">
                      Harga invoice boleh menyimpang maksimal 2% atau Rp 100.000 per baris. Melebihi itu, invoice masuk status tahan dan tidak bisa dibayar.
                    </NotePanel>
                    <NotePanel title="Pagu terkunci">
                      Persetujuan PR langsung mengenkripsi pagu cost center. Pagu baru dilepas saat invoice lunas tercatat pada actual spent.
                    </NotePanel>
                    <NotePanel title="Skor vendor">
                      Skor RFQ memakai bobot 50% harga, 20% lead time, 15% kepatuhan teknis, 15% skor historis vendor.
                    </NotePanel>
                  </div>
                ),
              },
              {
                id: "status",
                label: "Status dokumen",
                children: (
                  <div className="space-y-3">
                    {Object.entries(data.invoiceAging).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                        <StatusBadge status={statusKeyToToken(key)} />
                        <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard
          label="Realisasi terhadap pagu"
          value={formatPercent(data.totals.utilizationPct, 1)}
          footer={`${formatCompactRupiah(data.totals.committed + data.totals.spent)} terpakai dari ${formatCompactRupiah(data.totals.allocated)}`}
          delta={data.totals.utilizationPct > 80 ? "Pagu ketat" : undefined}
          trend={data.totals.utilizationPct > 80 ? "up" : "neutral"}
          tone={data.totals.utilizationPct > 80 ? "warning" : "neutral"}
          series={data.budgets.map((b) => (b.allocated > 0 ? ((b.committed + b.spent) / b.allocated) * 100 : 0))}
        />
        <KpiStatCard
          label="Pagu tersedia"
          value={formatCompactRupiah(data.totals.available)}
          footer={`Sisa pagu di ${data.budgets.length} cost center`}
          tone="success"
        />
        <KpiStatCard
          label="Invoice ditahan"
          value={String(data.workflow.invoiceHolds)}
          footer={data.workflow.invoiceHolds ? "Selisih harga atau kuantitas di atas toleransi" : "Semua tagihan lolos verifikasi"}
          tone={data.workflow.invoiceHolds ? "danger" : "success"}
          delta={data.workflow.invoiceHolds ? "Perlu tindakan" : undefined}
          trend={data.workflow.invoiceHolds ? "down" : "neutral"}
        />
        <KpiStatCard
          label="Siap dibayar"
          value={String(data.workflow.payable)}
          footer={`${data.workflow.paid} invoice sudah lunas · ${data.documents.grn} penerimaan tercatat`}
          tone={data.workflow.payable ? "warning" : "neutral"}
        />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section className="panel overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div>
                <h2 className="text-[13px] font-semibold text-slate-900">Alur source-to-pay</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">Tahapan dokumen dari pengajuan sampai pelunasan.</p>
              </div>
              <Link href="/invoices" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--interactive)] hover:underline">
                Kelola tagihan <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </header>
            <div className="grid divide-y divide-slate-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              <PipelineStep label="Pengajuan" total={data.documents.pr} waiting={data.workflow.pendingApproval} waitingLabel="menunggu persetujuan" done={data.workflow.sourcing} doneLabel="disetujui" href="/requisitions" />
              <PipelineStep label="Tender RFQ" total={data.documents.rfq} waiting={data.workflow.openRfq} waitingLabel="masih terbuka" done={data.workflow.awardedRfq} doneLabel="sudah ada pemenang" href="/rfq" />
              <PipelineStep label="Penerimaan" total={data.documents.grn} waiting={data.workflow.awaitingReceipt} waitingLabel="PO menunggu barang" done={data.workflow.fullyReceived} doneLabel="diterima penuh" href="/goods-receipts" />
              <PipelineStep label="Pembayaran" total={data.documents.invoice} waiting={data.workflow.payable} waitingLabel="siap dibayar" done={data.workflow.paid} doneLabel="lunas" href="/invoices" />
            </div>
          </section>

          <ChartCardWithDataMatrix
            title="Nilai purchase order per vendor"
            description="Kontribusi nilai kontrak tiap vendor pada periode berjalan."
            rows={data.poValueByVendor}
            unit="rupiah"
          />

          <section className="panel overflow-hidden">
            <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div>
                <h2 className="text-[13px] font-semibold text-slate-900">Pagu anggaran per cost center</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">Alokasi, pagu terkunci, dan sisa dana yang masih bisa dipakai.</p>
              </div>
              <Link href="/budgets" className="text-xs font-semibold text-[var(--interactive)] hover:underline">Detail pagu</Link>
            </header>
            <div className="p-4">
              <EnterpriseDataGrid count={data.budgets.length} totalLabel={`Total tersedia ${formatCompactRupiah(data.totals.available)}`} searchPlaceholder="Cari cost center...">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cost center</th>
                      <th className="text-right">Alokasi</th>
                      <th className="text-right">Terkunci</th>
                      <th className="text-right">Tertagih</th>
                      <th className="text-right">Tersedia</th>
                      <th className="w-40">Utilisasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.budgets.map((b) => {
                      const used = b.committed + b.spent;
                      const pct = b.allocated > 0 ? (used / b.allocated) * 100 : 0;
                      return (
                        <tr key={b.id} data-row>
                          <td>
                            <div className="font-medium text-slate-800">{b.departmentName}</div>
                            <div className="font-mono text-[11px] text-slate-500">{b.code}</div>
                          </td>
                          <td className="text-right">{formatRupiah(b.allocated)}</td>
                          <td className="text-right">{formatRupiah(b.committed)}</td>
                          <td className="text-right">{formatRupiah(b.spent)}</td>
                          <td className="text-right font-semibold text-slate-900">{formatRupiah(b.available)}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-600">{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </EnterpriseDataGrid>
            </div>
          </section>
        </div>

        <TelemetryAndDssRail
          alerts={data.dssAlerts.map((a) => ({ ...a, metric: a.metric }))}
          health={health}
          audits={data.recentActivity.map((a) => ({ action: a.action, entity: entityLabel(a.entity), actor: a.actor, at: formatRelative(a.at), tone: toneForAction(a.action) }))}
        />
      </div>

      <section className="panel overflow-hidden">
        <GridSummary
          items={[
            { label: "Nilai PO berjalan", value: formatCompactRupiah(data.poValueByVendor.reduce((sum, r) => sum + r.value, 0)) },
            { label: "Vendor aktif", value: `${data.vendorPerformance.filter((v) => v.tier === "APPROVED").length} approved` },
            { label: "Skor vendor rata-rata", value: avgScore(data.vendorPerformance) },
            { label: "Penerimaan", value: `${data.documents.grn} GRN` },
          ]}
        />
        <div className="border-t border-[var(--border)] p-4">
          <EnterpriseDataGrid
            count={data.vendorPerformance.length}
            totalLabel="Diurutkan dari skor komposit tertinggi"
            searchPlaceholder="Cari vendor atau tier..."
            exportHref="/api/export/vendors"
            filters={[{ label: "Approved", value: "APPROVED", count: data.vendorPerformance.filter((v) => v.tier === "APPROVED").length }, { label: "Masa percobaan", value: "PROBATION", count: data.vendorPerformance.filter((v) => v.tier === "PROBATION").length }]}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Tier</th>
                  <th className="text-right">On-time</th>
                  <th className="text-right">Kualitas</th>
                  <th className="text-right">Skor komposit</th>
                  <th className="w-32">Tren skor</th>
                </tr>
              </thead>
              <tbody>
                {data.vendorPerformance.map((v) => (
                  <tr key={v.id} data-row data-status={v.tier}>
                    <td>
                      <Link href={`/vendors/${v.id}`} className="row-link">{v.name}</Link>
                      <div className="font-mono text-[11px] text-slate-500">{v.code}</div>
                    </td>
                    <td><StatusBadge status={v.tier} /></td>
                    <td className="text-right">{formatPercent(v.onTime)}</td>
                    <td className="text-right">{formatPercent(v.quality)}</td>
                    <td className="text-right font-semibold text-slate-900">{v.score.toFixed(2)}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2, 3, 4].map((i) => {
                          const h = 20 + Math.round((v.score / 100) * 60) - i * 4;
                          return <span key={i} className={`w-1.5 rounded-sm ${i === 4 ? "bg-blue-600" : "bg-slate-200"}`} style={{ height: `${Math.max(h, 8)}px` }} />;
                        })}
                        <span className="ml-1 font-mono text-[10px] text-slate-400">5 bln</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </EnterpriseDataGrid>
        </div>
      </section>

      {data.dssAlerts.length > 0 && (
        <div className="no-print flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-xs leading-5 text-amber-900">
            {data.dssAlerts.length} temuan decision support aktif.{" "}
            <Link href="/dss" className="font-semibold underline">Buka modul DSS</Link> untuk justifikasi dan riwayat keputusan.
          </p>
        </div>
      )}

      <p className="no-print flex items-center gap-2 text-[11px] text-slate-400">
        <Printer className="size-3" aria-hidden="true" />
        Dokumen PO dan GRN dapat dicetak pada format A4 dari halaman detail masing-masing dokumen.
        <ShieldAlert className="size-3" aria-hidden="true" /> Setiap perubahan tercatat pada jejak audit.
      </p>
    </div>
  );
}

function PipelineStep({ label, total, waiting, waitingLabel, done, doneLabel, href }: { label: string; total: number; waiting: number; waitingLabel: string; done: number; doneLabel: string; href: string }) {
  return (
    <Link href={href} className="group block p-4 transition-colors hover:bg-slate-50">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="font-mono text-lg font-semibold tabular-nums text-slate-900">{total}</span>
      </div>
      <div className="mt-2 space-y-1 text-[11px]">
        <div className="flex items-center justify-between text-amber-700"><span>{waitingLabel}</span><span className="font-mono font-semibold tabular-nums">{waiting}</span></div>
        <div className="flex items-center justify-between text-emerald-700"><span>{doneLabel}</span><span className="font-mono font-semibold tabular-nums">{done}</span></div>
      </div>
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--interactive)] opacity-0 transition-opacity group-hover:opacity-100">Buka modul <ArrowRight className="size-3" aria-hidden="true" /></span>
    </Link>
  );
}

function statusKeyToToken(key: string): string {
  const map: Record<string, string> = { matched: "MATCHED_PASSED", tolerance: "WITHIN_TOLERANCE_PASSED", priceHold: "PRICE_VARIANCE_HOLD", qtyHold: "QTY_VARIANCE_HOLD", unverified: "UNVERIFIED", paid: "PAID" };
  return map[key] ?? key;
}

function entityLabel(entity: string): string {
  const map: Record<string, string> = {
    purchase_requisition: "Purchase requisition",
    rfq_event: "Event RFQ",
    purchase_order: "Purchase order",
    goods_receipt: "Penerimaan barang",
    vendor_invoice: "Invoice vendor",
  };
  return map[entity] ?? entity;
}

function toneForAction(action: string): "success" | "warning" | "danger" | "info" {
  if (/PAY|APPROVE|RECEIVE/.test(action)) return "success";
  if (/VERIFY|AWARD/.test(action)) return "info";
  if (/REJECT|CANCEL/.test(action)) return "danger";
  return "warning";
}

function avgScore(vendors: { score: number }[]): string {
  if (!vendors.length) return "—";
  return (vendors.reduce((sum, v) => sum + v.score, 0) / vendors.length).toFixed(2);
}
