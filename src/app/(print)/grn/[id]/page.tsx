import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/ui/PrintButton";
import { getGrnDetail } from "@/server/services/moduleData";
import { formatDate, formatDateTime, formatNumber, formatPercent, formatRupiah, humanizeStatus } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PrintGoodsReceiptPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="mx-auto max-w-4xl px-4">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/goods-receipts/${grn.id}`} className="btn btn-secondary">
          <ArrowLeft className="size-3.5" aria-hidden="true" />Kembali ke detail
        </Link>
        <PrintButton />
      </div>

      <article className="doc-print">
        <header className="doc-head">
          <div>
            <h1>Berita Acara Penerimaan Barang</h1>
            <p className="mt-1 text-[12px] text-slate-600">NexusProcure · Gudang Nexus Manufacturing</p>
          </div>
          <div className="doc-meta">
            <div className="font-mono text-[13px] font-semibold text-slate-900">{grn.grnNumber}</div>
            <div className="mt-1">Diterima: {formatDateTime(grn.receivedAt)}</div>
            <div>Surat jalan: {grn.deliveryNoteRef ?? "—"}</div>
          </div>
        </header>

        <section className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Vendor pengirim</h2>
            <p className="mt-1 text-[13px] font-semibold text-slate-900">{grn.vendorName}</p>
            <p className="font-mono text-[11px] text-slate-600">{grn.vendorCode}</p>
          </div>
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Referensi</h2>
            <p className="mt-1 text-[13px] font-semibold text-slate-900">Purchase order {grn.poNumber}</p>
            <p className="text-[11px] text-slate-600">Status PO: {humanizeStatus(grn.poStatus ?? "—")}</p>
            <p className="text-[11px] text-slate-600">Penerima: {grn.receiver ?? "—"}</p>
          </div>
        </section>

        <table className="doc">
          <thead>
            <tr>
              <th style={{ width: "34px" }}>No</th>
              <th>Deskripsi barang</th>
              <th className="doc-num" style={{ width: "62px" }}>
                Dipesan
              </th>
              <th className="doc-num" style={{ width: "62px" }}>
                Dikirim
              </th>
              <th className="doc-num" style={{ width: "70px" }}>
                Diterima
              </th>
              <th className="doc-num" style={{ width: "58px" }}>
                Ditolak
              </th>
              <th className="doc-num" style={{ width: "104px" }}>
                Nilai diterima
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>
                  {item.description}
                  {item.inspectionNotes && <div className="mt-0.5 text-[10px] text-slate-500">Catatan: {item.inspectionNotes}</div>}
                </td>
                <td className="doc-num">{formatNumber(item.orderedQty)}</td>
                <td className="doc-num">{formatNumber(item.qtyDelivered)}</td>
                <td className="doc-num">{formatNumber(item.qtyAcceptedGood)}</td>
                <td className="doc-num">{formatNumber(item.qtyRejectedDamaged)}</td>
                <td className="doc-num">{formatRupiah(item.qtyAcceptedGood * item.unitPriceAgreed)}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={7}>Berita acara ini tidak memiliki baris inspeksi.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} rowSpan={4}>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Ringkasan</span>
                <div className="mt-1 text-[11px] leading-4 text-slate-600">
                  Kuantitas dikirim: {formatNumber(delivered)}
                  <br />
                  Diterima baik: {formatNumber(accepted)}
                  <br />
                  Ditolak cacat: {formatNumber(rejected)}
                  <br />
                  Tingkat penerimaan: {formatPercent(acceptanceRate)}
                </div>
              </td>
              <td colSpan={2} className="font-medium">
                Total diterima baik
              </td>
              <td className="doc-num">{formatNumber(accepted)} unit</td>
            </tr>
            <tr>
              <td colSpan={2} className="font-medium">
                Total ditolak
              </td>
              <td className="doc-num">{formatNumber(rejected)} unit</td>
            </tr>
            <tr>
              <td colSpan={2} className="font-medium">
                Tingkat penerimaan
              </td>
              <td className="doc-num">{formatPercent(acceptanceRate)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="font-semibold">
                Nilai diterima baik
              </td>
              <td className="doc-num font-semibold">{formatRupiah(acceptedValue)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-4 text-[11px] leading-4 text-slate-600">
          Berita acara ini menjadi salah satu dari tiga dokumen pencocokan. Kuantitas diterima baik membatasi nilai yang boleh ditagih
          vendor. Barang yang ditolak karena cacat tidak termasuk dalam nilai penerimaan.
        </p>

        <div className="doc-sign">
          <div>Petugas gudang</div>
          <div>Kepala gudang</div>
          <div>Perwakilan vendor</div>
        </div>
      </article>
    </div>
  );
}
