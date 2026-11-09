import Link from "next/link";
import { ArrowLeft, Binary, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { MetricRows, SectionPanel, TimelineList } from "@/components/ui/Sections";
import { EmptyState, NotePanel } from "@/components/ui/Primitives";
import { getDssBundle, getSettingsBundle } from "@/server/services/moduleData";
import { formatDateTime, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DssRiwayatPage() {
  const [bundle, settings] = await Promise.all([getDssBundle(), getSettingsBundle()]);

  const tabs = [
    { href: "/dss", label: "Ringkasan temuan", count: bundle.priceFindings.length + bundle.vendorFindings.length },
    { href: "/dss/price-variance", label: "Analitik harga", count: bundle.priceRows.filter((r) => r.flagged).length },
    { href: "/dss/vendor-matrix", label: "Matriks vendor", count: bundle.vendors.length },
    { href: "/dss/riwayat", label: "Riwayat keputusan" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Riwayat keputusan"
        description="Aturan keputusan terdaftar beserta hasil yang pernah dijalankan sistem."
        count={settings.decisions.length}
        countLabel="keputusan tercatat"
        tabs={tabs}
        secondaryActions={
          <Link href="/dss" className="btn btn-secondary">
            <ArrowLeft className="size-3.5" aria-hidden="true" />Ringkasan temuan
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Aturan keputusan"
            subtitle="Ambang yang dipakai mesin rekomendasi"
            tabs={[
              {
                id: "aturan",
                label: "Aturan",
                children: (
                  <MetricRows
                    items={[
                      { label: "Kenaikan harga di atas acuan", value: "> 10%" },
                      { label: "On-time delivery minimum", value: "80%" },
                      { label: "Tingkat penolakan maksimum", value: "5%" },
                      { label: "Ambang tender tunggal", value: "Rp 50.000.000" },
                    ]}
                  />
                ),
              },
              {
                id: "catatan",
                label: "Catatan",
                children: (
                  <NotePanel title="Riwayat masih kosong">
                    Mesin rekomendasi mencatat hasil setiap kali aturan dievaluasi. Selama belum ada evaluasi yang dijalankan, halaman ini
                    hanya menampilkan daftar aturan yang tersedia.
                  </NotePanel>
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard label="Aturan terdaftar" value={String(settings.rules.length)} footer="Ambang keputusan yang aktif" />
        <KpiStatCard label="Keputusan tercatat" value={String(settings.decisions.length)} footer={settings.decisions.length ? "Hasil evaluasi yang sudah dijalankan" : "Belum ada evaluasi dijalankan"} tone={settings.decisions.length ? "success" : "neutral"} />
        <KpiStatCard label="Temuan aktif" value={String(bundle.priceFindings.length + bundle.vendorFindings.length)} footer="Temuan pada periode berjalan" tone={bundle.priceFindings.length + bundle.vendorFindings.length ? "warning" : "success"} />
        <KpiStatCard label="Pengaturan ambang" value={String(settings.settings.length)} footer="Nilai ambang yang bisa disesuaikan" />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Aturan keputusan" description="Daftar aturan beserta ambang yang dipakai mesin rekomendasi." bare>
            <EnterpriseDataGrid
              count={settings.rules.length}
              totalLabel={`${settings.rules.length} aturan terdaftar`}
              searchPlaceholder="Cari nama aturan..."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Nama aturan</th>
                    <th className="text-right">Ambang</th>
                    <th className="text-right">Keputusan tercatat</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.rules.map((rule) => {
                    const used = settings.decisions.filter((d) => d.ruleName === rule.name).length;
                    return (
                      <tr key={rule.id} data-row data-status={used > 0 ? "MATCHED_PASSED" : "UNVERIFIED"}>
                        <td className="sticky-col">
                          <div className="font-medium text-slate-800">{rule.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">{rule.id.slice(0, 8)}</div>
                        </td>
                        <td className="num">{rule.threshold ? formatNumber(Number(rule.threshold)) : "Tidak berlaku"}</td>
                        <td className="num">{used}</td>
                      </tr>
                    );
                  })}
                  {!settings.rules.length && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-[12px] text-slate-400">
                        Belum ada aturan keputusan terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>

          <SectionPanel title="Hasil keputusan" description="Riwayat hasil evaluasi aturan, dari yang terbaru.">
            {settings.decisions.length ? (
              <TimelineList
                items={settings.decisions.map((d) => ({
                  title: d.ruleName ?? "Aturan tidak bernama",
                  detail: `Hasil: ${d.result}`,
                  at: formatDateTime(d.createdAt),
                  tone: d.result === "PASSED" ? ("success" as const) : d.result === "FAILED" ? ("danger" as const) : ("warning" as const),
                }))}
              />
            ) : (
              <EmptyState
                title="Belum ada keputusan tercatat"
                detail="Mesin rekomendasi akan mencatat hasil setiap kali aturan dievaluasi terhadap data transaksi terbaru."
                action={{ href: "/dss", label: "Lihat temuan aktif" }}
              />
            )}
          </SectionPanel>
        </div>

        <div className="space-y-5">
          <SectionPanel title="Ambang aktif" description="Nilai ambang yang saat ini dipakai sistem.">
            <MetricRows
              items={settings.settings.map((s) => ({
                label: s.key,
                value: s.value,
                mono: true as const,
              }))}
            />
            {!settings.settings.length && <p className="text-[12px] text-slate-400">Belum ada pengaturan ambang.</p>}
          </SectionPanel>

          <SectionPanel title="Temuan periode ini" description="Ringkasan temuan yang dihasilkan aturan saat ini.">
            <div className="space-y-2 text-[11px] leading-4 text-slate-600">
              <p>
                Kenaikan harga: {bundle.priceFindings.length} barang di atas acuan. Performa vendor: {bundle.vendorFindings.length} vendor
                di bawah ambang.
              </p>
              <p>
                Pola pengajuan: {bundle.stats.splitOrder} kombinasi yang mendekati ambang tender tunggal.
              </p>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Binary className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <p className="text-[11px] leading-4 text-slate-600">
                Ambang dapat disesuaikan pada halaman pengaturan sistem. Perubahan ambang berlaku untuk evaluasi berikutnya.
              </p>
            </div>
          </SectionPanel>
        </div>
      </div>

      <p className="no-print flex items-center gap-2 text-[11px] text-slate-400">
        <ScrollText className="size-3" aria-hidden="true" />
        Setiap keputusan penting sistem juga tercatat pada jejak audit modul sistem.
      </p>
    </div>
  );
}
