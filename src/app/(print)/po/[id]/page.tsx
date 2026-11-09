import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/ui/PrintButton";
import { getPoDetail } from "@/server/services/moduleData";
import { formatDate, formatNumber, formatRupiah, humanizeStatus } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PrintPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPoDetail(id);
  if (!data) notFound();
  const { po, items } = data;

  const subtotal = Number(po.subtotal);
  const tax = Number(po.taxAmount);
  const shipping = Number(po.shippingCost);
  const grandTotal = Number(po.grandTotal);
  const totalQty = items.reduce((sum, i) => sum + i.orderedQty, 0);

  return (
    <div className="mx-auto max-w-4xl px-4">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/purchase-orders/${po.id}`} className="btn btn-secondary">
          <ArrowLeft className="size-3.5" aria-hidden="true" />Kembali ke detail
        </Link>
        <PrintButton />
      </div>

      <article className="doc-print">
        <header className="doc-head">
          <div>
            <h1>Purchase Order</h1>
            <p className="mt-1 text-[12px] text-slate-600">NexusProcure · Source-to-Pay Console</p>
            <p className="text-[12px] text-slate-600">Nexus Manufacturing, Jakarta</p>
          </div>
          <div className="doc-meta">
            <div className="font-mono text-[13px] font-semibold text-slate-900">{po.poNumber}</div>
            <div className="mt-1">Tanggal terbit: {formatDate(po.expectedDeliveryDate)}</div>
            <div>Versi dokumen: {po.version}</div>
            <div>Tempo bayar: {po.paymentTermsDays ?? 0} hari</div>
          </div>
        </header>

        <section className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Vendor</h2>
            <p className="mt-1 text-[13px] font-semibold text-slate-900">{po.vendorName}</p>
            <p className="font-mono text-[11px] text-slate-600">{po.vendorCode}</p>
            <p className="text-[11px] text-slate-600">{po.vendorEmail}</p>
            <p className="text-[11px] text-slate-600">{po.vendorPhone}</p>
            <p className="mt-1 text-[11px] text-slate-600">Tier: {humanizeStatus(po.vendorTier ?? "APPROVED")}</p>
          </div>
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Dikirim ke</h2>
            <p className="mt-1 text-[13px] font-semibold text-slate-900">Gudang Nexus Manufacturing</p>
            <p className="text-[11px] text-slate-600">Cost center: {po.costCenter}</p>
            <p className="font-mono text-[11px] text-slate-600">{po.costCenterCode}</p>
            <p className="text-[11px] text-slate-600">Pengiriman: {formatDate(po.expectedDeliveryDate)}</p>
          </div>
        </section>

        <table className="doc">
          <thead>
            <tr>
              <th style={{ width: "34px" }}>No</th>
              <th>Kode</th>
              <th>Deskripsi barang</th>
              <th style={{ width: "52px" }}>Satuan</th>
              <th className="doc-num" style={{ width: "58px" }}>
                Qty
              </th>
              <th className="doc-num" style={{ width: "104px" }}>
                Harga satuan
              </th>
              <th className="doc-num" style={{ width: "108px" }}>
                Jumlah
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td className="font-mono text-[10px]">{item.itemCode ?? "—"}</td>
                <td>{item.description}</td>
                <td>{item.uom ?? "UNIT"}</td>
                <td className="doc-num">{formatNumber(item.orderedQty)}</td>
                <td className="doc-num">{formatRupiah(item.unitPriceAgreed)}</td>
                <td className="doc-num">{formatRupiah(item.lineTotal)}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={7}>Dokumen ini tidak memiliki baris barang.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} rowSpan={4}>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Referensi</span>
                <div className="mt-1 text-[11px] leading-4 text-slate-600">
                  Pengajuan: {po.prNumber ?? "—"}
                  <br />
                  Tender: {po.rfqNumber ?? "PO langsung"}
                  <br />
                  Hash verifikasi: {po.verificationHash ?? "belum dihitung"}
                </div>
              </td>
              <td colSpan={2} className="font-medium">
                Subtotal barang ({formatNumber(totalQty)} unit)
              </td>
              <td className="doc-num">{formatRupiah(subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="font-medium">
                Pajak
              </td>
              <td className="doc-num">{formatRupiah(tax)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="font-medium">
                Biaya kirim
              </td>
              <td className="doc-num">{formatRupiah(shipping)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="font-semibold">
                Total kontrak
              </td>
              <td className="doc-num font-semibold">{formatRupiah(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-4 text-[11px] leading-4 text-slate-600">
          Dokumen ini sah diterbitkan oleh NexusProcure. Barang diterima sesuai berita acara penerimaan terpisah. Tagihan vendor
          diverifikasi terhadap dokumen ini dan berita acara penerimaan sebelum pembayaran dilakukan.
        </p>

        <div className="doc-sign">
          <div>Diterbitkan oleh</div>
          <div>Disetujui oleh</div>
          <div>Diterima vendor</div>
        </div>
      </article>
    </div>
  );
}
