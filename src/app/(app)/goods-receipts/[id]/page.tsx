import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, Package, Printer, Triangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { FieldList, MetricRows, SectionPanel, TimelineList, UtilisationBar } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { getGrnDetail } from "@/server/services/moduleData";
import { formatDate, formatDateTime, formatNumber, formatPercent, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GoodsReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getGrnDetail(id);
  if (!data) notFound();

  const { grn, items } = data;
  const delivered = items.reduce((sum, i) => sum + i.qtyDelivered, 0);
  const accepted = items.reduce((sum, i) => sum + i.qtyAcceptedGood, 0);
  const rejected = items.reduce((sum, i) => sum + i.qtyRejectedDamaged, 0);
  const acceptanceRate = delivered > 0 ? (accepted / delivered) * 100 : 100;
  const acceptedValue = items.reduce((sum, i) => sum + i.qtyAcceptedGood * i.unitPriceAgreed, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={grn.grnNumber}
        description={`Penerimaan barang untuk ${grn.poNumber} dari ${grn.vendorName}.`}
        secondaryActions={
          <>
            <Link href="/goods-receipts" className="btn btn-secondary">
              <ArrowLeft className="size-3.5" aria-hidden="true" />Daftar GRN
            </Link>
            <Link href={`/grn/${grn.id}`} className="btn btn-secondary">
              <Printer className="size-3.5" aria-hidden="true" />Cetak A4
            </Link>
          </>
        }
        actions={
          <InspectorDrawer
            title="Berita acara penerimaan"
            subtitle="Rincian inspeksi dan nilai diterima"
            tabs={[
              {
                id: "inspeksi",
                label: "Inspeksi",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Catatan inspeksi">
                      {items.map((i) => i.inspectionNotes).filter(Boolean).join(" · ") || "Tidak ada catatan inspeksi khusus."}
                    </NotePanel>
                    <MetricRows
                      items={[
                        { label: "Kuantitas dikirim", value: formatNumber(delivered) },
                        { label: "Diterima baik", value: formatNumber(accepted) },
                        { label: "Ditolak cacat", value: formatNumber(rejected) },
                        { label: "Nilai diterima baik", value: formatRupiah(acceptedValue) },
                      ]}
                    />
                  </div>
                ),
              },
              {
                id: "riwayat",
                label: "Riwayat",
                children: (
                  <TimelineList
                    items={[
                      { title: "Barang tiba", detail: `Surat jalan ${grn.deliveryNoteRef ?? "—"} dari ${grn.vendorName}.`, at: formatDateTime(grn.receivedAt), tone: "info" },
                      { title: "Inspeksi gudang", detail: `Diterima oleh ${grn.receiver ?? "petugas gudang"}.`, tone: "warning" },
                      { title: "Berita acara dicatat", detail: `${formatNumber(accepted)} unit diterima baik, ${formatNumber(rejected)} unit ditolak.`, tone: rejected > 0 ? "danger" : "success" },
                    ]}
                  />
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard label="Diterima baik" value={`${formatNumber(accepted)} unit`} footer={` dari ${formatNumber(delivered)} unit dikirim`} tone="success" />
        <KpiStatCard
          label="Tingkat penerimaan"
          value={formatPercent(acceptanceRate, 0)}
          footer={rejected > 0 ? "Ada barang ditolak karena cacat" : "Semua barang lolos inspeksi"}
          tone={acceptanceRate >= 95 ? "success" : "warning"}
        />
        <KpiStatCard label="Nilai diterima" value={formatRupiah(acceptedValue)} footer="Acuan verifikasi tagihan vendor" />
        <KpiStatCard label="Diterima" value={formatDateTime(grn.receivedAt)} footer="Waktu pencatatan di gudang" />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Baris inspeksi" description="Perbandingan kuantitas PO, dikirim, diterima baik, dan ditolak." bare>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Barang</th>
                    <th className="text-right">Dipesan</th>
                    <th className="text-right">Dikirim</th>
                    <th className="text-right">Diterima baik</th>
                    <th className="text-right">Ditolak</th>
                    <th className="text-right">Nilai diterima</th>
                    <th>Catatan inspeksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} data-row data-status={item.qtyRejectedDamaged > 0 ? "QTY_VARIANCE_HOLD" : "MATCHED_PASSED"}>
                      <td className="sticky-col">
                        <div className="font-medium text-slate-800">{item.description}</div>
                      </td>
                      <td className="num">{formatNumber(item.orderedQty)}</td>
                      <td className="num">{formatNumber(item.qtyDelivered)}</td>
                      <td className="num font-semibold text-slate-900">{formatNumber(item.qtyAcceptedGood)}</td>
                      <td className={`num ${item.qtyRejectedDamaged > 0 ? "text-amber-700" : "text-slate-400"}`}>{formatNumber(item.qtyRejectedDamaged)}</td>
                      <td className="num">{formatRupiah(item.qtyAcceptedGood * item.unitPriceAgreed)}</td>
                      <td className="max-w-56 text-[11px] leading-4 text-slate-500">{item.inspectionNotes ?? "—"}</td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-[12px] text-slate-400">
                        Berita acara ini tidak memiliki baris inspeksi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionPanel>
        </div>

        <div className="space-y-5">
          <SectionPanel title="Detail berita acara" description="Referensi dokumen sumber.">
            <FieldList
              items={[
                { label: "Nomor GRN", value: grn.grnNumber, mono: true },
                { label: "Purchase order", value: grn.poNumber ?? "—", mono: true },
                { label: "Vendor", value: grn.vendorName ?? "—" },
                { label: "Kode vendor", value: grn.vendorCode ?? "—", mono: true },
                { label: "Surat jalan", value: grn.deliveryNoteRef ?? "—", mono: true },
                { label: "Penerima", value: grn.receiver ?? "—" },
                { label: "Waktu terima", value: formatDateTime(grn.receivedAt), mono: true },
                { label: "Status PO", value: <StatusBadge status={grn.poStatus ?? "—"} /> },
              ]}
            />
          </SectionPanel>

          <SectionPanel title="Ringkasan kuantitas" description="Nilai yang dipakai sistem untuk mencocokkan invoice.">
            <div className="mb-3">
              <UtilisationBar pct={acceptanceRate} />
            </div>
            <MetricRows
              items={[
                { label: "Kuantitas dikirim", value: formatNumber(delivered) },
                { label: "Diterima baik", value: formatNumber(accepted) },
                { label: "Ditolak cacat", value: formatNumber(rejected) },
                { label: "Nilai diterima baik", value: formatRupiah(acceptedValue), emphasis: true, tone: "success" },
              ]}
            />
            {rejected > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                <Triangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                <p className="text-[11px] leading-4 text-amber-900">
                  {formatNumber(rejected)} unit ditolak. Vendor tidak dapat menagih kuantitas tersebut; invoice melebihi nilai ini akan
                  ditahan otomatis.
                </p>
              </div>
            )}
          </SectionPanel>
        </div>
      </div>

      <p className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <ClipboardCheck className="size-3" aria-hidden="true" />Berita acara ini menjadi salah satu dari tiga dokumen pencocokan.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Package className="size-3" aria-hidden="true" />Lihat purchase order induk untuk sisa kuantitas.
        </span>
      </p>
    </div>
  );
}
