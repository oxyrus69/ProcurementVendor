import type { NavigationItem } from "@/components/ui/CommandPalette";
import type { ShellStats } from "@/server/services/shellStats";

export interface AppNavigationItem extends NavigationItem {
  icon: string;
  /** Kunci agregat pada ShellStats yang menjadi lencana angka live. */
  badgeKey?: keyof ShellStats;
  /** Nada lencana: warning untuk antrean perlu tindakan. */
  badgeTone?: "warning" | "danger" | "neutral";
  /** Hanya tampil untuk peran tertentu. */
  roles?: string[];
}

export const APP_NAVIGATION: AppNavigationItem[] = [
  { href: "/admin", label: "Dasbor komando", group: "Operasional", icon: "dashboard", badgeKey: "dssAlerts", badgeTone: "warning" },
  { href: "/requisitions", label: "Purchase requisition", group: "Operasional", icon: "file", badgeKey: "pendingApprovals", badgeTone: "warning" },
  { href: "/rfq", label: "Tender & RFQ", group: "Operasional", icon: "gavel", badgeKey: "openRfq", badgeTone: "warning" },
  { href: "/purchase-orders", label: "Purchase order", group: "Operasional", icon: "package", badgeKey: "awaitingReceipt" },
  { href: "/goods-receipts", label: "Penerimaan barang", group: "Operasional", icon: "truck" },
  { href: "/invoices", label: "Invoice & 3-way match", group: "Finansial", icon: "receipt", badgeKey: "invoiceHolds", badgeTone: "danger" },
  { href: "/budgets", label: "Pagu anggaran", group: "Finansial", icon: "wallet" },
  { href: "/vendors", label: "Direktori vendor", group: "Finansial", icon: "users" },
  { href: "/vendor-portal", label: "Portal vendor", group: "Finansial", icon: "store" },
  { href: "/dss", label: "Decision support", group: "Analitik", icon: "shield" },
  { href: "/admin/audit", label: "Jejak audit", group: "Sistem", icon: "history", badgeKey: "unreadActivity" },
  { href: "/admin/settings", label: "Pengaturan sistem", group: "Sistem", icon: "settings" },
];

/** Satu sumber kebenaran untuk breadcrumb dan label modul. */
export const BREADCRUMB_LABELS: Record<string, string> = {
  admin: "Dasbor komando",
  audit: "Jejak audit",
  settings: "Pengaturan sistem",
  requisitions: "Purchase requisition",
  rfq: "Tender & RFQ",
  "purchase-orders": "Purchase order",
  "goods-receipts": "Penerimaan barang",
  invoices: "Invoice & 3-way match",
  budgets: "Pagu anggaran",
  vendors: "Direktori vendor",
  "vendor-portal": "Portal vendor",
  dss: "Decision support",
  "price-variance": "Analitik kenaikan harga",
  "vendor-matrix": "Matriks vendor",
  riwayat: "Riwayat keputusan",
  po: "Cetak PO",
  grn: "Cetak GRN",
  login: "Masuk",
};
