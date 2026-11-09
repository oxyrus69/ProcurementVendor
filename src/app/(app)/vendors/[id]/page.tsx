import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, Gavel, Receipt, Store, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { FieldList, MetricRows, SectionPanel, UtilisationBar } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { getVendorDetail } from "@/server/services/moduleData";
import { formatDate, formatDateTime, formatNumber, formatPercent, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getVendorDetail(id);
  if (!data) notFound();

  const { vendor, pos, quotes, invoices } = data;
  const onTime = Number(vendor.onTimeDeliveryRate);
  const quality = Number(vendor.qualityAcceptanceRate);
  const price = Number(vendor.priceCompetitivenessScore);
  const score = Number(vendor.compositeVendorScore);
  const rejectRate = 100 - quality;
  const totalPo = pos.reduce((sum, p) => sum + p.grandTotal, 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalClaimed, 0);
  const paidValue = invoices.filter((i) => i.matchStatus === "PAID").reduce((sum, i) => sum + i.totalClaimed, 0);
  const needsReview = onTime < 80 || rejectRate > 5;

  return (
    <div className="space-y-5">
      <PageHeader
        title={vendor.companyName}
        description={`Vendor ${vendor.categorySpecialty ?? "umum"} dengan skor komposit ${score.toFixed(2)}.`}
        secondaryActions={
          <Link href="/vendors" className="btn btn-secondary">
            <ArrowLeft className="size-3.5" aria-hidden="true" />Direktori vendor
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Profil vendor"
            subtitle="Data legal, kontak, dan rekening"
            tabs={[
              {
                id: "legal",
                label: "Legal",
                children: (
                  <FieldList
                    items={[
                      { label: "Kode vendor", value: vendor.vendorCode, mono: true },
                      { label: "Nama badan usaha", value: vendor.companyName },
                      { label: "NPWP", value: vendor.npwp ?? "—", mono: true },
                      { label: "Tier", value: <StatusBadge status={vendor.tier} /> },
                      { label: "Spesialisasi", value: vendor.categorySpecialty ?? "—" },
                    ]}
                  />
                ),
              },
              {
                id: "kontak",
                label: "Kontak",
                children: (
                  <FieldList
                    items={[
                      { label: "Email", value: vendor.contactEmail ?? "—", mono: true },
                      { label: "Telepon", value: vendor.phone ?? "—", mono: true },
                      { label: "Rekening", value: vendor.bankAccountInfo ?? "—", mono: true },
                    ]}
                  />
                ),
              },
              {
                id: "evaluasi",
                label: "Evaluasi",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Ambang penurunan tier">
                      On-time delivery di bawah 80% atau tingkat penolakan di atas 5% memicu rekomendasi penurunan tier pada evaluasi
                      berikutnya.
                    </NotePanel>
                    <MetricRows
                      items={[
                        { label: "On-time delivery", value: formatPercent(onTime) },
                        { label: "Kualitas diterima", value: formatPercent(quality) },
                        { label: "Tingkat penolakan", value: formatPercent(rejectRate) },
                        { label: "Daya saing harga", value: formatPercent(price) },
                        { label: "Skor komposit", value: score.toFixed(2) },
                      ]}
                    />
                  </div>
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard label="Skor komposit" value={score.toFixed(2)} footer={`Tier ${vendor.tier}`} tone={score >= 85 ? "success" : "warning"} />
        <KpiStatCard
          label="On-time delivery"
          value={formatPercent(onTime)}
          footer={onTime < 80 ? "Di bawah ambang 80%" : "Memenuhi ambang kinerja"}
          tone={onTime < 80 ? "danger" : "success"}
        />
        <KpiStatCard label="Nilai kontrak" value={formatRupiah(totalPo)} footer={`${pos.length} purchase order`} />
        <KpiStatCard
          label="Tagihan lunas"
          value={formatRupiah(paidValue)}
          footer={`dari ${formatRupiah(totalInvoiced)} total tagihan`}
          tone={totalInvoiced > 0 && paidValue < totalInvoiced ? "warning" : "success"}
        />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Purchase order" description="Kontrak aktif yang diterbitkan ke vendor ini." bare>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Nomor PO</th>
                    <th className="text-right">Nilai kontrak</th>
                    <th>Kirim</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po) => (
                    <tr key={po.id} data-row data-status={po.status}>
                      <td className="sticky-col">
                        <Link href={`/purchase-orders/${po.id}`} className="row-link font-mono text-[12px]">
                          {po.poNumber}
                        </Link>
                      </td>
                      <td className="num font-semibold text-slate-900">{formatRupiah(po.grandTotal)}</td>
                      <td className="text-[12px] text-slate-700">{formatDate(po.expectedDeliveryDate)}</td>
                      <td>
                        <StatusBadge status={po.status} />
                      </td>
                    </tr>
                  ))}
                  {!pos.length && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-[12px] text-slate-400">
                        Belum ada purchase order untuk vendor ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionPanel>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionPanel title="Riwayat tender" description="Penawaran yang pernah dikirim vendor ini.">
              {quotes.length ? (
                <ul className="space-y-2">
                  {quotes.map((q) => (
                    <li key={q.id} className="inset flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`/rfq/${q.id}`} className="row-link font-mono text-[12px]">
                          {q.rfqNumber}
                        </Link>
                        <div className="font-mono text-[11px] text-slate-500">{formatRupiah(q.totalBidAmount)}</div>
                      </div>
                      <StatusBadge status={q.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-slate-400">Vendor ini belum pernah mengirim penawaran.</p>
              )}
            </SectionPanel>

            <SectionPanel title="Tagihan" description="Invoice yang diajukan vendor ini.">
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
                <p className="text-[12px] text-slate-400">Belum ada tagihan dari vendor ini.</p>
              )}
            </SectionPanel>
          </div>
        </div>

        <div className="space-y-5">
          <SectionPanel title="Identitas vendor" description="Data legal dan kontak.">
            <FieldList
              items={[
                { label: "Kode vendor", value: vendor.vendorCode, mono: true },
                { label: "Nama badan usaha", value: vendor.companyName },
                { label: "NPWP", value: vendor.npwp ?? "—", mono: true },
                { label: "Email", value: vendor.contactEmail ?? "—", mono: true },
                { label: "Telepon", value: vendor.phone ?? "—", mono: true },
                { label: "Rekening", value: vendor.bankAccountInfo ?? "—", mono: true },
                { label: "Spesialisasi", value: vendor.categorySpecialty ?? "—" },
              ]}
            />
          </SectionPanel>

          <SectionPanel title="Indikator kinerja" description="Angka yang dipakai pada evaluasi berkala.">
            <div className="mb-3 space-y-2">
              <UtilisationBar pct={onTime} />
              <UtilisationBar pct={quality} />
              <UtilisationBar pct={score} />
            </div>
            <MetricRows
              items={[
                { label: "On-time delivery", value: formatPercent(onTime) },
                { label: "Kualitas diterima", value: formatPercent(quality) },
                { label: "Tingkat penolakan", value: formatPercent(rejectRate) },
                { label: "Daya saing harga", value: formatPercent(price) },
                { label: "Skor komposit", value: score.toFixed(2), emphasis: true, tone: score >= 85 ? "success" : "warning" },
              ]}
            />
            {needsReview && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                <Award className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                <p className="text-[11px] leading-4 text-amber-900">
                  Vendor berada di bawah ambang kinerja. Pertimbangkan penurunan tier atau pengawasan ketat pada tender berikutnya.
                </p>
              </div>
            )}
          </SectionPanel>

          <SectionPanel title="Ringkasan finansial" description="Nilai kontrak dan tagihan yang sudah diproses.">
            <MetricRows
              items={[
                { label: "Nilai kontrak", value: formatRupiah(totalPo) },
                { label: "Total tagihan", value: formatRupiah(totalInvoiced) },
                { label: "Tagihan lunas", value: formatRupiah(paidValue) },
                { label: "Belum lunas", value: formatRupiah(totalInvoiced - paidValue), emphasis: true, tone: totalInvoiced - paidValue > 0 ? "warning" : "success" },
              ]}
            />
          </SectionPanel>
        </div>
      </div>

      <p className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Gavel className="size-3" aria-hidden="true" />{quotes.length} penawaran tercatat.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Truck className="size-3" aria-hidden="true" />{pos.length} purchase order aktif.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Receipt className="size-3" aria-hidden="true" />{invoices.length} tagihan diajukan.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Store className="size-3" aria-hidden="true" />Tier {vendor.tier}.
        </span>
      </p>
    </div>
  );
}
