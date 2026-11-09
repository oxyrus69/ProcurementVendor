import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, Gavel, HandCoins, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { FieldList, MetricRows, SectionPanel, TimelineList, UtilisationBar } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { RowAction } from "@/components/ui/ActionForm";
import { getRequisitionDetail } from "@/server/services/moduleData";
import { approveRequisition, convertPrToRfq } from "@/server/actions/procurement";
import { getSession } from "@/server/auth";
import { formatDate, formatDateTime, formatNumber, formatPercent, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RequisitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const data = await getRequisitionDetail(id);
  if (!data) notFound();

  const { pr, items, rfqs, pos, budget } = data;
  const canApprove = session ? ["SUPER_ADMIN", "PROCUREMENT_OFFICER"].includes(session.role) : false;
  const estimatedTotal = Number(pr.estimatedTotal);
  const allocated = Number(budget.allocated);
  const committed = Number(budget.committed);
  const spent = Number(budget.spent);
  const available = allocated - committed - spent;
  const utilisation = allocated > 0 ? ((committed + spent) / allocated) * 100 : 0;
  const lineTotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={pr.prNumber}
        description={pr.title}
        secondaryActions={
          <Link href="/requisitions" className="btn btn-secondary">
            <ArrowLeft className="size-3.5" aria-hidden="true" />Kembali ke daftar
          </Link>
        }
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <StatusBadge status={pr.status} />
            {canApprove && pr.status === "PENDING_APPROVAL" && (
              <RowAction action={approveRequisition} label="Setujui & kunci pagu" variant="success" hiddenFields={{ prId: pr.id }} confirm confirmMessage="Kunci pagu?" />
            )}
            {canApprove && pr.status === "APPROVED_FOR_SOURCING" && (
              <RowAction action={convertPrToRfq} label="Konversi ke RFQ" variant="primary" hiddenFields={{ prId: pr.id }} />
            )}
            <InspectorDrawer
              title="Riwayat dokumen"
              subtitle="Jejak keputusan pada pengajuan ini"
              tabs={[
                {
                  id: "riwayat",
                  label: "Riwayat",
                  children: (
                    <TimelineList
                      items={[
                        {
                          title: "Pengajuan dibuat",
                          detail: `Diajukan oleh ${pr.requester ?? "pengaju"} untuk cost center ${pr.costCenter ?? "—"}.`,
                          at: formatDateTime(pr.neededByDate),
                          tone: "info",
                        },
                        ...(pr.approvedAt
                          ? [
                              {
                                title: "Disetujui",
                                detail: `Pagu terkunci sebesar ${formatRupiah(pr.estimatedTotal)} oleh ${pr.approver ?? "approver"}.`,
                                at: formatDateTime(pr.approvedAt),
                                tone: "success" as const,
                              },
                            ]
                          : []),
                        ...rfqs.map((r) => ({
                          title: `Tender ${r.rfqNumber}`,
                          detail: r.title,
                          at: formatDateTime(pr.approvedAt),
                          tone: "warning" as const,
                        })),
                        ...pos.map((p) => ({
                          title: `Purchase order ${p.poNumber}`,
                          detail: `Nilai ${formatRupiah(p.grandTotal)}.`,
                          tone: "success" as const,
                        })),
                      ]}
                    />
                  ),
                },
                {
                  id: "aturan",
                  label: "Aturan",
                  children: (
                    <div className="space-y-4">
                      <NotePanel title="Versi dokumen">
                        Dokumen ini berada pada versi {pr.version}. Perubahan baris setelah persetujuan memerlukan pengajuan revisi baru.
                      </NotePanel>
                      <NotePanel title="Justifikasi operasional">
                        {pr.justification || "Tidak ada justifikasi tambahan yang dicatat pada pengajuan ini."}
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
        <KpiStatCard label="Nilai estimasi" value={formatRupiah(estimatedTotal)} footer={`${items.length} baris barang`} />
        <KpiStatCard
          label="Total baris"
          value={formatRupiah(lineTotal)}
          footer="Jumlah harga estimasi per baris"
          tone={Math.abs(lineTotal - estimatedTotal) > 1 ? "warning" : "success"}
        />
        <KpiStatCard
          label="Pagu tersedia"
          value={formatRupiah(available)}
          footer={`Alokasi ${formatRupiah(allocated)}`}
          tone={available < estimatedTotal ? "danger" : "success"}
        />
        <KpiStatCard label="Dibutuhkan" value={formatDate(pr.neededByDate)} footer="Tanggal kebutuhan operasional" />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Baris pengajuan" description="Perbandingan harga estimasi terhadap harga acuan katalog." bare>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Deskripsi</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Harga estimasi</th>
                    <th className="text-right">Harga acuan</th>
                    <th className="text-right">Total baris</th>
                    <th className="text-right">Selisih acuan</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const delta = item.unitPriceEstimate - item.standardReferencePrice;
                    return (
                      <tr key={item.id} data-row>
                        <td className="font-medium text-slate-800">{item.description}</td>
                        <td className="num">
                          {formatNumber(item.qty)} {item.uom ?? ""}
                        </td>
                        <td className="num">{formatRupiah(item.unitPriceEstimate)}</td>
                        <td className="num text-slate-500">{formatRupiah(item.standardReferencePrice)}</td>
                        <td className="num font-semibold text-slate-900">{formatRupiah(item.lineTotal)}</td>
                        <td className={`num ${delta > 0 ? "text-amber-700" : "text-slate-500"}`}>
                          {delta === 0 ? "—" : formatRupiah(delta)}
                        </td>
                      </tr>
                    );
                  })}
                  {!items.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[12px] text-slate-400">
                        Pengajuan ini belum memiliki baris barang.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionPanel>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionPanel title="Tender terkait" description="Event RFQ yang lahir dari pengajuan ini.">
              {rfqs.length ? (
                <ul className="space-y-2">
                  {rfqs.map((r) => (
                    <li key={r.id} className="inset flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`/rfq/${r.id}`} className="row-link font-mono text-[12px]">
                          {r.rfqNumber}
                        </Link>
                        <div className="truncate text-[11px] text-slate-500">{r.title}</div>
                      </div>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-slate-400">Belum ada tender. Konversi pengajuan ini menjadi RFQ untuk mengumpulkan penawaran vendor.</p>
              )}
            </SectionPanel>

            <SectionPanel title="Purchase order terkait" description="PO yang sudah diterbitkan dari pengajuan ini.">
              {pos.length ? (
                <ul className="space-y-2">
                  {pos.map((p) => (
                    <li key={p.id} className="inset flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`/purchase-orders/${p.id}`} className="row-link font-mono text-[12px]">
                          {p.poNumber}
                        </Link>
                        <div className="font-mono text-[11px] text-slate-500">{formatRupiah(p.grandTotal)}</div>
                      </div>
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-slate-400">Belum ada purchase order dari pengajuan ini.</p>
              )}
            </SectionPanel>
          </div>
        </div>

        <div className="space-y-5">
          <SectionPanel title="Detail pengajuan" description="Data administratif dokumen.">
            <FieldList
              items={[
                { label: "Nomor PR", value: pr.prNumber, mono: true },
                { label: "Pengaju", value: pr.requester ?? "—" },
                { label: "Email pengaju", value: pr.requesterEmail ?? "—", mono: true },
                { label: "Cost center", value: `${pr.costCenter ?? "—"} · ${pr.costCenterCode ?? ""}`, mono: true },
                { label: "Dibutuhkan", value: formatDate(pr.neededByDate), mono: true },
                { label: "Disetujui", value: pr.approvedAt ? formatDateTime(pr.approvedAt) : "Belum disetujui", mono: true },
                { label: "Approver", value: pr.approver ?? "—" },
                { label: "Versi", value: String(pr.version), mono: true },
              ]}
            />
          </SectionPanel>

          <SectionPanel title="Dampak pagu" description="Efek persetujuan terhadap pagu cost center.">
            <div className="mb-3">
              <UtilisationBar pct={utilisation} />
            </div>
            <MetricRows
              items={[
                { label: "Alokasi", value: formatRupiah(allocated) },
                { label: "Pagu terkunci", value: formatRupiah(committed) },
                { label: "Realisasi tertagih", value: formatRupiah(spent) },
                { label: "Sisa pagu", value: formatRupiah(available), emphasis: true, tone: available > 0 ? "success" : "danger" },
              ]}
            />
            <div className="mt-3 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <HandCoins className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <p className="text-[11px] leading-4 text-slate-600">
                {pr.status === "PENDING_APPROVAL"
                  ? "Pagu belum terpengaruh. Penguncian terjadi saat pengajuan disetujui."
                  : `Pagu cost center ini sudah mengenkatkan ${formatRupiah(estimatedTotal)} dari pengajuan ini.`}
              </p>
            </div>
          </SectionPanel>
        </div>
      </div>

      <SectionPanel title="Justifikasi operasional" description="Alasan pengajuan yang dicatat pemohon.">
        <p className="max-w-3xl text-[13px] leading-6 text-slate-700">
          {pr.justification || "Tidak ada justifikasi tambahan yang dicatat pada pengajuan ini."}
        </p>
      </SectionPanel>

      <p className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Gavel className="size-3" aria-hidden="true" />Konversi hanya aktif setelah pengajuan disetujui.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CircleCheck className="size-3" aria-hidden="true" />Utilisasi pagu {formatPercent(utilisation, 1)}.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Printer className="size-3" aria-hidden="true" />Dokumen PO dan GRN memiliki versi cetak A4 terpisah.
        </span>
      </p>
    </div>
  );
}
