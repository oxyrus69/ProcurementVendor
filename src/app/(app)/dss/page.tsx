import Link from "next/link";
import { ArrowRight, Binary, Radar, Scale, Siren } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { TelemetryAndDssRail } from "@/components/ui/TelemetryAndDssRail";
import { EmptyCell, MetricRows, SectionPanel, UtilisationBar } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { getDssBundle } from "@/server/services/moduleData";
import { getDashboardData } from "@/server/services/dashboard";
import { formatCompactRupiah, formatDate, formatNumber, formatPercent, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DssPage() {
  const [bundle, dashboard] = await Promise.all([getDssBundle(), getDashboardData()]);
  const flagged = bundle.priceRows.filter((r) => r.flagged);

  const tabs = [
    { href: "/dss", label: "Ringkasan temuan", count: bundle.priceFindings.length + bundle.vendorFindings.length },
    { href: "/dss/price-variance", label: "Analitik harga", count: flagged.length },
    { href: "/dss/vendor-matrix", label: "Matriks vendor", count: bundle.vendors.length },
    { href: "/dss/riwayat", label: "Riwayat keputusan" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Decision support"
        description="Temuan berbasis data transaksi aktual: kenaikan harga di atas acuan, performa vendor, dan pola pengajuan mencurigakan."
        count={bundle.priceFindings.length + bundle.vendorFindings.length}
        countLabel="temuan aktif"
        tabs={tabs}
        secondaryActions={
          <Link href="/dss/price-variance" className="btn btn-secondary">
            <ArrowRight className="size-3.5" aria-hidden="true" />Analitik harga
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Cara temuan dihasilkan"
            subtitle="Ambang dan data yang dipakai"
            tabs={[
              {
                id: "ambang",
                label: "Ambang",
                children: (
                  <MetricRows
                    items={[
                      { label: "Kenaikan harga di atas HPS", value: "> 10%" },
                      { label: "On-time delivery minimum", value: "80%" },
                      { label: "Tingkat penolakan maksimum", value: "5%" },
                      { label: "Ambang tender tunggal", value: formatRupiah(50_000_000) },
                    ]}
                  />
                ),
              },
              {
                id: "data",
                label: "Sumber data",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Harga realisasi">
                      Harga satuan pada baris purchase order dibandingkan dengan harga acuan katalog. Selisih di atas 10% ditandai.
                    </NotePanel>
                    <NotePanel title="Performa vendor">
                      On-time delivery dan tingkat penolakan dihitung dari berita acara penerimaan yang sudah tercatat.
                    </NotePanel>
                    <NotePanel title="Pola pengajuan">
                      Pengajuan berdekatan dengan total mendekati ambang tender ditinjau sebagai pola pemecahan tender.
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
          label="Temuan harga"
          value={String(bundle.stats.priceCreep)}
          footer={`${bundle.stats.itemsAboveHps} dari ${bundle.stats.itemsSampled} baris PO di atas acuan`}
          tone={bundle.stats.priceCreep ? "danger" : "success"}
        />
        <KpiStatCard
          label="Vendor perlu evaluasi"
          value={String(bundle.stats.vendorDowngrade)}
          footer="Di bawah ambang on-time atau kualitas"
          tone={bundle.stats.vendorDowngrade ? "warning" : "success"}
        />
        <KpiStatCard
          label="Pola pengajuan"
          value={String(bundle.stats.splitOrder)}
          footer="Kombinasi pengajuan mendekati ambang tender"
          tone={bundle.stats.splitOrder ? "warning" : "success"}
        />
        <KpiStatCard
          label="Selisih harga terkumpul"
          value={formatCompactRupiah(flagged.reduce((sum, r) => sum + r.delta, 0))}
          footer="Nilai di atas harga acuan pada baris tertandai"
        />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Temuan kenaikan harga" description="Harga realisasi PO melebihi harga acuan katalog lebih dari 10%." bare>
            <EnterpriseDataGrid
              count={bundle.priceFindings.length}
              totalLabel={`${flagged.length} baris di atas acuan`}
              filters={[{ label: "Ditandai", value: "FLAGGED", count: flagged.length }]}
              searchPlaceholder="Cari nama barang..."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Barang</th>
                    <th className="text-right">Harga realisasi</th>
                    <th className="text-right">Harga acuan</th>
                    <th className="text-right">Selisih</th>
                    <th className="text-right">Persen</th>
                    <th className="w-40">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {flagged.map((row) => (
                    <tr key={`${row.itemCode}-${row.item}`} data-row data-status="FLAGGED">
                      <td className="sticky-col">
                        <div className="font-medium text-slate-800">{row.item}</div>
                        <div className="font-mono text-[10px] text-slate-400">{row.itemCode}</div>
                      </td>
                      <td className="num">{formatRupiah(row.price)}</td>
                      <td className="num text-slate-500">{formatRupiah(row.hps)}</td>
                      <td className="num text-amber-700">{formatRupiah(row.delta)}</td>
                      <td className="num font-semibold text-amber-700">{formatPercent(row.pct)}</td>
                      <td>
                        <UtilisationBar pct={Math.min(row.pct * 5, 100)} />
                      </td>
                    </tr>
                  ))}
                  {!flagged.length && <EmptyCell colSpan={6} message="Tidak ada barang dengan harga realisasi di atas acuan." />}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>

          <SectionPanel title="Rekomendasi vendor" description="Vendor yang perlu ditinjau pada evaluasi berkala.">
            {bundle.vendorFindings.length ? (
              <ul className="space-y-2">
                {bundle.vendorFindings.map((f) => {
                  const vendor = bundle.vendors.find((v) => v.name === f.subject);
                  return (
                    <li key={f.subject} className="inset flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-slate-800">{f.subject}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          on-time {formatPercent(vendor?.onTime ?? 0)} · penolakan {formatPercent(vendor?.rejectRate ?? 0)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={vendor?.tier ?? "APPROVED"} />
                        <Link href="/dss/vendor-matrix" className="btn btn-secondary !min-h-7 !px-2 !py-1 text-[11px]">
                          Matriks
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[12px] text-slate-400">Semua vendor memenuhi ambang kinerja minimum.</p>
            )}
          </SectionPanel>
        </div>

        <TelemetryAndDssRail
          alerts={dashboard.dssAlerts.map((a) => ({ ...a }))}
          health={[
            { label: "Temuan harga", value: bundle.stats.priceCreep, tone: "danger" as const },
            { label: "Vendor perlu evaluasi", value: bundle.stats.vendorDowngrade, tone: "warning" as const },
            { label: "Pola pengajuan", value: bundle.stats.splitOrder, tone: "warning" as const },
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

      <SectionPanel title="Cara memakai temuan" description="Temuan DSS bukan keputusan otomatis, melainkan bahan pertimbangan.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="inset p-4">
            <Scale className="size-4 text-slate-500" aria-hidden="true" />
            <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Minta justifikasi harga</h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Untuk barang di atas acuan, minta penjelasan vendor sebelum tender berikutnya dan catat pada justifikasi pemenang.
            </p>
          </div>
          <div className="inset p-4">
            <Radar className="size-4 text-slate-500" aria-hidden="true" />
            <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Pantau pola pengajuan</h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Pengajuan yang dipecah agar di bawah ambang tender menghilangkan perbandingan penawaran. Gabungkan bila memang satu kebutuhan.
            </p>
          </div>
          <div className="inset p-4">
            <Binary className="size-4 text-slate-500" aria-hidden="true" />
            <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Perbarui harga acuan</h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Bila harga pasar memang naik, perbarui harga acuan katalog agar temuan berikutnya tidak bias.
            </p>
          </div>
        </div>
      </SectionPanel>

      <p className="no-print flex items-center gap-2 text-[11px] text-slate-400">
        <Siren className="size-3" aria-hidden="true" />
        {bundle.priceFindings.length + bundle.vendorFindings.length} temuan aktif pada periode berjalan. Riwayat keputusan tersedia pada
        tab riwayat.
      </p>
    </div>
  );
}
