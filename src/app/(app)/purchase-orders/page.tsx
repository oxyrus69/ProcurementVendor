import Link from "next/link";
import { ArrowRight, Package, Printer, ShieldCheck, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { TelemetryAndDssRail } from "@/components/ui/TelemetryAndDssRail";
import { EmptyCell, MetricRows, SectionPanel } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { getPoBundle } from "@/server/services/moduleData";
import { getDashboardData } from "@/server/services/dashboard";
import { poStatusTone } from "@/server/services/dashboard";
import { formatCompactRupiah, formatDate, formatNumber, formatPercent, formatRupiah, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const [bundle, dashboard] = await Promise.all([getPoBundle(), getDashboardData()]);
  const totalValue = bundle.rows.reduce((sum, r) => sum + r.grandTotal, 0);
  const openValue = bundle.rows.filter((r) => ["ISSUED_SENT", "PARTIALLY_RECEIVED"].includes(r.status)).reduce((sum, r) => sum + r.grandTotal, 0);

  const filters = [
    { label: "Diterbitkan", value: "ISSUED_SENT", count: bundle.counts.ISSUED_SENT ?? 0 },
    { label: "Diterima sebagian", value: "PARTIALLY_RECEIVED", count: bundle.counts.PARTIALLY_RECEIVED ?? 0 },
    { label: "Diterima penuh", value: "FULLY_RECEIVED", count: bundle.counts.FULLY_RECEIVED ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase order"
        description="Kontrak resmi ke vendor beserta status penerimaan barang dan referensi integritas dokumen."
        count={bundle.rows.length}
        countLabel="purchase order"
        secondaryActions={
          <Link href="/goods-receipts" className="btn btn-secondary">
            <ArrowRight className="size-3.5" aria-hidden="true" />Penerimaan barang
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Aturan purchase order"
            subtitle="Dari penetapan pemenang sampai pelunasan"
            tabs={[
              {
                id: "aturan",
                label: "Aturan",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Referensi integritas">
                      Setiap PO menyimpan hash verifikasi. Hash dipakai untuk memastikan dokumen cetak belum diubah setelah diterbitkan.
                    </NotePanel>
                    <NotePanel title="Penerimaan bertahap">
                      PO boleh diterima sebagian. Kuantitas diterima yang baik tidak boleh melebihi sisa kuantitas pada baris PO.
                    </NotePanel>
                    <NotePanel title="Tiga dokumen harus cocok">
                      Invoice baru bisa dibayar bila harga dan kuantitasnya cocok dengan PO dan berita acara penerimaan.
                    </NotePanel>
                  </div>
                ),
              },
              {
                id: "nilai",
                label: "Ringkasan nilai",
                children: (
                  <MetricRows
                    items={[
                      { label: "Nilai seluruh PO", value: formatRupiah(totalValue) },
                      { label: "Nilai masih terbuka", value: formatRupiah(openValue) },
                      { label: "Nilai diterima penuh", value: formatRupiah(bundle.rows.filter((r) => r.status === "FULLY_RECEIVED").reduce((s, r) => s + r.grandTotal, 0)) },
                      { label: "Rata-rata per PO", value: formatRupiah(bundle.rows.length ? totalValue / bundle.rows.length : 0) },
                    ]}
                  />
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard label="Nilai kontrak" value={formatCompactRupiah(totalValue)} footer={`${bundle.rows.length} purchase order aktif`} />
        <KpiStatCard label="Menunggu barang" value={String(bundle.counts.ISSUED_SENT ?? 0)} footer="PO terkirim, barang belum diterima" tone="warning" />
        <KpiStatCard label="Diterima sebagian" value={String(bundle.counts.PARTIALLY_RECEIVED ?? 0)} footer="Masih ada sisa kuantitas pada PO" tone="warning" />
        <KpiStatCard label="Diterima penuh" value={String(bundle.counts.FULLY_RECEIVED ?? 0)} footer="Siap diverifikasi tagihannya" tone="success" />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Daftar purchase order" description="Urut berdasarkan tanggal pengiriman terdekat." bare>
            <EnterpriseDataGrid
              count={bundle.rows.length}
              totalLabel={`Nilai kontrak ${formatCompactRupiah(totalValue)}`}
              filters={filters}
              searchPlaceholder="Cari nomor PO, vendor, atau cost center..."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Nomor PO</th>
                    <th>Vendor</th>
                    <th>Sumber</th>
                    <th className="text-right">Nilai kontrak</th>
                    <th>Kirim</th>
                    <th>Tempo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.rows.map((row) => {
                    const days = daysUntil(row.expectedDeliveryDate);
                    return (
                      <tr key={row.id} data-row data-status={row.status}>
                        <td className="sticky-col">
                          <Link href={`/purchase-orders/${row.id}`} className="row-link font-mono text-[12px]">
                            {row.poNumber}
                          </Link>
                        </td>
                        <td>
                          <div className="font-medium text-slate-800">{row.vendorName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{row.vendorCode}</div>
                        </td>
                        <td>
                          <div className="text-[12px] text-slate-700">{row.costCenter}</div>
                          <div className="font-mono text-[10px] text-slate-400">{row.prNumber}</div>
                        </td>
                        <td className="num font-semibold text-slate-900">{formatRupiah(row.grandTotal)}</td>
                        <td>
                          <div className="text-[12px] text-slate-700">{formatDate(row.expectedDeliveryDate)}</div>
                          {days !== null && days >= 0 && <div className="font-mono text-[10px] text-slate-400">{days} hari lagi</div>}
                        </td>
                        <td className="num">{row.paymentTermsDays} hari</td>
                        <td>
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    );
                  })}
                  {!bundle.rows.length && <EmptyCell colSpan={7} message="Belum ada purchase order terbit." />}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>
        </div>

        <TelemetryAndDssRail
          alerts={dashboard.dssAlerts.map((a) => ({ ...a }))}
          health={[
            { label: "Menunggu barang", value: bundle.counts.ISSUED_SENT ?? 0, tone: "warning" as const },
            { label: "Diterima sebagian", value: bundle.counts.PARTIALLY_RECEIVED ?? 0, tone: "warning" as const },
            { label: "Diterima penuh", value: bundle.counts.FULLY_RECEIVED ?? 0, tone: "success" as const },
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
          <Package className="size-3" aria-hidden="true" />Nilai PO terbuka {formatRupiah(openValue)}.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Truck className="size-3" aria-hidden="true" />Penerimaan dicatat pada modul penerimaan barang.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3" aria-hidden="true" />Setiap PO punya hash verifikasi untuk dokumen cetak.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Printer className="size-3" aria-hidden="true" />Cetak A4 tersedia pada halaman detail PO.
        </span>
      </p>
    </div>
  );
}
