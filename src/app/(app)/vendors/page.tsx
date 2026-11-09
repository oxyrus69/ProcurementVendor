import Link from "next/link";
import { ArrowRight, Award, Store, ThumbsUp, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { TelemetryAndDssRail } from "@/components/ui/TelemetryAndDssRail";
import { MetricRows, SectionPanel } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { getVendorBundle } from "@/server/services/moduleData";
import { getDashboardData } from "@/server/services/dashboard";
import { formatCompactRupiah, formatNumber, formatPercent, formatRupiah, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const [bundle, dashboard] = await Promise.all([getVendorBundle(), getDashboardData()]);
  const avgScore = bundle.rows.length ? bundle.rows.reduce((sum, v) => sum + v.score, 0) / bundle.rows.length : 0;
  const avgOnTime = bundle.rows.length ? bundle.rows.reduce((sum, v) => sum + v.onTime, 0) / bundle.rows.length : 0;
  const totalPoValue = bundle.rows.reduce((sum, v) => sum + v.poValue, 0);
  const probation = bundle.rows.filter((v) => v.tier === "PROBATION");

  const filters = [
    { label: "Disetujui", value: "APPROVED", count: bundle.counts.APPROVED ?? 0 },
    { label: "Masa percobaan", value: "PROBATION", count: bundle.counts.PROBATION ?? 0 },
    { label: "Dilarang", value: "BLACKLIST", count: bundle.counts.BLACKLIST ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Direktori vendor"
        description="Kinerja vendor diukur dari on-time delivery, kualitas barang diterima, daya saing harga, dan skor komposit."
        count={bundle.rows.length}
        countLabel="vendor"
        secondaryActions={
          <Link href="/api/export/vendors" className="btn btn-secondary">
            <ArrowRight className="size-3.5" aria-hidden="true" />Ekspor direktori
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Cara skor vendor dihitung"
            subtitle="Empat indikator dan ambang penurunan tier"
            tabs={[
              {
                id: "indikator",
                label: "Indikator",
                children: (
                  <MetricRows
                    items={[
                      { label: "On-time delivery", value: formatPercent(avgOnTime) },
                      { label: "Kualitas diterima", value: formatPercent(bundle.rows.length ? bundle.rows.reduce((s, v) => s + v.quality, 0) / bundle.rows.length : 0) },
                      { label: "Daya saing harga", value: formatPercent(bundle.rows.length ? bundle.rows.reduce((s, v) => s + v.price, 0) / bundle.rows.length : 0) },
                      { label: "Skor komposit rata-rata", value: avgScore.toFixed(2) },
                    ]}
                  />
                ),
              },
              {
                id: "aturan",
                label: "Aturan",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Ambang penurunan tier">
                      Vendor dengan on-time delivery di bawah 80% atau tingkat penolakan di atas 5% ditandai untuk ditinjau pada evaluasi
                      berikutnya.
                    </NotePanel>
                    <NotePanel title="Pengaruh ke tender">
                      Skor historis menyumbang 15% dari skor akhir RFQ, sehingga reputasi memengaruhi peluang menang tender.
                    </NotePanel>
                    <NotePanel title="Masa percobaan">
                      Vendor berstatus masa percobaan tetap bisa diundang ke tender, tetapi layak dipantau lebih ketat sebelum kontrak
                      besar.
                    </NotePanel>
                  </div>
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard label="Vendor aktif" value={String(bundle.rows.length)} footer={`${bundle.counts.APPROVED ?? 0} disetujui · ${probation.length} masa percobaan`} />
        <KpiStatCard label="Skor komposit rata-rata" value={avgScore.toFixed(2)} footer="Rata-rata seluruh direktori" tone={avgScore >= 85 ? "success" : "warning"} />
        <KpiStatCard label="On-time delivery rata-rata" value={formatPercent(avgOnTime)} footer="Ketepatan waktu pengiriman" tone={avgOnTime >= 90 ? "success" : "warning"} />
        <KpiStatCard label="Nilai kontrak berjalan" value={formatCompactRupiah(totalPoValue)} footer="Total PO yang diterbitkan ke vendor" />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Daftar vendor" description="Diurutkan dari skor komposit tertinggi." bare>
            <EnterpriseDataGrid
              count={bundle.rows.length}
              totalLabel={`Nilai kontrak ${formatCompactRupiah(totalPoValue)}`}
              filters={filters}
              searchPlaceholder="Cari nama vendor, kode, atau kategori..."
              exportHref="/api/export/vendors"
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Vendor</th>
                    <th>Kategori</th>
                    <th>Tier</th>
                    <th className="text-right">On-time</th>
                    <th className="text-right">Kualitas</th>
                    <th className="text-right">Harga</th>
                    <th className="text-right">Skor komposit</th>
                    <th className="text-right">Nilai kontrak</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.rows.map((v) => (
                    <tr key={v.id} data-row data-status={v.tier}>
                      <td className="sticky-col">
                        <Link href={`/vendors/${v.id}`} className="row-link">
                          {v.companyName}
                        </Link>
                        <div className="font-mono text-[11px] text-slate-500">{v.vendorCode}</div>
                      </td>
                      <td className="text-[12px] text-slate-700">{v.categorySpecialty}</td>
                      <td>
                        <StatusBadge status={v.tier} />
                      </td>
                      <td className={`num ${v.onTime < 80 ? "text-red-700" : "text-slate-700"}`}>{formatPercent(v.onTime)}</td>
                      <td className="num">{formatPercent(v.quality)}</td>
                      <td className="num">{formatPercent(v.price)}</td>
                      <td className="num font-semibold text-slate-900">{v.score.toFixed(2)}</td>
                      <td className="num text-slate-600">{formatRupiah(v.poValue)}</td>
                    </tr>
                  ))}
                  {!bundle.rows.length && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-[12px] text-slate-400">
                        Belum ada vendor terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>

          <SectionPanel title="Vendor perlu perhatian" description="Berada di bawah ambang on-time delivery atau tingkat penolakan.">
            {probation.length || bundle.rows.some((v) => v.onTime < 80 || 100 - v.quality > 5) ? (
              <div className="grid gap-3 md:grid-cols-2">
                {bundle.rows
                  .filter((v) => v.onTime < 80 || 100 - v.quality > 5)
                  .map((v) => (
                    <div key={v.id} className="inset p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/vendors/${v.id}`} className="row-link text-[12px]">
                          {v.companyName}
                        </Link>
                        <StatusBadge status={v.tier} />
                      </div>
                      <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                        <div className="flex justify-between">
                          <span>On-time delivery</span>
                          <span className="font-mono tabular-nums text-red-700">{formatPercent(v.onTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tingkat penolakan</span>
                          <span className="font-mono tabular-nums">{formatPercent(100 - v.quality)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-[12px] text-slate-400">Semua vendor berada di atas ambang kinerja minimum.</p>
            )}
          </SectionPanel>
        </div>

        <TelemetryAndDssRail
          alerts={dashboard.dssAlerts.map((a) => ({ ...a }))}
          health={[
            { label: "Disetujui", value: bundle.counts.APPROVED ?? 0, tone: "success" as const },
            { label: "Masa percobaan", value: probation.length, tone: "warning" as const },
            { label: "Perlu evaluasi", value: bundle.rows.filter((v) => v.onTime < 80 || 100 - v.quality > 5).length, tone: "danger" as const },
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
          <Users className="size-3" aria-hidden="true" />{formatNumber(bundle.rows.length)} vendor terdaftar.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Award className="size-3" aria-hidden="true" />Skor historis menyumbang 15% skor tender.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ThumbsUp className="size-3" aria-hidden="true" />Rata-rata kualitas {formatPercent(bundle.rows.length ? bundle.rows.reduce((s, v) => s + v.quality, 0) / bundle.rows.length : 0)}.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Store className="size-3" aria-hidden="true" />Portal vendor terpisah untuk mitra.
        </span>
      </p>
    </div>
  );
}
