import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, Package, Printer, ShieldCheck, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { FieldList, MetricRows, SectionPanel, TimelineList, UtilisationBar } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { RowAction } from "@/components/ui/ActionForm";
import { getPoDetail } from "@/server/services/moduleData";
import { receiveGoods } from "@/server/actions/procurement";
import { getSession } from "@/server/auth";
import { formatDate, formatDateTime, formatNumber, formatPercent, formatRupiah, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const data = await getPoDetail(id);
  if (!data) notFound();

  const { po, items, grns, invoices } = data;
  const canReceive = session ? ["SUPER_ADMIN", "PROCUREMENT_OFFICER", "WAREHOUSE_RECEIVER"].includes(session.role) : false;
  const subtotal = Number(po.subtotal);
  const tax = Number(po.taxAmount);
  const shipping = Number(po.shippingCost);
  const grandTotal = Number(po.grandTotal);
  const totalOrdered = items.reduce((sum, i) => sum + i.orderedQty, 0);
  const totalReceived = items.reduce((sum, i) => sum + i.receivedAcceptedQty, 0);
  const receivedPct = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
  const days = daysUntil(po.expectedDeliveryDate);

  return (
    <div className="space-y-5">
      <PageHeader
        title={po.poNumber}
        description={`Kontrak ke ${po.vendorName} untuk kebutuhan ${po.costCenter}.`}
        secondaryActions={
          <>
            <Link href="/purchase-orders" className="btn btn-secondary">
              <ArrowLeft className="size-3.5" aria-hidden="true" />Daftar PO
            </Link>
            <Link href={`/po/${po.id}`} className="btn btn-secondary">
              <Printer className="size-3.5" aria-hidden="true" />Cetak A4
            </Link>
          </>
        }
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <StatusBadge status={po.status} />
            <InspectorDrawer
              title="Dokumen purchase order"
              subtitle="Integritas, penerimaan, dan tagihan"
              tabs={[
                {
                  id: "riwayat",
                  label: "Riwayat",
                  children: (
                    <TimelineList
                      items={[
                        { title: "PO diterbitkan", detail: `Dikirim ke ${po.vendorName} dengan tempo ${po.paymentTermsDays ?? 0} hari.`, tone: "info" },
                        ...grns.map((g) => ({
                          title: `Penerimaan ${g.grnNumber}`,
                          detail: `Surat jalan ${g.deliveryNoteRef ?? "—"}.`,
                          at: formatDateTime(g.receivedAt),
                          tone: "success" as const,
                        })),
                        ...invoices.map((i) => ({
                          title: `Invoice ${i.internalInvNumber}`,
                          detail: `Status verifikasi ${i.matchStatus}.`,
                          tone: "warning" as const,
                        })),
                      ]}
                    />
                  ),
                },
                {
                  id: "integritas",
                  label: "Integritas",
                  children: (
                    <div className="space-y-4">
                      <NotePanel title="Hash verifikasi">
                        Nilai hash pada dokumen ini dipakai untuk memastikan isi PO cetak belum berubah setelah diterbitkan.
                      </NotePanel>
                      <div className="inset px-3 py-2.5">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Hash dokumen</div>
                        <div className="mt-1 break-all font-mono text-[11px] text-slate-700">{po.verificationHash ?? "Belum dihitung"}</div>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        }
      />

      <KpiStrip>
        <KpiStatCard label="Nilai kontrak" value={formatRupiah(grandTotal)} footer={`Subtotal ${formatRupiah(subtotal)}`} />
        <KpiStatCard
          label="Progres penerimaan"
          value={formatPercent(receivedPct, 0)}
          footer={`${formatNumber(totalReceived)} dari ${formatNumber(totalOrdered)} unit diterima`}
          tone={receivedPct >= 100 ? "success" : receivedPct > 0 ? "warning" : "neutral"}
        />
        <KpiStatCard label="Pengiriman" value={formatDate(po.expectedDeliveryDate)} footer={days !== null && days >= 0 ? `${days} hari lagi` : "Jadwal sudah lewat"} tone={days !== null && days >= 0 && days <= 3 ? "warning" : "neutral"} />
        <KpiStatCard label="Invoice terkait" value={String(invoices.length)} footer={`${invoices.filter((i) => i.matchStatus === "PAID").length} sudah lunas`} />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel
            title="Baris purchase order"
            description="Kuantitas dipesan, diterima baik, dan sisa yang masih harus diterima."
            bare
          >
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Barang</th>
                    <th className="text-right">Dipesan</th>
                    <th className="text-right">Diterima baik</th>
                    <th className="text-right">Sisa</th>
                    <th className="text-right">Harga sepakat</th>
                    <th className="text-right">Total baris</th>
                    <th className="row-actions">Terima barang</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} data-row data-status={item.remaining === 0 ? "FULLY_RECEIVED" : "PARTIALLY_RECEIVED"}>
                      <td className="sticky-col">
                        <div className="font-medium text-slate-800">{item.description}</div>
                        <div className="font-mono text-[10px] text-slate-400">{item.itemCode ?? "—"}</div>
                      </td>
                      <td className="num">
                        {formatNumber(item.orderedQty)} {item.uom ?? ""}
                      </td>
                      <td className="num">
                        {formatNumber(item.receivedAcceptedQty)} {item.uom ?? ""}
                      </td>
                      <td className="num">{formatNumber(item.remaining)}</td>
                      <td className="num">{formatRupiah(item.unitPriceAgreed)}</td>
                      <td className="num font-semibold text-slate-900">{formatRupiah(item.lineTotal)}</td>
                      <td className="row-actions">
                        {canReceive && item.remaining > 0 && (
                          <RowAction
                            action={receiveGoods}
                            label="Terima"
                            variant="secondary"
                            hiddenFields={{ poId: po.id, poItemId: item.id, qtyAccepted: String(item.remaining), qtyRejected: "0" }}
                            confirm
                            confirmMessage="Terima penuh?"
                          />
                        )}
                        {item.remaining === 0 && <span className="font-mono text-[11px] text-emerald-700">Lengkap</span>}
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-[12px] text-slate-400">
                        PO ini tidak memiliki baris barang.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionPanel>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionPanel title="Berita acara penerimaan" description="GRN yang sudah dicatat untuk PO ini.">
              {grns.length ? (
                <ul className="space-y-2">
                  {grns.map((g) => (
                    <li key={g.id} className="inset flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`/goods-receipts/${g.id}`} className="row-link font-mono text-[12px]">
                          {g.grnNumber}
                        </Link>
                        <div className="text-[11px] text-slate-500">Surat jalan {g.deliveryNoteRef ?? "—"}</div>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">{formatDateTime(g.receivedAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-slate-400">Belum ada penerimaan barang pada PO ini.</p>
              )}
            </SectionPanel>

            <SectionPanel title="Invoice terkait" description="Tagihan vendor yang merujuk PO ini.">
              {invoices.length ? (
                <ul className="space-y-2">
                  {invoices.map((i) => (
                    <li key={i.id} className="inset flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`/invoices/${i.id}`} className="row-link font-mono text-[12px]">
                          {i.internalInvNumber}
                        </Link>
                        <div className="font-mono text-[11px] text-slate-500">{formatRupiah(i.totalClaimed)}</div>
                      </div>
                      <StatusBadge status={i.matchStatus} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-slate-400">Belum ada tagihan masuk untuk PO ini.</p>
              )}
            </SectionPanel>
          </div>
        </div>

        <div className="space-y-5">
          <SectionPanel title="Detail kontrak" description="Data administratif purchase order.">
            <FieldList
              items={[
                { label: "Nomor PO", value: po.poNumber, mono: true },
                { label: "Vendor", value: po.vendorName ?? "—" },
                { label: "Kode vendor", value: po.vendorCode ?? "—", mono: true },
                { label: "Tier vendor", value: <StatusBadge status={po.vendorTier ?? "APPROVED"} /> },
                { label: "Pengajuan sumber", value: po.prNumber ?? "—", mono: true },
                { label: "Tender", value: po.rfqNumber ?? "PO langsung", mono: true },
                { label: "Cost center", value: `${po.costCenter ?? "—"} · ${po.costCenterCode ?? ""}`, mono: true },
                { label: "Kirim", value: formatDate(po.expectedDeliveryDate), mono: true },
                { label: "Tempo bayar", value: `${po.paymentTermsDays ?? 0} hari`, mono: true },
                { label: "Versi", value: String(po.version), mono: true },
              ]}
            />
          </SectionPanel>

          <SectionPanel title="Rincian nilai" description="Komponen pembentuk nilai kontrak.">
            <MetricRows
              items={[
                { label: "Subtotal barang", value: formatRupiah(subtotal) },
                { label: "Pajak", value: formatRupiah(tax) },
                { label: "Biaya kirim", value: formatRupiah(shipping) },
                { label: "Total kontrak", value: formatRupiah(grandTotal), emphasis: true, tone: "success" },
              ]}
            />
          </SectionPanel>

          <SectionPanel title="Progres penerimaan" description="Perbandingan kuantitas dipesan dan diterima baik.">
            <UtilisationBar pct={receivedPct} />
            <div className="mt-3 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Boxes className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <p className="text-[11px] leading-4 text-slate-600">
                {receivedPct >= 100
                  ? "Seluruh baris sudah diterima baik. Invoice dapat diverifikasi terhadap PO dan berita acara penerimaan."
                  : `Masih ${formatNumber(totalOrdered - totalReceived)} unit menunggu penerimaan. Penerimaan sebagian diperbolehkan.`}
              </p>
            </div>
          </SectionPanel>
        </div>
      </div>

      <p className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Truck className="size-3" aria-hidden="true" />Kuantitas diterima tidak boleh melebihi sisa PO.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3" aria-hidden="true" />Hash {po.verificationHash ? "tercatat" : "belum dihitung"} untuk verifikasi dokumen cetak.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Package className="size-3" aria-hidden="true" />Versi dokumen {po.version}.
        </span>
      </p>
    </div>
  );
}
