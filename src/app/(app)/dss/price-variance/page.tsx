import Link from "next/link";
import { ArrowLeft, Percent, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { ChartCardWithDataMatrix } from "@/components/ui/ChartCardWithDataMatrix";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { MetricRows, SectionPanel, UtilisationBar } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { getDssBundle } from "@/server/services/moduleData";
import { formatNumber, formatPercent, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DssPriceVariancePage() {
  const bundle = await getDssBundle();
  const flagged = bundle.priceRows.filter((r) => r.flagged).sort((a, b) => b.pct - a.pct);
  const withinRange = bundle.priceRows.filter((r) => !r.flagged);
  const totalDelta = bundle.priceRows.reduce((sum, r) => sum + Math.max(r.delta, 0), 0);
  const worst = flagged[0];

  const tabs = [
    { href: "/dss", label: "Ringkasan temuan", count: bundle.priceFindings.length + bundle.vendorFindings.length },
    { href: "/dss/price-variance", label: "Analitik harga", count: flagged.length },
    { href: "/dss/vendor-matrix", label: "Matriks vendor", count: bundle.vendors.length },
    { href: "/dss/riwayat", label: "Riwayat keputusan" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analitik kenaikan harga"
        description="Perbandingan harga realisasi pada baris purchase order terhadap harga acuan katalog internal."
        count={flagged.length}
        countLabel="baris di atas acuan"
        tabs={tabs}
        secondaryActions={
          <Link href="/dss" className="btn btn-secondary">
            <ArrowLeft className="size-3.5" aria-hidden="true" />Ringkasan temuan
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Ambang harga acuan"
            subtitle="Kenapa sebuah baris ditandai"
            tabs={[
              {
                id: "ambang",
                label: "Ambang",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Ambang 10%">
                      Baris ditandai ketika harga realisasi melebihi harga acuan lebih dari 10%. Ambang ini memberi ruang untuk kenaikan
                      pasar wajar.
                    </NotePanel>
                    <NotePanel title="Bukan keputusan otomatis">
                      Temuan ini bahan pertimbangan. Bila harga pasar memang naik, perbarui harga acuan katalog agar analitik berikutnya
                      akurat.
                    </NotePanel>
                  </div>
                ),
              },
              {
                id: "total",
                label: "Total",
                children: (
                  <MetricRows
                    items={[
                      { label: "Baris di atas acuan", value: String(flagged.length) },
                      { label: "Baris dalam rentang", value: String(withinRange.length) },
                      { label: "Total selisih positif", value: formatRupiah(totalDelta) },
                      { label: "Selisih terbesar", value: worst ? formatPercent(worst.pct) : "—" },
                    ]}
                  />
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard
          label="Baris di atas acuan"
          value={String(flagged.length)}
          footer={`dari ${bundle.priceRows.length} baris purchase order`}
          tone={flagged.length ? "danger" : "success"}
        />
        <KpiStatCard label="Total selisih positif" value={formatRupiah(totalDelta)} footer="Akumulasi harga di atas harga acuan" />
        <KpiStatCard
          label="Selisih terbesar"
          value={worst ? formatPercent(worst.pct) : "—"}
          footer={worst ? worst.item : "Tidak ada temuan"}
          tone={worst ? "danger" : "success"}
        />
        <KpiStatCard label="Baris dalam rentang" value={String(withinRange.length)} footer="Harga realisasi masih wajar terhadap acuan" tone="success" />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {flagged.length > 0 && (
            <ChartCardWithDataMatrix
              title="Selisih terhadap harga acuan"
              description="Selisih rupiah per barang yang melampaui ambang 10%."
              rows={flagged.map((r) => ({ label: r.item, value: Math.round(r.delta) }))}
              unit="rupiah"
            />
          )}

          <SectionPanel title="Baris di atas harga acuan" description="Diurutkan dari persentase selisih terbesar." bare>
            <EnterpriseDataGrid
              count={flagged.length}
              totalLabel={`Total selisih ${formatRupiah(totalDelta)}`}
              filters={[{ label: "Ditandai", value: "FLAGGED", count: flagged.length }]}
              searchPlaceholder="Cari nama barang atau kode..."
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
                  {!flagged.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[12px] text-slate-400">
                        Semua baris purchase order berada dalam rentang harga acuan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>

          <SectionPanel title="Baris dalam rentang" description="Harga realisasi masih wajar terhadap harga acuan katalog.">
            <div className="grid gap-3 md:grid-cols-2">
              {withinRange.slice(0, 8).map((row) => (
                <div key={`${row.itemCode}-${row.item}`} className="inset flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-slate-800">{row.item}</div>
                    <div className="font-mono text-[10px] text-slate-400">{row.itemCode}</div>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-emerald-700">{formatPercent(row.pct)}</span>
                </div>
              ))}
              {!withinRange.length && <p className="text-[12px] text-slate-400">Tidak ada baris dalam rentang.</p>}
            </div>
          </SectionPanel>
        </div>

        <div className="space-y-5">
          <SectionPanel title="Ringkasan analitik" description="Angka agregat dari seluruh baris purchase order.">
            <MetricRows
              items={[
                { label: "Baris diperiksa", value: String(bundle.priceRows.length) },
                { label: "Di atas acuan", value: String(flagged.length) },
                { label: "Dalam rentang", value: String(withinRange.length) },
                { label: "Total selisih positif", value: formatRupiah(totalDelta), emphasis: true, tone: totalDelta > 0 ? "warning" : "success" },
              ]}
            />
          </SectionPanel>

          <SectionPanel title="Tindakan lanjut" description="Langkah yang disarankan setelah temuan muncul.">
            <div className="space-y-3 text-[11px] leading-4 text-slate-600">
              <p>
                1. Minta justifikasi harga kepada vendor untuk barang dengan selisih terbesar sebelum tender berikutnya dibuka.
              </p>
              <p>2. Bandingkan dengan penawaran tender lain untuk memastikan harga realisasi masih kompetitif.</p>
              <p>3. Bila harga pasar memang naik, perbarui harga acuan katalog agar analitik berikutnya tidak bias.</p>
            </div>
          </SectionPanel>
        </div>
      </div>

      <p className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Percent className="size-3" aria-hidden="true" />Ambang penandaan {formatPercent(10)} di atas harga acuan.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Scale className="size-3" aria-hidden="true" />Harga acuan diambil dari katalog internal, bukan harga pasar eksternal.
        </span>
      </p>
    </div>
  );
}
