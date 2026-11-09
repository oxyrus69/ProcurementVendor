import Link from "next/link";
import { History, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStatCard, KpiStrip } from "@/components/ui/KpiStatCard";
import { EnterpriseDataGrid } from "@/components/ui/EnterpriseDataGrid";
import { InspectorDrawer } from "@/components/ui/InspectorDrawer";
import { MetricRows, SectionPanel, TimelineList } from "@/components/ui/Sections";
import { NotePanel } from "@/components/ui/Primitives";
import { getAuditBundle, getSettingsBundle } from "@/server/services/moduleData";
import { formatDate, formatDateTime, formatRelative, humanizeRole } from "@/lib/format";

export const dynamic = "force-dynamic";

function toneForAction(action: string): "success" | "warning" | "danger" | "info" {
  if (/PAY|APPROVE|RECEIVE/.test(action)) return "success";
  if (/VERIFY|AWARD|CONVERT|CREATE/.test(action)) return "info";
  if (/REJECT|CANCEL|DELETE/.test(action)) return "danger";
  return "warning";
}

function entityLabel(entity: string): string {
  const map: Record<string, string> = {
    purchase_requisition: "Purchase requisition",
    rfq_event: "Event RFQ",
    purchase_order: "Purchase order",
    goods_receipt: "Penerimaan barang",
    vendor_invoice: "Invoice vendor",
    vendor: "Vendor",
    cost_center: "Cost center",
  };
  return map[entity] ?? entity;
}

