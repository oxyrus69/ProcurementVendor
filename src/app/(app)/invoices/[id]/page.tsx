import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, CircleCheck, HandCoins, Percent, Scale, Triangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { FieldList, MetricRows, SectionPanel, TimelineList } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { RowAction } from "@/components/ui/ActionForm";
import { getInvoiceDetail } from "@/server/services/moduleData";
import { payInvoice, verifyInvoice } from "@/server/actions/procurement";
import { getSession } from "@/server/auth";
import { formatDate, formatDateTime, formatNumber, formatPercent, formatRupiah, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const data = await getInvoiceDetail(id);
  if (!data) notFound();

  const { invoice, items, logs } = data;
  const canVerify = session ? ["SUPER_ADMIN", "AP_FINANCE"].includes(session.role) : false;
  const payable = ["MATCHED_PASSED", "WITHIN_TOLERANCE_PASSED"].includes(invoice.matchStatus);

  const subtotal = Number(invoice.subtotalClaimed);
  const tax = Number(invoice.taxClaimed);
  const total = Number(invoice.totalClaimed);
  const poTotal = Number(invoice.poGrandTotal ?? invoice.poTotalReference);
  const grnValue = Number(invoice.grnAcceptedValueReference);
  const priceVariance = Number(invoice.priceVarianceAmount);
  const priceVariancePct = Number(invoice.priceVariancePct);
  const qtyVariance = Number(invoice.qtyVarianceUnits);
  const days = daysUntil(invoice.dueDate);

  const worstPrice = Math.max(...items.map((i) => i.priceDeltaPct), 0);
  const worstQty = Math.max(...items.map((i) => i.qtyDelta), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={invoice.internalInvNumber}
        description={`Tagihan ${invoice.vendorName} untuk purchase order ${invoice.poNumber}.`}
        secondaryActions={
          <Link href="/invoices" className="btn btn-secondary">
            <ArrowLeft className="size-3.5" aria-hidden="true" />Daftar tagihan
          </Link>
        }
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <StatusBadge status={invoice.matchStatus} />
            {canVerify && invoice.matchStatus === "UNVERIFIED" && (
              <RowAction action={verifyInvoice} label="Verifikasi" variant="primary" hiddenFields={{ invoiceId: invoice.id }} />
            )}
            {canVerify && payable && (
              <RowAction action={payInvoice} label="Lunasi" variant="success" hiddenFields={{ invoiceId: invoice.id }} confirm confirmMessage="Lunaskan?" />
            )}
            <InspectorDrawer
              title="Hasil pencocokan"
              subtitle="Per baris dan keseluruhan dokumen"
              tabs={[
                {
                  id: "hasil",
                  label: "Hasil",
                  children: (
                    <MetricRows
                      items={[
                        { label: "Nilai tagihan", value: formatRupiah(total) },
                        { label: "Nilai acuan PO", value: formatRupiah(poTotal) },
                        { label: "Nilai acuan GRN", value: formatRupiah(grnValue) },
                        { label: "Selisih harga", value: formatRupiah(priceVariance) },
                        { label: "Selisih harga persen", value: formatPercent(priceVariancePct) },
                        { label: "Selisih kuantitas", value: `${formatNumber(qtyVariance)} unit` },
                      ]}
                    />
                  ),
                },
                {
                  id: "log",
                  label: "Log",
                  children: (
                    <TimelineList
                      items={logs.map((l) => ({
                        title: `Hasil ${l.result}`,
                        detail: "Pencocokan tiga dokumen dijalankan ulang pada saat itu.",
                        at: formatDateTime(l.createdAt),
                        tone: l.result === "MATCHED_PASSED" ? ("success" as const) : l.result === "PAID" ? ("success" as const) : ("warning" as const),
                      }))}
                    />
                  ),
                },
                {
                  id: "aturan",
                  label: "Aturan",
                  children: (
                    <div className="space-y-4">
                      <NotePanel title="Toleransi harga">
                        Selisih harga per baris lolos bila di bawah 2% dan di bawah Rp 100.000 sekaligus. Ambang yang lebih ketang
                        menang.
                      </NotePanel>
                      <NotePanel title="Toleransi kuantitas">
                        Kuantitas tagihan tidak boleh melebihi kuantitas diterima baik. Selisih satu unit saja sudah memicu tahan.
                      </NotePanel>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        }
      />

      <KpiStrip>
        <KpiStatCard label="Nilai tagihan" value={formatRupiah(total)} footer={`Subtotal ${formatRupiah(subtotal)} + pajak ${formatRupiah(tax)}`} />
        <KpiStatCard
          label="Selisih harga terbesar"
          value={formatPercent(worstPrice)}
          footer={worstPrice > 2 ? "Di atas toleransi 2%" : "Masih dalam toleransi"}
          tone={worstPrice > 2 ? "danger" : "success"}
        />
        <KpiStatCard
          label="Selisih kuantitas"
          value={`${formatNumber(worstQty)} unit`}
          footer={worstQty > 0 ? "Tagihan melebihi barang diterima" : "Kuantitas sesuai berita acara"}
          tone={worstQty > 0 ? "danger" : "success"}
        />
        <KpiStatCard
          label="Jatuh tempo"
          value={formatDate(invoice.dueDate)}
          footer={invoice.paidAt ? `Lunas ${formatDate(invoice.paidAt)}` : days !== null ? `${days} hari lagi` : "—"}
          tone={invoice.paidAt ? "success" : days !== null && days < 0 ? "danger" : "neutral"}
        />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel
            title="Pencocokan per baris"
            description="Setiap baris tagihan dibandingkan dengan harga sepakat PO dan kuantitas diterima baik."
            bare
          >
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Barang</th>
                    <th className="text-right">Qty tagih</th>
                    <th className="text-right">Qty diterima</th>
                    <th className="text-right">Harga tagih</th>
                    <th className="text-right">Harga PO</th>
                    <th className="text-right">Selisih harga</th>
                    <th className="text-right">Selisih qty</th>
                    <th className="text-right">Total baris</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const priceBad = item.priceDeltaPct > 2 && item.unitPriceInvoiced - item.poUnitPrice > 100000;
                    const qtyBad = item.qtyDelta > 0;
                    return (
                      <tr key={item.id} data-row data-status={priceBad || qtyBad ? "PRICE_VARIANCE_HOLD" : "MATCHED_PASSED"}>
                        <td className="sticky-col">
                          <div className="font-medium text-slate-800">{item.description}</div>
                          <div className="text-[10px] text-slate-400">{item.poDescription}</div>
                        </td>
                        <td className="num">{formatNumber(item.qtyInvoiced)}</td>
                        <td className="num">{formatNumber(item.acceptedQty)}</td>
                        <td className="num">{formatRupiah(item.unitPriceInvoiced)}</td>
                        <td className="num text-slate-500">{formatRupiah(item.poUnitPrice)}</td>
                        <td className={`num ${priceBad ? "text-red-700" : item.priceDeltaPct > 0 ? "text-amber-700" : "text-slate-500"}`}>
                          {formatPercent(item.priceDeltaPct)}
                        </td>
                        <td className={`num ${qtyBad ? "text-red-700" : "text-slate-500"}`}>{item.qtyDelta === 0 ? "—" : `+${formatNumber(item.qtyDelta)}`}</td>
                        <td className="num font-semibold text-slate-900">{formatRupiah(item.lineTotal)}</td>
                      </tr>
                    );
                  })}
                  {!items.length && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-[12px] text-slate-400">
                        Tagihan ini tidak memiliki baris barang.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionPanel>

          {Boolean(invoice.discrepancySummary) && (
            <SectionPanel title="Ringkasan selisih" description="Catatan struktur selisih yang tercatat saat verifikasi.">
            <pre className="inset overflow-x-auto px-3 py-2.5 font-mono text-[11px] leading-5 text-slate-600">
                {String(JSON.stringify(invoice.discrepancySummary, null, 2))}
              </pre>
            </SectionPanel>
          )}
        </div>

        <div className="space-y-5">
          <SectionPanel title="Detail tagihan" description="Referensi dokumen dan status pembayaran.">
            <FieldList
              items={[
                { label: "Invoice internal", value: invoice.internalInvNumber, mono: true },
                { label: "Nomor vendor", value: invoice.vendorInvoiceNo, mono: true },
                { label: "Vendor", value: invoice.vendorName ?? "—" },
                { label: "Purchase order", value: invoice.poNumber ?? "—", mono: true },
                { label: "Tanggal invoice", value: formatDate(invoice.invoiceDate), mono: true },
                { label: "Jatuh tempo", value: formatDate(invoice.dueDate), mono: true },
                { label: "Status PO", value: <StatusBadge status={invoice.poStatus ?? "—"} /> },
                { label: "Dibayar", value: invoice.paidAt ? formatDateTime(invoice.paidAt) : "Belum dibayar", mono: true },
              ]}
            />
          </SectionPanel>

          <SectionPanel title="Hasil verifikasi" description="Angka yang dipakai sistem untuk keputusan bayar atau tahan.">
            <MetricRows
              items={[
                { label: "Nilai tagihan", value: formatRupiah(total) },
                { label: "Acuan PO", value: formatRupiah(poTotal) },
                { label: "Acuan penerimaan", value: formatRupiah(grnValue) },
                { label: "Selisih harga", value: formatRupiah(priceVariance), emphasis: priceVariance > 100000, tone: priceVariance > 100000 ? "danger" : "neutral" },
                { label: "Selisih harga persen", value: formatPercent(priceVariancePct), emphasis: priceVariancePct > 2, tone: priceVariancePct > 2 ? "danger" : "neutral" },
                { label: "Selisih kuantitas", value: `${formatNumber(qtyVariance)} unit`, emphasis: qtyVariance > 0, tone: qtyVariance > 0 ? "danger" : "neutral" },
              ]}
            />
            <div
              className={`mt-3 flex items-start gap-2 rounded-md border px-3 py-2.5 ${
                payable ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
              }`}
            >
              {payable ? (
                <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <Triangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
              )}
              <p className={`text-[11px] leading-4 ${payable ? "text-emerald-900" : "text-amber-900"}`}>
                {payable
                  ? "Selisih masih dalam toleransi. Tagihan boleh dilunasi."
                  : "Tagihan ditahan. Selesaikan selisih harga atau kuantitas dengan vendor sebelum pembayaran."}
              </p>
            </div>
          </SectionPanel>

          <SectionPanel title="Riwayat pencocokan" description="Setiap kali verifikasi dijalankan, hasilnya dicatat.">
            <TimelineList
              items={logs.map((l) => ({
                title: `Hasil ${l.result}`,
                detail: "Pencocokan tiga dokumen dijalankan ulang.",
                at: formatDateTime(l.createdAt),
                tone: l.result === "MATCHED_PASSED" || l.result === "PAID" ? ("success" as const) : ("warning" as const),
              }))}
            />
          </SectionPanel>
        </div>
      </div>

      <p className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Scale className="size-3" aria-hidden="true" />Toleransi 2% dan Rp 100.000 per baris, yang lebih ketang menang.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Ban className="size-3" aria-hidden="true" />Tagihan ditahan tidak dapat dilunasi dari halaman ini.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <HandCoins className="size-3" aria-hidden="true" />Pelunasan mencatat actual spent pada pagu cost center.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Percent className="size-3" aria-hidden="true" />Selisih terbesar {formatPercent(worstPrice)} pada tingkat baris.
        </span>
      </p>
    </div>
  );
}
