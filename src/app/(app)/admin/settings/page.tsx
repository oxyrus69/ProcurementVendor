import Link from "next/link";
import { Database, KeyRound, Settings, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { MetricRows, SectionPanel, TimelineList } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { getSettingsBundle } from "@/server/services/moduleData";
import { getDashboardData } from "@/server/services/dashboard";
import { formatDateTime, formatNumber, formatRelative, humanizeRole } from "@/lib/format";

const SETTING_LABELS: Record<string, { label: string; hint: string }> = {
  priceTolerancePct: { label: "Toleransi harga", hint: "Persentase selisih harga per baris yang masih lolos verifikasi invoice." },
  maxToleranceIdr: { label: "Batas toleransi rupiah", hint: "Batas absolut selisih harga. Ambang yang lebih ketang antara persen dan rupiah yang menang." },
  rfqThresholdIdr: { label: "Ambang tender tunggal", hint: "Nilai pengajuan yang wajib melewati tender RFQ." },
};

export default async function AdminSettingsPage() {
  const [bundle, dashboard] = await Promise.all([getSettingsBundle(), getDashboardData()]);
  const roleTally = bundle.users.reduce<Record<string, number>>((acc, u) => ({ ...acc, [u.role]: (acc[u.role] ?? 0) + 1 }), {});
  const filters = Object.entries(roleTally).map(([role, count]) => ({ label: humanizeRole(role), value: role, count }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengaturan sistem"
        description="Ambang verifikasi, akun pengguna, dan aturan keputusan yang dipakai mesin rekomendasi."
        secondaryActions={
          <Link href="/admin/audit" className="btn btn-secondary">
            Jejak audit
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Panduan pengaturan"
            subtitle="Apa yang berubah saat ambang disesuaikan"
            tabs={[
              {
                id: "ambang",
                label: "Ambang",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Toleransi harga">
                      Nilai ini dipakai pada pencocokan tiga dokumen. Memperlebar toleransi membuat lebih banyak invoice lolos otomatis,
                      memperketat membuat lebih banyak invoice ditahan.
                    </NotePanel>
                    <NotePanel title="Ambang tender">
                      Menurunkan ambang tender membuat lebih banyak pengajuan wajib melewati perbandingan penawaran.
                    </NotePanel>
                  </div>
                ),
              },
              {
                id: "akun",
                label: "Akun",
                children: (
                  <MetricRows
                    items={Object.entries(roleTally).map(([role, count]) => ({ label: humanizeRole(role), value: String(count) }))}
                  />
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard label="Akun pengguna" value={String(bundle.users.length)} footer={`${Object.keys(roleTally).length} peran berbeda`} />
        <KpiStatCard label="Ambang aktif" value={String(bundle.settings.length)} footer="Nilai yang dipakai mesin verifikasi" />
        <KpiStatCard label="Aturan keputusan" value={String(bundle.rules.length)} footer={bundle.rules.length ? "Aturan DSS terdaftar" : "Belum ada aturan terdaftar"} />
        <KpiStatCard label="Temuan DSS aktif" value={String(dashboard.dssAlerts.length)} footer="Rekomendasi pada periode berjalan" tone={dashboard.dssAlerts.length ? "warning" : "success"} />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Ambang verifikasi" description="Nilai yang dipakai sistem saat memeriksa invoice dan pengajuan." bare>
            <EnterpriseDataGrid count={bundle.settings.length} totalLabel={`${bundle.settings.length} ambang aktif`} searchPlaceholder="Cari nama ambang...">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Ambang</th>
                    <th className="text-right">Nilai</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.settings.map((setting) => {
                    const meta = SETTING_LABELS[setting.key];
                    return (
                      <tr key={setting.id} data-row data-status="APPROVED">
                        <td className="sticky-col">
                          <div className="font-medium text-slate-800">{meta?.label ?? setting.key}</div>
                          <div className="font-mono text-[10px] text-slate-400">{setting.key}</div>
                        </td>
                        <td className="num font-semibold text-slate-900">{setting.value}</td>
                        <td className="text-[11px] leading-4 text-slate-500">{meta?.hint ?? "Ambang sistem."}</td>
                      </tr>
                    );
                  })}
                  {!bundle.settings.length && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-[12px] text-slate-400">
                        Belum ada ambang terkonfigurasi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>

          <SectionPanel title="Akun pengguna" description="Peran menentukan modul yang bisa diakses setiap akun." bare>
            <EnterpriseDataGrid
              count={bundle.users.length}
              totalLabel={`${bundle.users.length} akun terdaftar`}
              filters={filters}
              searchPlaceholder="Cari nama, email, atau peran..."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Nama</th>
                    <th>Email</th>
                    <th>Peran</th>
                    <th>Badan usaha</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.users.map((user) => (
                    <tr key={user.id} data-row data-status={user.role}>
                      <td className="sticky-col font-medium text-slate-800">{user.fullName}</td>
                      <td className="font-mono text-[11px] text-slate-600">{user.email}</td>
                      <td className="text-[12px] text-slate-600">{humanizeRole(user.role)}</td>
                      <td className="text-[12px] text-slate-600">{user.vendorName ?? "Internal"}</td>
                    </tr>
                  ))}
                  {!bundle.users.length && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-[12px] text-slate-400">
                        Belum ada akun terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>
        </div>

        <div className="space-y-5">
          <SectionPanel title="Ringkasan konfigurasi" description="Status umum sistem.">
            <MetricRows
              items={[
                { label: "Akun pengguna", value: String(bundle.users.length) },
                { label: "Peran berbeda", value: String(Object.keys(roleTally).length) },
                { label: "Ambang aktif", value: String(bundle.settings.length) },
                { label: "Aturan keputusan", value: String(bundle.rules.length) },
                { label: "Temuan DSS", value: String(dashboard.dssAlerts.length), emphasis: dashboard.dssAlerts.length > 0, tone: dashboard.dssAlerts.length > 0 ? "warning" : "success" },
              ]}
            />
          </SectionPanel>

          <SectionPanel title="Aktivitas sistem" description="Aktivitas terbaru dari jejak audit.">
            <TimelineList
              items={dashboard.recentActivity.slice(0, 6).map((a) => ({
                title: a.action,
                detail: `${a.entity} oleh ${a.actor}`,
                at: formatRelative(a.at),
                tone: "info" as const,
              }))}
            />
          </SectionPanel>

          <SectionPanel title="Catatan operasional" description="Hal yang perlu diperhatikan administrator.">
            <div className="space-y-3 text-[11px] leading-4 text-slate-600">
              <p>
                Ambang verifikasi dipakai pada setiap pencocokan invoice. Perubahan nilai berlaku untuk verifikasi berikutnya, bukan
                verifikasi yang sudah selesai.
              </p>
              <p>
                Akun vendor hanya melihat data badan usahanya sendiri melalui portal vendor. Akses dikontrol oleh peran VENDOR_PARTNER.
              </p>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
              <KeyRound className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <p className="text-[11px] leading-4 text-slate-600">
                Kata sandi semua akun demo memakai nilai yang sama. Ganti sebelum dipakai pada lingkungan produksi.
              </p>
            </div>
          </SectionPanel>
        </div>
      </div>

      <p className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3" aria-hidden="true" />{formatNumber(bundle.users.length)} akun terdaftar.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Settings className="size-3" aria-hidden="true" />{bundle.settings.length} ambang aktif.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Database className="size-3" aria-hidden="true" />Basis data PGlite pada direktori .data.
        </span>
        <span className="inline-flex items-center gap-1.5">
          Aktivitas terbaru {dashboard.recentActivity[0] ? formatDateTime(dashboard.recentActivity[0].at) : "—"}.
        </span>
      </p>
    </div>
  );
}