export default async function AdminAuditPage() {
  const [rows, settings] = await Promise.all([getAuditBundle(), getSettingsBundle()]);

  const actionTally = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.action]: (acc[r.action] ?? 0) + 1 }), {});
  const entityTally = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.entity]: (acc[r.entity] ?? 0) + 1 }), {});
  const actorTally = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.actor]: (acc[r.actor] ?? 0) + 1 }), {});

  const filters = [
    { label: "Persetujuan", value: "APPROVE", count: Object.entries(actionTally).filter(([k]) => k.includes("APPROVE")).reduce((s, [, v]) => s + v, 0) },
    { label: "Tender", value: "AWARD", count: Object.entries(actionTally).filter(([k]) => k.includes("AWARD")).reduce((s, [, v]) => s + v, 0) },
    { label: "Pembayaran", value: "PAY", count: Object.entries(actionTally).filter(([k]) => k.includes("PAY")).reduce((s, [, v]) => s + v, 0) },
    { label: "Penerimaan", value: "RECEIVE", count: Object.entries(actionTally).filter(([k]) => k.includes("RECEIVE")).reduce((s, [, v]) => s + v, 0) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jejak audit"
        description="Setiap tindakan finansial tercatat beserta pelaku, entitas, dan waktu. Jejak ini tidak dapat diubah dari aplikasi."
        count={rows.length}
        countLabel="catatan"
        secondaryActions={
          <Link href="/admin/settings" className="btn btn-secondary">
            Pengaturan sistem
          </Link>
        }
        actions={
          <InspectorDrawer
            title="Kebijakan jejak audit"
            subtitle="Apa yang dicatat dan siapa yang bisa melihat"
            tabs={[
              {
                id: "kebijakan",
                label: "Kebijakan",
                children: (
                  <div className="space-y-4">
                    <NotePanel title="Cakupan">
                      Persetujuan PR, penetapan pemenang tender, penerimaan barang, verifikasi invoice, dan pelunasan semuanya wajib
                      meninggalkan jejak.
                    </NotePanel>
                    <NotePanel title="Akses">
                      Halaman ini hanya bisa diakses SUPER_ADMIN dan AP_FINANCE sesuai aturan kontrol akses berbasis peran.
                    </NotePanel>
                    <NotePanel title="Pertahankan">
                      Catatan audit tidak punya tombol ubah atau hapus. Koreksi dilakukan dengan membuat dokumen baru, bukan mengubah
                      catatan lama.
                    </NotePanel>
                  </div>
                ),
              },
              {
                id: "ringkasan",
                label: "Ringkasan",
                children: (
                  <MetricRows
                    items={[
                      { label: "Total catatan", value: String(rows.length) },
                      { label: "Jenis aksi berbeda", value: String(Object.keys(actionTally).length) },
                      { label: "Entitas berbeda", value: String(Object.keys(entityTally).length) },
                      { label: "Pelaku berbeda", value: String(Object.keys(actorTally).length) },
                    ]}
                  />
                ),
              },
            ]}
          />
        }
      />

      <KpiStrip>
        <KpiStatCard label="Catatan tercatat" value={String(rows.length)} footer={`${Object.keys(actionTally).length} jenis aksi berbeda`} />
        <KpiStatCard
          label="Aksi persetujuan"
          value={String(filters[0].count)}
          footer="Persetujuan pengajuan dan penguncian pagu"
          tone={filters[0].count ? "success" : "neutral"}
        />
        <KpiStatCard label="Aksi tender" value={String(filters[1].count)} footer="Penetapan pemenang RFQ" />
        <KpiStatCard
          label="Aksi pembayaran"
          value={String(filters[2].count)}
          footer="Pelunasan invoice vendor"
          tone={filters[2].count ? "success" : "neutral"}
        />
      </KpiStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionPanel title="Catatan audit" description="Urut dari aktivitas terbaru. Pencarian mencakup aksi, entitas, dan pelaku." bare>
            <EnterpriseDataGrid
              count={rows.length}
              totalLabel={`${rows.length} catatan terbaru`}
              filters={filters}
              searchPlaceholder="Cari aksi, entitas, atau pelaku..."
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sticky-col">Waktu</th>
                    <th>Aksi</th>
                    <th>Entitas</th>
                    <th>Referensi</th>
                    <th>Pelaku</th>
                    <th>Peran</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} data-row data-status={row.action}>
                      <td className="sticky-col">
                        <div className="font-mono text-[12px] tabular-nums text-slate-700">{formatDateTime(row.createdAt)}</div>
                        <div className="font-mono text-[10px] text-slate-400">{formatRelative(row.createdAt)}</div>
                      </td>
                      <td>
                        <span className="font-mono text-[12px] font-medium text-slate-800">{row.action}</span>
                      </td>
                      <td className="text-[12px] text-slate-700">{entityLabel(row.entity)}</td>
                      <td className="font-mono text-[11px] text-slate-500">{row.entityId ? row.entityId.slice(0, 13) : "—"}</td>
                      <td className="text-[12px] text-slate-700">{row.actor}</td>
                      <td className="font-mono text-[10px] text-slate-500">{row.role ? humanizeRole(row.role) : "—"}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[12px] text-slate-400">
                        Belum ada aktivitas tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </EnterpriseDataGrid>
          </SectionPanel>
        </div>

        <div className="space-y-5">
          <SectionPanel title="Aktivitas terbaru" description="Sepuluh catatan terakhir dalam bentuk kronologi.">
            <TimelineList
              items={rows.slice(0, 10).map((r) => ({
                title: r.action,
                detail: `${entityLabel(r.entity)} oleh ${r.actor}`,
                at: formatRelative(r.createdAt),
                tone: toneForAction(r.action),
              }))}
            />
          </SectionPanel>

          <SectionPanel title="Sebaran per entitas" description="Jumlah catatan pada tiap jenis dokumen.">
            <MetricRows
              items={Object.entries(entityTally)
                .sort((a, b) => b[1] - a[1])
                .map(([entity, count]) => ({ label: entityLabel(entity), value: String(count) }))}
            />
            {!Object.keys(entityTally).length && <p className="text-[12px] text-slate-400">Belum ada data.</p>}
          </SectionPanel>

          <SectionPanel title="Sebaran per pelaku" description="Kontribusi setiap pengguna terhadap jejak audit.">
            <MetricRows
              items={Object.entries(actorTally)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([actor, count]) => ({ label: actor, value: String(count) }))}
            />
            {!Object.keys(actorTally).length && <p className="text-[12px] text-slate-400">Belum ada data.</p>}
          </SectionPanel>
        </div>
      </div>

      <p className="no-print flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <History className="size-3" aria-hidden="true" />Menampilkan {rows.length} catatan terbaru.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3" aria-hidden="true" />Akses dibatasi SUPER_ADMIN dan AP_FINANCE.
        </span>
        <span className="inline-flex items-center gap-1.5">
          Catatan terbaru {rows[0] ? formatDate(rows[0].createdAt) : "—"}.
        </span>
      </p>
    </div>
  );
}
