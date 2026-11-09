import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, Gavel, Scale, Timer } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { FieldList, MetricRows, SectionPanel, TimelineList } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { RowAction } from "@/components/ui/ActionForm";
import { getRfqDetail } from "@/server/services/moduleData";
import { awardRfq } from "@/server/actions/procurement";
import { getSession } from "@/server/auth";
import { formatDate, formatDateTime, formatNumber, formatPercent, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const data = await getRfqDetail(id);
  if (!data) notFound();

  const { rfq, quotations, winnerId } = data;
  const canAward = session ? ["SUPER_ADMIN", "PROCUREMENT_OFFICER"].includes(session.role) : false;
  const closed = ["AWARDED", "CANCELLED"].includes(rfq.status);
  const lowest = quotations.length ? Math.min(...quotations.map((q) => q.totalBid)) : 0;
  const winner = quotations.find((q) => q.vendorId === winnerId) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={rfq.rfqNumber}
        description={rfq.title}
        secondaryActions={
          <Link href="/rfq" className="btn btn-secondary">
            <ArrowLeft className="size-3.5" aria-hidden="true" />Kembali ke daftar
          </Link>
        }
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            <StatusBadge status={rfq.status} />
            {canAward && !closed && winner && (
              <RowAction
                action={awardRfq}
                label={`Tetapkan ${winner.vendorName}`}
                variant="primary"
                hiddenFields={{ rfqId: rfq.id, quotationId: winner.id }}
                confirm
                confirmMessage="Tetapkan pemenang?"
              />
            )}
            <InspectorDrawer
              title="Evaluasi tender"
              subtitle="Skor akhir dan dasar keputusan"
              tabs={[
                {
                  id: "skor",
                  label: "Skor",
                  children: (
                    <MetricRows
                      items={[
                        { label: "Bobot harga", value: "50%" },
                        { label: "Bobot lead time", value: "20%" },
                        { label: "Bobot kepatuhan teknis", value: "15%" },
                        { label: "Bobot reputasi vendor", value: "15%" },
                        { label: "Penawaran terendah", value: lowest > 0 ? formatRupiah(lowest) : "—" },
                        { label: "Pemenang skor", value: winner ? winner.vendorName : "Belum ditetapkan" },
                      ]}
                    />
                  ),
                },
                {
                  id: "riwayat",
                  label: "Riwayat",
                  children: (
                    <TimelineList
                      items={[
                        { title: "Tender dibuka", detail: rfq.prNumber ? `Berasal dari pengajuan ${rfq.prNumber}.` : "Tender langsung tanpa PR.", tone: "info" },
                        {
                          title: "Tenggat penawaran",
                          detail: rfq.deadlineAt ? `Penawaran ditutup ${formatDateTime(rfq.deadlineAt)}.` : "Tenggat belum ditetapkan.",
                          tone: "warning",
                        },
                        ...(rfq.awardJustification
                          ? [
                              {
                                title: "Pemenang ditetapkan",
                                detail: rfq.awardJustification,
                                tone: "success" as const,
                              },
                            ]
                          : [{ title: "Pemenang belum ditetapkan", detail: "Evaluasi masih berjalan atau tender masih terbuka.", tone: "neutral" as const }]),
                      ]}
                    />
                  ),
                },
                {
                  id: "aturan",
                  label: "Aturan",
                  children: (
                    <NotePanel title="Keputusan final">
                      Penetapan pemenang membuat PO secara otomatis dari baris PR sumber, memakai harga dan lead time penawaran yang
                      dipilih. Tindakan ini tidak dapat dibatalkan dari halaman ini.
                    </NotePanel>
                  ),
                },
              ]}
            />
          </div>
        }
      />

      <KpiStrip>
        <KpiStatCard label="Penawaran masuk" value={String(quotations.length)} footer={`${formatNumber(quotations.length)} vendor mengirim penawaran`} />
        <KpiStatCard label="Penawaran terendah" value={lowest > 0 ? formatRupiah(lowest) : "—"} footer="Nilai terbaik pada sisi harga" />
        <KpiStatCard
          label="Skor tertinggi"
          value={winner ? winner.weighted.toFixed(2) : "—"}
          footer={winner ? winner.vendorName : "Belum ada pemenang"}
          tone="success"
        />
        <KpiStatCard label="Tenggat" value={formatDate(rfq.deadlineAt)} footer="Batas penerimaan penawaran" />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel
            title="Perbandingan penawaran"
            description="Diurutkan dari skor berbobot tertinggi. Baris pemenang ditandai pada kolom peringkat."
            bare
          >
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Vendor</th>
                    <th className="text-right">Nilai penawaran</th>
                    <th className="text-right">Lead time</th>
                    <th className="text-right">Garansi</th>
                    <th className="text-right">Tempo bayar</th>
                    <th className="text-right">Kepatuhan teknis</th>
                    <th className="text-right">Reputasi</th>
                    <th className="text-right">Skor akhir</th>
                    <th className="row-actions">Keputusan</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q, index) => (
                    <tr key={q.id} data-row data-status={q.isWinner ? "AWARDED" : "APPROVED"}>
                      <td className="sticky-col">
                        <div className="flex items-center gap-2">
                          {index === 0 && <Award className="size-3.5 shrink-0 text-amber-500" aria-hidden="true" />}
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800">{q.vendorName}</div>
                            <div className="font-mono text-[10px] text-slate-400">{q.vendorCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{formatRupiah(q.totalBid)}</td>
                      <td className="num">{q.leadTime} hari</td>
                      <td className="num">{q.warrantyMonths} bln</td>
                      <td className="num">{q.paymentTermsDays} hari</td>
                      <td className="num">{formatPercent(q.technical)}</td>
                      <td className="num">{q.vendorScore.toFixed(2)}</td>
                      <td className="num font-semibold text-slate-900">{q.weighted.toFixed(2)}</td>
                      <td className="row-actions">
                        {canAward && !closed && (
                          <RowAction
                            action={awardRfq}
                            label={q.isWinner ? "Tetapkan" : "Pilih"}
                            variant={q.isWinner ? "primary" : "secondary"}
                            hiddenFields={{ rfqId: rfq.id, quotationId: q.id }}
                            confirm
                            confirmMessage="Tetapkan?"
                          />
                        )}
                        {closed && q.isWinner && <span className="font-mono text-[11px] font-semibold text-emerald-700">Pemenang</span>}
                      </td>
                    </tr>
                  ))}
                  {!quotations.length && (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-[12px] text-slate-400">
                        Belum ada penawaran masuk untuk tender ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionPanel>

          <SectionPanel title="Profil vendor peserta" description="Reputasi historis yang dipakai pada 15% bobot skor.">
            <div className="grid gap-3 md:grid-cols-3">
              {quotations.map((q) => (
                <div key={q.id} className="inset p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-slate-800">{q.vendorName}</span>
                    <span className="font-mono text-[11px] tabular-nums text-slate-500">{q.vendorScore.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                    <div className="flex justify-between">
                      <span>On-time delivery</span>
                      <span className="font-mono tabular-nums">{formatPercent(q.onTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kualitas diterima</span>
                      <span className="font-mono tabular-nums">{formatPercent(q.quality)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {!quotations.length && <p className="text-[12px] text-slate-400">Belum ada vendor yang mengirim penawaran.</p>}
            </div>
          </SectionPanel>
        </div>

        <div className="space-y-5">
          <SectionPanel title="Detail tender" description="Referensi dokumen dan tenggat.">
            <FieldList
              items={[
                { label: "Nomor RFQ", value: rfq.rfqNumber, mono: true },
                { label: "Pengajuan sumber", value: rfq.prNumber ? `${rfq.prNumber} · ${rfq.prTitle ?? ""}` : "Tender langsung" },
                { label: "Tenggat", value: formatDateTime(rfq.deadlineAt), mono: true },
                { label: "Status", value: <StatusBadge status={rfq.status} /> },
                { label: "Justifikasi pemenang", value: rfq.awardJustification ?? "Belum ditetapkan" },
              ]}
            />
          </SectionPanel>

          <SectionPanel title="Dasar keputusan" description="Catatan yang dibawa ke purchase order.">
            <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Scale className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <p className="text-[11px] leading-4 text-slate-600">
                {rfq.awardJustification ??
                  "Skor akhir dihitung dari 50% harga, 20% lead time, 15% kepatuhan teknis, dan 15% reputasi vendor. Pemenang dipilih dari skor tertinggi, bukan harga terendah."}
              </p>
            </div>
          </SectionPanel>
        </div>
      </div>

      <p className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Gavel className="size-3" aria-hidden="true" />Satu tender hanya boleh memiliki satu pemenang.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Timer className="size-3" aria-hidden="true" />Lead time pemenang menjadi tanggal pengiriman pada purchase order.
        </span>
      </p>
    </div>
  );
}
