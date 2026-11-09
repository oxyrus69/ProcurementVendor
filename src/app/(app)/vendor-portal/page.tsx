import Link from "next/link";
import { Receipt, Store, Truck, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { FieldList, MetricRows, SectionPanel } from "@/components/ui/Sections";
import { EmptyState, NotePanel } from "@/components/ui/Primitives";
import { getVendorBundle } from "@/server/services/moduleData";
import { getSession } from "@/server/auth";
import { formatCompactRupiah, formatDate, formatDateTime, formatNumber, formatPercent, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VendorPortalPage() {
  const session = await getSession();
  const bundle = await getVendorBundle();
  const vendor = session?.vendorId ? bundle.rows.find((v) => v.id === session.vendorId) : bundle.rows[0];

  if (!vendor) {
    return (
      <div className="space-y-5">
        <PageHeader title="Portal vendor" description="Tampilan khusus mitra untuk memantau kontrak dan tagihan." />
        <EmptyState
          title="Belum ada vendor terkait"
          detail="Akun ini belum terhubung ke data vendor. Hubungi tim pengadaan untuk menghubungkan akun ke badan usaha."
          action={{ href: "/admin", label: "Kembali ke dasbor" }}
        />
      </div>
    );
  }

  const openPos = vendor.poCount;
  const paidInvoices = vendor.poCount > 0 ? formatCompactRupiah(vendor.poValue) : "Rp 0";

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Portal ${vendor.companyName}`}
        description="Posisi kontrak, penawaran, dan tagihan untuk badan usaha ini."
        count={vendor.poCount}
        countLabel="kontrak aktif"
        actions={
          <InspectorDrawer
            title="Panduan portal vendor"
            subtitle="Apa yang bisa dipantau mitra"
            tabs={[
              {
                id: "panduan",
                label: "Panduan",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Kontrak">
                      Setiap purchase order menampilkan jadwal kirim, tempo bayar, dan status penerimaan barang.
                    </NotePanel>
                    <NotePanel title="Tagihan">
                      Tagihan dicocokkan dengan nilai PO dan kuantitas yang diterima baik. Selisih di atas toleransi menahan pembayaran.
                    </NotePanel>
                    <NotePanel title="Kinerja">
                      On-time delivery dan kualitas barang diterima menentukan skor komposit yang dipakai pada evaluasi tender.
                    </NotePanel>
                  </div>
                ),
              },
              {
                id: "kinerja",
                label: "Kinerja",
                children: (
                  <MetricRows
                    items={[
                      { label: "On-time delivery", value: formatPercent(vendor.onTime) },
                      { label: "Kualitas diterima", value: formatPercent(vendor.quality) },
                      { label: "Daya saing harga", value: formatPercent(vendor.price) },
                      { label: "Skor komposit", value: vendor.score.toFixed(2) },
                    ]}
                  />
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard label="Skor komposit" value={vendor.score.toFixed(2)} footer={`Tier ${vendor.tier}`} tone={vendor.score >= 85 ? "success" : "warning"} />
        <KpiStatCard
          label="On-time delivery"
          value={formatPercent(vendor.onTime)}
          footer={vendor.onTime < 80 ? "Perlu perbaatan pengiriman" : "Pengiriman tepat waktu"}
          tone={vendor.onTime < 80 ? "danger" : "success"}
        />
        <KpiStatCard label="Nilai kontrak" value={formatRupiah(vendor.poValue)} footer={`${formatNumber(vendor.poCount)} purchase order`} />
        <KpiStatCard
          label="Kualitas diterima"
          value={formatPercent(vendor.quality)}
          footer="Barang lolos inspeksi gudang"
          tone={vendor.quality >= 95 ? "success" : "warning"}
        />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Posisi kontrak" description="Ringkasan nilai yang sudah diterbitkan ke badan usaha ini." bare>
            <EnterpriseDataGrid
              count={vendor.poCount}
              totalLabel={`Nilai kontrak ${formatCompactRupiah(vendor.poValue)}`}
              searchPlaceholder="Cari kontrak atau status..."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Indikator</th>
                    <th className="text-right">Nilai</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr data-row data-status="APPROVED">
                    <td className="sticky-col font-medium text-slate-800">Purchase order aktif</td>
                    <td className="num font-semibold text-slate-900">{formatNumber(vendor.poCount)}</td>
                    <td className="text-[12px] text-slate-600">Kontrak yang masih berjalan atau sudah selesai</td>
                  </tr>
                  <tr data-row data-status="ISSUED_SENT">
                    <td className="sticky-col font-medium text-slate-800">Nilai kontrak</td>
                    <td className="num font-semibold text-slate-900">{formatRupiah(vendor.poValue)}</td>
                    <td className="text-[12px] text-slate-600">Total nilai purchase order yang diterbitkan</td>
                  </tr>
                  <tr data-row data-status="FULLY_RECEIVED">
                    <td className="sticky-col font-medium text-slate-800">Nilai tagihan tercatat</td>
                    <td className="num font-semibold text-slate-900">{paidInvoices}</td>
                    <td className="text-[12px] text-slate-600">Nilai kontrak yang sudah menghasilkan tagihan</td>
                  </tr>
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>

          <SectionPanel title="Yang dipantau tim pengadaan" description="Indikator yang menentukan posisi vendor pada evaluasi tender.">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="inset p-4">
                <Truck className="size-4 text-slate-500" aria-hidden="true" />
                <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Ketepatan pengiriman</h3>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">{formatPercent(vendor.onTime)}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">Ambang minimum 80%. Di bawah itu menurunkan peluang menang tender.</p>
              </div>
              <div className="inset p-4">
                <Receipt className="size-4 text-slate-500" aria-hidden="true" />
                <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Kualitas barang</h3>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">{formatPercent(vendor.quality)}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">Barang yang lolos inspeksi gudang dari total yang dikirim.</p>
              </div>
              <div className="inset p-4">
                <Wallet className="size-4 text-slate-500" aria-hidden="true" />
                <h3 className="mt-2 text-[12px] font-semibold text-slate-800">Daya saing harga</h3>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">{formatPercent(vendor.price)}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">Perbandingan harga terhadap harga acuan katalog internal.</p>
              </div>
            </div>
          </SectionPanel>
        </div>

        <div className="space-y-5">
          <SectionPanel title="Identitas badan usaha" description="Data yang dipakai pada dokumen resmi.">
            <FieldList
              items={[
                { label: "Kode vendor", value: vendor.vendorCode, mono: true },
                { label: "Nama badan usaha", value: vendor.companyName },
                { label: "NPWP", value: vendor.npwp, mono: true },
                { label: "Email", value: vendor.contactEmail, mono: true },
                { label: "Telepon", value: vendor.phone, mono: true },
                { label: "Spesialisasi", value: vendor.categorySpecialty },
                { label: "Tier", value: <StatusBadge status={vendor.tier} /> },
                { label: "Rekening", value: vendor.bankAccountInfo, mono: true },
              ]}
            />
          </SectionPanel>

          <SectionPanel title="Status kinerja" description="Posisi vendor terhadap ambang evaluasi.">
            <MetricRows
              items={[
                { label: "Skor komposit", value: vendor.score.toFixed(2), emphasis: true, tone: vendor.score >= 85 ? "success" : "warning" },
                { label: "On-time delivery", value: formatPercent(vendor.onTime), emphasis: vendor.onTime < 80, tone: vendor.onTime < 80 ? "danger" : "neutral" },
                { label: "Tingkat penolakan", value: formatPercent(100 - vendor.quality) },
                { label: "Daya saing harga", value: formatPercent(vendor.price) },
              ]}
            />
            <div className="mt-3 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Store className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <p className="text-[11px] leading-4 text-slate-600">
                {vendor.onTime < 80 || 100 - vendor.quality > 5
                  ? "Kinerja di bawah ambang. Perbaiki ketepatan pengiriman dan kualitas barang sebelum tender berikutnya."
                  : "Kinerja memenuhi ambang. Pertahankan ketepatan pengiriman untuk menjaga skor komposit."}
              </p>
            </div>
          </SectionPanel>

          <SectionPanel title="Akses akun" description="Akun portal yang sedang dipakai.">
            <FieldList
              items={[
                { label: "Email", value: session?.email ?? "—", mono: true },
                { label: "Nama pengguna", value: session?.fullName ?? "—" },
                { label: "Peran", value: session?.role ?? "—", mono: true },
                { label: "Badan usaha", value: vendor.companyName },
              ]}
            />
          </SectionPanel>
        </div>
      </div>

      <p className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Wallet className="size-3" aria-hidden="true" />Nilai kontrak {formatRupiah(vendor.poValue)}.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Truck className="size-3" aria-hidden="true" />Skor komposit {vendor.score.toFixed(2)}.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Store className="size-3" aria-hidden="true" />Tier {vendor.tier} · diperbarui {formatDate(new Date())}.
        </span>
      </p>
    </div>
  );
}
