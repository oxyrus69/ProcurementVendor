import Link from "next/link";
import { ArrowRight, Ban, HandCoins, Percent, Receipt, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { TelemetryAndDssRail } from "@/components/ui/TelemetryAndDssRail";
import { EmptyCell, MetricRows, SectionPanel } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { RowAction } from "@/components/ui/ActionForm";
import { getInvoiceBundle } from "@/server/services/moduleData";
import { getDashboardData } from "@/server/services/dashboard";
import { payInvoice, verifyInvoice } from "@/server/actions/procurement";
import { getSession } from "@/server/auth";
import { formatCompactRupiah, formatDate, formatNumber, formatPercent, formatRupiah, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const session = await getSession();
  const [bundle, dashboard] = await Promise.all([getInvoiceBundle(), getDashboardData()]);
  const canVerify = session ? ["SUPER_ADMIN", "AP_FINANCE"].includes(session.role) : false;

  const totalClaimed = bundle.rows.reduce((sum, r) => sum + r.totalClaimed, 0);
  const payable = bundle.rows.filter((r) => ["MATCHED_PASSED", "WITHIN_TOLERANCE_PASSED"].includes(r.matchStatus));
  const holds = bundle.rows.filter((r) => ["PRICE_VARIANCE_HOLD", "QTY_VARIANCE_HOLD", "UNVERIFIED"].includes(r.matchStatus));

  const filters = [
    { label: "Cocok penuh", value: "MATCHED_PASSED", count: bundle.counts.MATCHED_PASSED ?? 0 },
    { label: "Lolos toleransi", value: "WITHIN_TOLERANCE_PASSED", count: bundle.counts.WITHIN_TOLERANCE_PASSED ?? 0 },
    { label: "Tahan harga", value: "PRICE_VARIANCE_HOLD", count: bundle.counts.PRICE_VARIANCE_HOLD ?? 0 },
    { label: "Tahan kuantitas", value: "QTY_VARIANCE_HOLD", count: bundle.counts.QTY_VARIANCE_HOLD ?? 0 },
    { label: "Lunas", value: "PAID", count: bundle.counts.PAID ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoice & 3-way match"
        description="Pencocokan tiga dokumen: purchase order, berita acara penerimaan, dan tagihan vendor."
        count={bundle.rows.length}
        countLabel="tagihan"
        secondaryActions={
          <Link href="/api/export/three-way-match" className="btn btn-secondary">
            <ArrowRight className="size-3.5" aria-hidden="true" />Ekspor hasil match
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Aturan 3-way match"
            subtitle="Toleransi, tahan, dan pelunasan"
            tabs={[
              {
                id: "toleransi",
                label: "Toleransi",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Ambang dua lapis">
                      Selisih harga per baris lolos bila di bawah 2% sekaligus di bawah Rp 100.000. Melebihi salah satu ambang, invoice
                      masuk status tahan.
                    </NotePanel>
                    <NotePanel title="Kuantitas harus sama">
                      Kuantitas tagihan tidak boleh melebihi kuantitas diterima baik pada berita acara. Selisih berapa pun memicu tahan.
                    </NotePanel>
                    <NotePanel title="Harga PO nol">
                      Bila harga sepakat PO bernilai nol, pencocokan tidak bisa lolos otomatis dan harus ditinjau manual.
                    </NotePanel>
                  </div>
                ),
              },
              {
                id: "status",
                label: "Status",
                children: (
                  <MetricRows
                    items={[
                      { label: "Cocok penuh", value: String(bundle.counts.MATCHED_PASSED ?? 0) },
                      { label: "Lolos toleransi", value: String(bundle.counts.WITHIN_TOLERANCE_PASSED ?? 0) },
                      { label: "Tahan selisih harga", value: String(bundle.counts.PRICE_VARIANCE_HOLD ?? 0) },
                      { label: "Tahan selisih kuantitas", value: String(bundle.counts.QTY_VARIANCE_HOLD ?? 0) },
                      { label: "Belum diverifikasi", value: String(bundle.counts.UNVERIFIED ?? 0) },
                      { label: "Lunas", value: String(bundle.counts.PAID ?? 0) },
                    ]}
                  />
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard label="Nilai tagihan" value={formatCompactRupiah(totalClaimed)} footer={`${bundle.rows.length} tagihan tercatat`} />
        <KpiStatCard
          label="Siap dibayar"
          value={String(payable.length)}
          footer={formatCompactRupiah(payable.reduce((s, r) => s + r.totalClaimed, 0))}
          tone={payable.length ? "warning" : "success"}
        />
        <KpiStatCard
          label="Ditahan"
          value={String(holds.length)}
          footer={holds.length ? "Selisih harga atau kuantitas di atas toleransi" : "Tidak ada tagihan tertahan"}
          tone={holds.length ? "danger" : "success"}
          delta={holds.length ? "Perlu tindakan" : undefined}
          trend={holds.length ? "down" : "neutral"}
        />
        <KpiStatCard label="Sudah lunas" value={String(bundle.counts.PAID ?? 0)} footer={formatCompactRupiah(bundle.rows.filter((r) => r.matchStatus === "PAID").reduce((s, r) => s + r.totalClaimed, 0))} tone="success" />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Daftar tagihan" description="Urut berdasarkan tanggal jatuh tempo. Verifikasi ulang dijalankan sebelum pelunasan." bare>
            <EnterpriseDataGrid
              count={bundle.rows.length}
              totalLabel={`Nilai tagihan ${formatCompactRupiah(totalClaimed)}`}
              filters={filters}
              searchPlaceholder="Cari nomor invoice, vendor, atau PO..."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Invoice</th>
                    <th>Vendor</th>
                    <th>Purchase order</th>
                    <th className="text-right">Nilai tagih</th>
                    <th className="text-right">Nilai PO</th>
                    <th className="text-right">Selisih harga</th>
                    <th className="text-right">Selisih qty</th>
                    <th>Jatuh tempo</th>
                    <th>Status</th>
                    <th className="row-actions">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.rows.map((row) => {
                    const days = daysUntil(row.dueDate);
                    const overdue = days !== null && days < 0 && row.matchStatus !== "PAID";
                    return (
                      <tr key={row.id} data-row data-status={row.matchStatus}>
                        <td className="sticky-col">
                          <Link href={`/invoices/${row.id}`} className="row-link font-mono text-[12px]">
                            {row.internalInvNumber}
                          </Link>
                          <div className="font-mono text-[10px] text-slate-400">vendor {row.vendorInvoiceNo}</div>
                        </td>
                        <td>
                          <div className="font-medium text-slate-800">{row.vendorName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{row.vendorCode}</div>
                        </td>
                        <td>
                          <Link href={`/purchase-orders/${row.poNumber}`} className="font-mono text-[12px] text-slate-700 hover:underline">
                            {row.poNumber}
                          </Link>
                        </td>
                        <td className="num font-semibold text-slate-900">{formatRupiah(row.totalClaimed)}</td>
                        <td className="num text-slate-500">{formatRupiah(row.poTotalReference)}</td>
                        <td className={`num ${row.priceVarianceAmount > 0 ? "text-amber-700" : "text-slate-500"}`}>
                          {row.priceVarianceAmount === 0 ? "—" : formatRupiah(row.priceVarianceAmount)}
                          {row.priceVariancePct > 0 && <div className="font-mono text-[10px]">{formatPercent(row.priceVariancePct)}</div>}
                        </td>
                        <td className={`num ${row.qtyVarianceUnits > 0 ? "text-amber-700" : "text-slate-500"}`}>
                          {row.qtyVarianceUnits === 0 ? "—" : `+${formatNumber(row.qtyVarianceUnits)}`}
                        </td>
                        <td>
                          <div className="text-[12px] text-slate-700">{formatDate(row.dueDate)}</div>
                          <div className={`font-mono text-[10px] ${overdue ? "text-red-600" : "text-slate-400"}`}>
                            {row.matchStatus === "PAID" ? "lunas" : days !== null ? `${days} hari` : "—"}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={row.matchStatus} />
                        </td>
                        <td className="row-actions">
                          <div className="no-print flex flex-wrap items-center justify-end gap-1.5">
                            {canVerify && row.matchStatus === "UNVERIFIED" && (
                              <RowAction action={verifyInvoice} label="Verifikasi" variant="secondary" hiddenFields={{ invoiceId: row.id }} />
                            )}
                            {canVerify && ["MATCHED_PASSED", "WITHIN_TOLERANCE_PASSED"].includes(row.matchStatus) && (
                              <RowAction action={payInvoice} label="Bayar" variant="success" hiddenFields={{ invoiceId: row.id }} confirm confirmMessage="Lunasi?" />
                            )}
                            <Link href={`/invoices/${row.id}`} className="btn btn-secondary !min-h-7 !px-2 !py-1 text-[11px]">
                              Detail
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!bundle.rows.length && <EmptyCell colSpan={10} message="Belum ada tagihan vendor tercatat." />}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>

          <SectionPanel title="Bagaimana pencocokan dijalankan" description="Tiga dokumen yang dibandingkan sistem per baris.">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="inset p-4">
                <Scale className="size-4 text-slate-500" aria-hidden="true" />
                <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Purchase order</h3>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Harga sepakat dan kuantitas dipesan menjadi acuan utama. Selisih dihitung terhadap nilai ini.
                </p>
              </div>
              <div className="inset p-4">
                <Receipt className="size-4 text-slate-500" aria-hidden="true" />
                <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Berita acara penerimaan</h3>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Kuantitas diterima baik membatasi kuantitas yang boleh ditagih. Barang cacat tidak masuk hitungan.
                </p>
              </div>
              <div className="inset p-4">
                <Percent className="size-4 text-slate-500" aria-hidden="true" />
                <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Tagihan vendor</h3>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Harga dan kuantitas tagihan diuji terhadap dua dokumen di atas dengan toleransi 2% atau Rp 100.000 per baris.
                </p>
              </div>
            </div>
          </SectionPanel>
        </div>

        <TelemetryAndDssRail
          alerts={dashboard.dssAlerts.map((a) => ({ ...a }))}
          health={[
            { label: "Siap dibayar", value: payable.length, tone: "warning" as const },
            { label: "Ditahan", value: holds.length, tone: "danger" as const },
            { label: "Lunas", value: bundle.counts.PAID ?? 0, tone: "success" as const },
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
          <HandCoins className="size-3" aria-hidden="true" />Pelunasan hanya mungkin setelah verifikasi ulang lolos toleransi.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Ban className="size-3" aria-hidden="true" />Tagihan ditahan tidak bisa dibayar sebelum selisih diselesaikan.
        </span>
      </p>
    </div>
  );
}
