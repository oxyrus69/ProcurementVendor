import Link from "next/link";
import { ArrowRight, Gavel, Scale, Split, Timer } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { TelemetryAndDssRail } from "@/components/ui/TelemetryAndDssRail";
import { EmptyCell, MetricRows, SectionPanel } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { getRfqBundle } from "@/server/services/moduleData";
import { getDashboardData } from "@/server/services/dashboard";
import { formatCompactRupiah, formatDate, formatDateTime, formatNumber, formatPercent, formatRelative, formatRupiah, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RfqPage() {
  const [bundle, dashboard] = await Promise.all([getRfqBundle(), getDashboardData()]);

  const filters = [
    { label: "Buka penawaran", value: "OPEN_FOR_BIDDING", count: bundle.counts.OPEN_FOR_BIDDING ?? 0 },
    { label: "Evaluasi dikunci", value: "EVALUATION_LOCKED", count: bundle.counts.EVALUATION_LOCKED ?? 0 },
    { label: "Sudah ada pemenang", value: "AWARDED", count: bundle.counts.AWARDED ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tender & RFQ"
        description="Perbandingan penawaran vendor dengan skoring berbobot: harga, lead time, kepatuhan teknis, dan reputasi historis."
        count={bundle.rows.length}
        countLabel="event tender"
        secondaryActions={
          <Link href="/requisitions" className="btn btn-secondary">
            <ArrowRight className="size-3.5" aria-hidden="true" />Pengajuan terdisetujui
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Cara skor RFQ dihitung"
            subtitle="Bobot dan ambang evaluasi"
            tabs={[
              {
                id: "bobot",
                label: "Bobot",
                children: (
                  <MetricRows
                    items={[
                      { label: "Harga penawaran", value: "50%" },
                      { label: "Lead time pengiriman", value: "20%" },
                      { label: "Kepatuhan teknis", value: "15%" },
                      { label: "Skor historis vendor", value: "15%" },
                    ]}
                  />
                ),
              },
              {
                id: "aturan",
                label: "Aturan",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Penawaran terendah bukan selalu menang">
                      Skor harga dinormalkan dari penawaran terendah, tetapi lead time panjang atau kepatuhan teknis rendah bisa menurunkan
                      peringkat sebuah penawaran.
                    </NotePanel>
                    <NotePanel title="Satu pemenang per tender">
                      Setelah pemenang ditetapkan, status tender berubah menjadi sudah ada pemenang dan penawaran lain tidak bisa dipilih
                      kembali.
                    </NotePanel>
                    <NotePanel title="Ambang tender tunggal">
                      Pengajuan di atas Rp 50.000.000 wajib melalui tender agar perbandingan penawaran tercatat pada jejak audit.
                    </NotePanel>
                  </div>
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard
          label="Masih terbuka"
          value={String((bundle.counts.OPEN_FOR_BIDDING ?? 0) + (bundle.counts.EVALUATION_LOCKED ?? 0))}
          footer="Penawaran masih bisa masuk atau evaluasi berjalan"
          tone="warning"
        />
        <KpiStatCard label="Sudah ada pemenang" value={String(bundle.counts.AWARDED ?? 0)} footer="Siap diterbitkan menjadi purchase order" tone="success" />
        <KpiStatCard
          label="Penawaran terkumpul"
          value={String(bundle.rows.reduce((sum, r) => sum + r.quotations, 0))}
          footer={`Rata-rata ${formatNumber(bundle.rows.length ? bundle.rows.reduce((s, r) => s + r.quotations, 0) / bundle.rows.length : 0)} per tender`}
        />
        <KpiStatCard
          label="Penawaran terendah"
          value={formatCompactRupiah(Math.min(...bundle.rows.map((r) => r.bestBid).filter((v) => v > 0), Number.MAX_SAFE_INTEGER))}
          footer="Nilai terbaik yang tercatat pada periode ini"
        />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Event tender" description="Tenggat, partisipasi vendor, dan status evaluasi tiap tender." bare>
            <EnterpriseDataGrid count={bundle.rows.length} totalLabel={`${bundle.rows.length} event aktif`} filters={filters} searchPlaceholder="Cari nomor RFQ, judul, atau PR sumber...">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Nomor RFQ</th>
                    <th>Judul &amp; sumber</th>
                    <th className="text-right">Vendor diundang</th>
                    <th className="text-right">Penawaran</th>
                    <th className="text-right">Penawaran terendah</th>
                    <th>Tenggat</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.rows.map((row) => {
                    const days = daysUntil(row.deadlineAt);
                    return (
                      <tr key={row.id} data-row data-status={row.status}>
                        <td className="sticky-col">
                          <Link href={`/rfq/${row.id}`} className="row-link font-mono text-[12px]">
                            {row.rfqNumber}
                          </Link>
                        </td>
                        <td>
                          <div className="font-medium text-slate-800">{row.title}</div>
                          <div className="font-mono text-[10px] text-slate-400">sumber {row.prNumber}</div>
                        </td>
                        <td className="num">{formatNumber(row.invited)}</td>
                        <td className="num">{formatNumber(row.quotations)}</td>
                        <td className="num">{row.bestBid > 0 ? formatRupiah(row.bestBid) : "—"}</td>
                        <td>
                          <div className="text-[12px] text-slate-700">{formatDate(row.deadlineAt)}</div>
                          {days !== null && days >= 0 && <div className="font-mono text-[10px] text-slate-400">{days} hari lagi</div>}
                        </td>
                        <td>
                          <StatusBadge status={row.status} />
                          {row.winner && <div className="mt-0.5 text-[10px] text-slate-400">Pemenang: {row.winner}</div>}
                        </td>
                      </tr>
                    );
                  })}
                  {!bundle.rows.length && <EmptyCell colSpan={7} message="Belum ada tender aktif. Konversi purchase requisition yang sudah disetujui." />}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>

          <SectionPanel title="Papan evaluasi" description="Ringkasan penilaian pada tender yang masih berjalan.">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="inset p-4">
                <Scale className="size-4 text-slate-500" aria-hidden="true" />
                <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Normalisasi harga</h3>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Penawaran terendah menerima skor penuh. Penawaran lain diskor secara proporsional terhadap selisih harga.
                </p>
              </div>
              <div className="inset p-4">
                <Split className="size-4 text-slate-500" aria-hidden="true" />
                <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Deteksi pemecahan tender</h3>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Pengajuan berdekatan dengan total mendekati ambang ditandai untuk ditinjau ulang sebelum tender dibuka.
                </p>
              </div>
              <div className="inset p-4">
                <Timer className="size-4 text-slate-500" aria-hidden="true" />
                <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Tenggat realistis</h3>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Tenggat ideal tujuh hari sebelum tanggal kebutuhan agar lead time vendor masih muat pada jadwal operasional.
                </p>
              </div>
            </div>
          </SectionPanel>
        </div>

        <TelemetryAndDssRail
          alerts={dashboard.dssAlerts.map((a) => ({ ...a }))}
          health={[
            { label: "Buka penawaran", value: bundle.counts.OPEN_FOR_BIDDING ?? 0, tone: "warning" as const },
            { label: "Evaluasi dikunci", value: bundle.counts.EVALUATION_LOCKED ?? 0, tone: "warning" as const },
            { label: "Sudah ada pemenang", value: bundle.counts.AWARDED ?? 0, tone: "success" as const },
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

      <p className="no-print flex items-center gap-2 text-[11px] text-slate-400">
        <Gavel className="size-3" aria-hidden="true" />
        Setiap penetapan pemenang mencatat justifikasi pada jejak audit beserta skor akhir setiap penawaran.
      </p>
    </div>
  );
}
