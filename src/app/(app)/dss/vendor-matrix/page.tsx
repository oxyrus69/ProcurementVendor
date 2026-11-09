import Link from "next/link";
import { ArrowLeft, Award, ThumbsUp } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { MetricRows, SectionPanel, UtilisationBar } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { getDssBundle } from "@/server/services/moduleData";
import { formatNumber, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DssVendorMatrixPage() {
  const bundle = await getDssBundle();
  const vendors = [...bundle.vendors].sort((a, b) => b.score - a.score);
  const avgScore = vendors.length ? vendors.reduce((sum, v) => sum + v.score, 0) / vendors.length : 0;
  const needsReview = vendors.filter((v) => v.onTime < 80 || v.rejectRate > 5);

  const tabs = [
    { href: "/dss", label: "Ringkasan temuan", count: bundle.priceFindings.length + bundle.vendorFindings.length },
    { href: "/dss/price-variance", label: "Analitik harga", count: bundle.priceRows.filter((r) => r.flagged).length },
    { href: "/dss/vendor-matrix", label: "Matriks vendor", count: vendors.length },
    { href: "/dss/riwayat", label: "Riwayat keputusan" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Matriks vendor"
        description="Posisi setiap vendor pada tiga indikator: ketepatan pengiriman, kualitas barang, dan skor komposit."
        count={vendors.length}
        countLabel="vendor"
        tabs={tabs}
        secondaryActions={
          <Link href="/vendors" className="btn btn-secondary">
            <ArrowLeft className="size-3.5" aria-hidden="true" />Direktori vendor
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Ambang evaluasi vendor"
            subtitle="Kapan sebuah vendor perlu ditinjau"
            tabs={[
              {
                id: "ambang",
                label: "Ambang",
                children: (
                  <MetricRows
                    items={[
                      { label: "On-time delivery minimum", value: "80%" },
                      { label: "Tingkat penolakan maksimum", value: "5%" },
                      { label: "Skor komposit rata-rata", value: avgScore.toFixed(2) },
                      { label: "Perlu evaluasi", value: String(needsReview.length) },
                    ]}
                  />
                ),
              },
              {
                id: "aturan",
                label: "Aturan",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Dua syarat penurunan tier">
                      Vendor ditandai ketika on-time delivery di bawah 80% atau tingkat penolakan di atas 5%. Salah satu syarat cukup.
                    </NotePanel>
                    <NotePanel title="Skor historis di tender">
                      Skor historis menyumbang 15% dari skor akhir RFQ, sehingga vendor berkinerja baik punya keuntungan nyata.
                    </NotePanel>
                  </div>
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard label="Vendor dinilai" value={String(vendors.length)} footer="Seluruh direktori vendor aktif" />
        <KpiStatCard
          label="Skor rata-rata"
          value={avgScore.toFixed(2)}
          footer="Rata-rata skor komposit direktori"
          tone={avgScore >= 85 ? "success" : "warning"}
        />
        <KpiStatCard
          label="Perlu evaluasi"
          value={String(needsReview.length)}
          footer={needsReview.length ? "Di bawah ambang on-time atau kualitas" : "Semua vendor memenuhi ambang"}
          tone={needsReview.length ? "danger" : "success"}
        />
        <KpiStatCard
          label="On-time rata-rata"
          value={formatPercent(vendors.length ? vendors.reduce((s, v) => s + v.onTime, 0) / vendors.length : 0)}
          footer="Ketepatan waktu pengiriman gabungan"
        />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Matriks kinerja" description="Diurutkan dari skor komposit tertinggi. Baris di bawah ambang ditandai." bare>
            <EnterpriseDataGrid
              count={vendors.length}
              totalLabel={`Skor rata-rata ${avgScore.toFixed(2)}`}
              filters={[
                { label: "Perlu evaluasi", value: "REVIEW", count: needsReview.length },
                { label: "Memenuhi ambang", value: "OK", count: vendors.length - needsReview.length },
              ]}
              searchPlaceholder="Cari nama vendor atau tier..."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Vendor</th>
                    <th>Tier</th>
                    <th className="text-right">On-time</th>
                    <th className="w-32">Ketepatan</th>
                    <th className="text-right">Kualitas</th>
                    <th className="w-32">Kualitas bar</th>
                    <th className="text-right">Penolakan</th>
                    <th className="text-right">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => {
                    const review = v.onTime < 80 || v.rejectRate > 5;
                    return (
                      <tr key={v.id} data-row data-status={review ? "REVIEW" : "OK"}>
                        <td className="sticky-col">
                          <Link href={`/vendors/${v.id}`} className="row-link">
                            {v.name}
                          </Link>
                        </td>
                        <td>
                          <StatusBadge status={v.tier} />
                        </td>
                        <td className={`num ${v.onTime < 80 ? "text-red-700" : "text-slate-700"}`}>{formatPercent(v.onTime)}</td>
                        <td>
                          <UtilisationBar pct={v.onTime} />
                        </td>
                        <td className={`num ${100 - v.quality > 5 ? "text-amber-700" : "text-slate-700"}`}>{formatPercent(v.quality)}</td>
                        <td>
                          <UtilisationBar pct={v.quality} />
                        </td>
                        <td className="num text-slate-500">{formatPercent(v.rejectRate)}</td>
                        <td className="num font-semibold text-slate-900">{v.score.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {!vendors.length && (
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

          <SectionPanel title="Vendor perlu evaluasi" description="Rekomendasi penurunan tier atau pengawasan ketat.">
            {needsReview.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {needsReview.map((v) => (
                  <div key={v.id} className="inset p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/vendors/${v.id}`} className="row-link text-[12px]">
                        {v.name}
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
                        <span className="font-mono tabular-nums">{formatPercent(v.rejectRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Skor komposit</span>
                        <span className="font-mono tabular-nums">{v.score.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-slate-400">Semua vendor memenuhi ambang kinerja minimum.</p>
            )}
          </SectionPanel>
        </div>

        <div className="space-y-5">
          <SectionPanel title="Distribusi kinerja" description="Sebaran vendor terhadap ambang evaluasi.">
            <MetricRows
              items={[
                { label: "Memenuhi ambang", value: String(vendors.length - needsReview.length) },
                { label: "Perlu evaluasi", value: String(needsReview.length) },
                { label: "On-time terendah", value: formatPercent(vendors.length ? Math.min(...vendors.map((v) => v.onTime)) : 0) },
                { label: "Skor tertinggi", value: vendors.length ? Math.max(...vendors.map((v) => v.score)).toFixed(2) : "—" },
              ]}
            />
          </SectionPanel>

          <SectionPanel title="Dampak ke tender" description="Bagaimana matriks ini dipakai saat evaluasi.">
            <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Award className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <p className="text-[11px] leading-4 text-slate-600">
                Skor historis menyumbang 15% dari skor akhir RFQ. Vendor berkinerja baik mendapat keuntungan nyata meski harganya sedikit
                di atas pesaing.
              </p>
            </div>
          </SectionPanel>
        </div>
      </div>

      <p className="no-print flex items-center gap-2 text-[11px] text-slate-400">
        <ThumbsUp className="size-3" aria-hidden="true" />
        {needsReview.length ? `${needsReview.length} vendor perlu evaluasi berkala.` : "Seluruh vendor memenuhi ambang kinerja."} Data
        dihitung dari {formatNumber(vendors.length)} vendor aktif.
      </p>
    </div>
  );
}
