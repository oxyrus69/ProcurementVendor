import Link from "next/link";
import { ArrowRight, ClipboardCheck, Package, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { TelemetryAndDssRail } from "@/components/ui/TelemetryAndDssRail";
import { EmptyCell, MetricRows, SectionPanel } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { getGrnBundle } from "@/server/services/moduleData";
import { getDashboardData } from "@/server/services/dashboard";
import { formatCompactRupiah, formatDate, formatDateTime, formatNumber, formatPercent, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GoodsReceiptsPage() {
  const [bundle, dashboard] = await Promise.all([getGrnBundle(), getDashboardData()]);
  const totalDelivered = bundle.rows.reduce((sum, r) => sum + r.delivered, 0);
  const totalAccepted = bundle.rows.reduce((sum, r) => sum + r.accepted, 0);
  const totalRejected = bundle.rows.reduce((sum, r) => sum + r.rejected, 0);
  const acceptanceRate = totalDelivered > 0 ? (totalAccepted / totalDelivered) * 100 : 100;

  const filters = [
    { label: "PO menunggu barang", value: "ISSUED_SENT", count: bundle.openPos.filter((p) => p.status === "ISSUED_SENT").length },
    { label: "Diterima sebagian", value: "PARTIALLY_RECEIVED", count: bundle.openPos.filter((p) => p.status === "PARTIALLY_RECEIVED").length },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Penerimaan barang"
        description="Berita acara penerimaan gudang: kuantitas dikirim, diterima baik, dan ditolak karena cacat."
        count={bundle.rows.length}
        countLabel="berita acara"
        secondaryActions={
          <Link href="/purchase-orders" className="btn btn-secondary">
            <ArrowRight className="size-3.5" aria-hidden="true" />Purchase order
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Aturan penerimaan"
            subtitle="Kuantitas, cacat, dan efek ke invoice"
            tabs={[
              {
                id: "aturan",
                label: "Aturan",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Tidak boleh melebihi PO">
                      Kuantitas diterima baik tidak boleh melebihi sisa kuantitas pada baris PO. Sistem menolak penerimaan berlebih.
                    </NotePanel>
                    <NotePanel title="Barang cacat">
                      Kuantitas ditolak dicatat terpisah dan tidak dihitung sebagai nilai diterima. Nilai ini menjadi dasar verifikasi
                      invoice.
                    </NotePanel>
                    <NotePanel title="Penerimaan parsial">
                      PO boleh diterima bertahap. Status PO berubah menjadi diterima penuh ketika seluruh baris lengkap.
                    </NotePanel>
                  </div>
                ),
              },
              {
                id: "kualitas",
                label: "Kualitas",
                children: (
                  <MetricRows
                    items={[
                      { label: "Kuantitas dikirim", value: formatNumber(totalDelivered) },
                      { label: "Diterima baik", value: formatNumber(totalAccepted) },
                      { label: "Ditolak cacat", value: formatNumber(totalRejected) },
                      { label: "Tingkat penerimaan", value: formatPercent(acceptanceRate), emphasis: true, tone: acceptanceRate >= 95 ? "success" : "warning" },
                    ]}
                  />
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard label="Berita acara" value={String(bundle.rows.length)} footer={`${bundle.openPos.length} PO masih menunggu barang`} />
        <KpiStatCard
          label="Tingkat penerimaan"
          value={formatPercent(acceptanceRate, 0)}
          footer={`${formatNumber(totalAccepted)} unit diterima baik`}
          tone={acceptanceRate >= 95 ? "success" : "warning"}
        />
        <KpiStatCard label="Ditolak cacat" value={formatNumber(totalRejected)} footer={totalRejected ? "Perlu klaim atau penggantian" : "Tidak ada penolakan tercatat"} tone={totalRejected ? "warning" : "success"} />
        <KpiStatCard label="Kuantitas dikirim" value={`${formatNumber(totalDelivered)} unit`} footer="Total kuantitas pada semua berita acara" />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Berita acara penerimaan" description="Urut dari penerimaan terbaru." bare>
            <EnterpriseDataGrid
              count={bundle.rows.length}
              totalLabel={`${formatNumber(totalAccepted)} unit diterima baik`}
              filters={filters}
              searchPlaceholder="Cari nomor GRN, PO, atau penerima..."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Nomor GRN</th>
                    <th>Purchase order</th>
                    <th>Penerima</th>
                    <th className="text-right">Dikirim</th>
                    <th className="text-right">Diterima baik</th>
                    <th className="text-right">Ditolak</th>
                    <th>Diterima</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.rows.map((row) => (
                    <tr key={row.id} data-row data-status={row.poStatus}>
                      <td className="sticky-col">
                        <Link href={`/goods-receipts/${row.id}`} className="row-link font-mono text-[12px]">
                          {row.grnNumber}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/purchase-orders/${row.poId}`} className="font-mono text-[12px] text-slate-700 hover:underline">
                          {row.poNumber}
                        </Link>
                        <div className="text-[11px] text-slate-500">{row.vendorName}</div>
                      </td>
                      <td className="text-[12px] text-slate-700">{row.receiver}</td>
                      <td className="num">{formatNumber(row.delivered)}</td>
                      <td className="num font-semibold text-slate-900">{formatNumber(row.accepted)}</td>
                      <td className={`num ${row.rejected > 0 ? "text-amber-700" : "text-slate-400"}`}>{formatNumber(row.rejected)}</td>
                      <td className="font-mono text-[11px] text-slate-500">{formatDate(row.receivedAt)}</td>
                    </tr>
                  ))}
                  {!bundle.rows.length && <EmptyCell colSpan={7} message="Belum ada berita acara penerimaan." />}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>

          <SectionPanel title="Purchase order menunggu barang" description="PO yang masih memiliki sisa kuantitas untuk diterima.">
            {bundle.openPos.length ? (
              <ul className="space-y-2">
                {bundle.openPos.map((po) => (
                  <li key={po.id} className="inset flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/purchase-orders/${po.id}`} className="row-link font-mono text-[12px]">
                        {po.poNumber}
                      </Link>
                      <div className="text-[11px] text-slate-500">{po.vendorName}</div>
                    </div>
                    <StatusBadge status={po.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-slate-400">Semua purchase order sudah diterima penuh.</p>
            )}
          </SectionPanel>
        </div>

        <TelemetryAndDssRail
          alerts={dashboard.dssAlerts.map((a) => ({ ...a }))}
          health={[
            { label: "Menunggu barang", value: bundle.openPos.filter((p) => p.status === "ISSUED_SENT").length, tone: "warning" as const },
            { label: "Diterima sebagian", value: bundle.openPos.filter((p) => p.status === "PARTIALLY_RECEIVED").length, tone: "warning" as const },
            { label: "Berita acara", value: bundle.rows.length, tone: "success" as const },
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
          <ClipboardCheck className="size-3" aria-hidden="true" />Tingkat penerimaan {formatPercent(acceptanceRate)} memengaruhi skor kualitas vendor.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Truck className="size-3" aria-hidden="true" />Nilai diterima baik menjadi acuan verifikasi invoice.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Package className="size-3" aria-hidden="true" />Cetak berita acara tersedia pada halaman detail GRN.
        </span>
      </p>
    </div>
  );
}
