const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatRupiah(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `Rp ${rupiah.format(Number.isFinite(n) ? n : 0)}`;
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return rupiah.format(Number.isFinite(n) ? n : 0);
}

export function formatDecimal(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return decimal.format(Number.isFinite(n) ? n : 0);
}

export function formatCompactRupiah(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return "Rp 0";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `Rp ${(n / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 1 })} T`;
  if (abs >= 1e9) return `Rp ${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e6) return `Rp ${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 })} Jt`;
  if (abs >= 1e3) return `Rp ${(n / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 0 })} Rb`;
  return `Rp ${rupiah.format(n)}`;
}

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}

/** Waktu relatif singkat untuk aliran aktivitas: "3 mnt lalu", "2 jam lalu". */
export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return formatDate(d);
}

/** Sisa hari terhadap hari ini; negatif berarti sudah terlampaui. */
export function daysUntil(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function formatPercent(value: number | string | null | undefined, digits = 1): string {
  const n = Number(value ?? 0);
  return `${(Number.isFinite(n) ? n : 0).toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

/** Label status manusiawi untuk token internal berunderscore. */
export function humanizeStatus(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "Draf",
    PENDING_APPROVAL: "Menunggu persetujuan",
    APPROVED_FOR_SOURCING: "Disetujui untuk sourcing",
    CONVERTED_TO_RFQ_PO: "Sudah jadi RFQ/PO",
    OPEN_FOR_BIDDING: "Buka penawaran",
    EVALUATION_LOCKED: "Evaluasi dikunci",
    AWARDED: "Sudah ada pemenang",
    CANCELLED: "Dibatalkan",
    ISSUED_SENT: "Diterbitkan",
    PARTIALLY_RECEIVED: "Diterima sebagian",
    FULLY_RECEIVED: "Diterima penuh",
    UNVERIFIED: "Belum diverifikasi",
    MATCHED_PASSED: "Cocok penuh",
    WITHIN_TOLERANCE_PASSED: "Lolos toleransi",
    PRICE_VARIANCE_HOLD: "Tahan selisih harga",
    QTY_VARIANCE_HOLD: "Tahan selisih kuantitas",
    PAID: "Lunas",
    APPROVED: "Disetujui",
    PROBATION: "Masa percobaan",
    BLACKLIST: "Dilarang",
  };
  return map[status] ?? status.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function humanizeRole(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: "Super admin",
    PROCUREMENT_OFFICER: "Petugas pengadaan",
    DEPT_APPROVER: "Pemberi persetujuan",
    WAREHOUSE_RECEIVER: "Penerima barang",
    AP_FINANCE: "Keuangan AP",
    VENDOR_PARTNER: "Mitra vendor",
  };
  return map[role] ?? humanizeStatus(role);
}
