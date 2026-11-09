import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { priceCreepAlert, vendorDowngradeRecommendation } from "@/server/services/dssEngine";

export interface DashboardData {
  budgets: { id: string; code: string; departmentName: string; allocated: number; committed: number; spent: number; available: number }[];
  totals: { allocated: number; committed: number; spent: number; available: number; utilizationPct: number };
  documents: { pr: number; rfq: number; po: number; grn: number; invoice: number };
  workflow: { pendingApproval: number; sourcing: number; openRfq: number; awardedRfq: number; awaitingReceipt: number; fullyReceived: number; invoiceHolds: number; payable: number; paid: number };
  invoiceAging: { matched: number; tolerance: number; priceHold: number; qtyHold: number; unverified: number; paid: number };
  vendorPerformance: { id: string; name: string; code: string; tier: string; onTime: number; quality: number; score: number }[];
  dssAlerts: { title: string; detail: string; metric: string; href: string; hrefLabel: string; tone: "warning" | "danger" }[];
  recentActivity: { id: string; action: string; entity: string; actor: string; at: Date }[];
  poValueByVendor: { label: string; value: number }[];
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [
    budgetRows, prRows, rfqRows, poRows, grnRows, invoiceRows, vendorRows, activityRows, poByVendor,
  ] = await Promise.all([
    db.select().from(s.costCentersBudgets).orderBy(s.costCentersBudgets.code),
    db.select({ status: s.purchaseRequisitions.status }).from(s.purchaseRequisitions),
    db.select({ status: s.rfqEvents.status }).from(s.rfqEvents),
    db.select({ status: s.purchaseOrders.status, grandTotal: s.purchaseOrders.grandTotal, expectedDeliveryDate: s.purchaseOrders.expectedDeliveryDate }).from(s.purchaseOrders),
    db.select({ n: sql<number>`count(*)` }).from(s.goodsReceipts),
    db.select({ matchStatus: s.vendorInvoices.matchStatus, totalClaimed: s.vendorInvoices.totalClaimed, dueDate: s.vendorInvoices.dueDate, poId: s.vendorInvoices.poId }).from(s.vendorInvoices),
    db.select().from(s.vendors).orderBy(desc(s.vendors.compositeVendorScore)),
    db.select({ id: s.auditLogs.id, action: s.auditLogs.action, entity: s.auditLogs.entity, createdAt: s.auditLogs.createdAt, actor: s.profiles.fullName, role: s.profiles.role })
      .from(s.auditLogs).leftJoin(s.profiles, eq(s.auditLogs.actorId, s.profiles.id)).orderBy(desc(s.auditLogs.createdAt)).limit(8),
    db.select({ vendor: s.vendors.companyName, total: sql<string>`sum(${s.purchaseOrders.grandTotal})` })
      .from(s.purchaseOrders).innerJoin(s.vendors, eq(s.purchaseOrders.vendorId, s.vendors.id)).groupBy(s.vendors.companyName).orderBy(desc(sql`sum(${s.purchaseOrders.grandTotal})`)),
  ]);

  const budgets = budgetRows.map((b) => {
    const allocated = num(b.totalBudgetAllocated);
    const committed = num(b.committedEncumbered);
    const spent = num(b.actualSpentInvoiced);
    return { id: b.id, code: b.code, departmentName: b.departmentName, allocated, committed, spent, available: allocated - committed - spent };
  });
  const totals = budgets.reduce(
    (acc, b) => ({ allocated: acc.allocated + b.allocated, committed: acc.committed + b.committed, spent: acc.spent + b.spent, available: acc.available + b.available, utilizationPct: 0 }),
    { allocated: 0, committed: 0, spent: 0, available: 0, utilizationPct: 0 },
  );
  totals.utilizationPct = totals.allocated > 0 ? ((totals.committed + totals.spent) / totals.allocated) * 100 : 0;

  const tally = (rows: Record<string, unknown>[], key: string) => rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [String(r[key])]: (acc[String(r[key])] ?? 0) + 1 }), {});
  const prStatus = tally(prRows, "status");
  const rfqStatus = tally(rfqRows, "status");
  const poStatus = tally(poRows, "status");
  const invoiceStatus = tally(invoiceRows, "matchStatus");

  const dssAlerts: DashboardData["dssAlerts"] = [
    ...priceCreepAlert(
      (await db.select({ item: s.catalogItems.name, price: s.purchaseOrderItems.unitPriceAgreed, hps: s.catalogItems.standardReferencePrice })
        .from(s.purchaseOrderItems).innerJoin(s.catalogItems, eq(s.purchaseOrderItems.itemId, s.catalogItems.id)))
        .map((r) => ({ name: r.item, price: num(r.price), hps: num(r.hps) })),
    ).map((f) => ({ title: `Kenaikan harga: ${f.message.replace(" price creep", "")}`, detail: "Harga realisasi PO melebihi HPS lebih dari 10%. Perlu justifikasi ulang sebelum pembayaran.", metric: "> 10%", href: "/dss/price-variance", hrefLabel: "Analitik harga", tone: "warning" as const })),
    ...vendorDowngradeRecommendation(vendorRows.map((v) => ({ name: v.companyName, onTime: num(v.onTimeDeliveryRate), rejectRate: 100 - num(v.qualityAcceptanceRate) })))
      .map((f) => ({ title: `Performa vendor: ${f.message.replace(" downgrade", "")}`, detail: "Vendor berada di bawah ambang on-time delivery. Pertimbangkan penurunan tier pada evaluasi berikutnya.", metric: "Turun tier", href: "/dss/vendor-matrix", hrefLabel: "Matriks vendor", tone: "danger" as const })),
  ];

  const recentActivity = activityRows.map((r) => ({ id: r.id, action: r.action, entity: r.entity, actor: r.actor ?? "Sistem", at: r.createdAt }));

  return {
    budgets,
    totals,
    documents: { pr: prRows.length, rfq: rfqRows.length, po: poRows.length, grn: num(grnRows[0]?.n), invoice: invoiceRows.length },
    workflow: {
      pendingApproval: prStatus.PENDING_APPROVAL ?? 0,
      sourcing: prStatus.APPROVED_FOR_SOURCING ?? 0,
      openRfq: (rfqStatus.OPEN_FOR_BIDDING ?? 0) + (rfqStatus.EVALUATION_LOCKED ?? 0),
      awardedRfq: rfqStatus.AWARDED ?? 0,
      awaitingReceipt: (poStatus.ISSUED_SENT ?? 0) + (poStatus.PARTIALLY_RECEIVED ?? 0),
      fullyReceived: poStatus.FULLY_RECEIVED ?? 0,
      invoiceHolds: (invoiceStatus.PRICE_VARIANCE_HOLD ?? 0) + (invoiceStatus.QTY_VARIANCE_HOLD ?? 0),
      payable: (invoiceStatus.MATCHED_PASSED ?? 0) + (invoiceStatus.WITHIN_TOLERANCE_PASSED ?? 0),
      paid: invoiceStatus.PAID ?? 0,
    },
    invoiceAging: {
      matched: invoiceStatus.MATCHED_PASSED ?? 0,
      tolerance: invoiceStatus.WITHIN_TOLERANCE_PASSED ?? 0,
      priceHold: invoiceStatus.PRICE_VARIANCE_HOLD ?? 0,
      qtyHold: invoiceStatus.QTY_VARIANCE_HOLD ?? 0,
      unverified: invoiceStatus.UNVERIFIED ?? 0,
      paid: invoiceStatus.PAID ?? 0,
    },
    vendorPerformance: vendorRows.map((v) => ({ id: v.id, name: v.companyName, code: v.vendorCode, tier: v.tier, onTime: num(v.onTimeDeliveryRate), quality: num(v.qualityAcceptanceRate), score: num(v.compositeVendorScore) })),
    dssAlerts,
    recentActivity,
    poValueByVendor: poByVendor.map((r) => ({ label: r.vendor, value: num(r.total) })),
  };
}

export function poStatusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "FULLY_RECEIVED") return "success";
  if (status === "PARTIALLY_RECEIVED") return "warning";
  if (status === "CANCELLED") return "danger";
  if (status === "ISSUED_SENT") return "info";
  return "neutral";
}

export const PO_OPEN_STATUSES = ["ISSUED_SENT", "PARTIALLY_RECEIVED"] as const;
export const INVOICE_HOLD_STATUSES = ["PRICE_VARIANCE_HOLD", "QTY_VARIANCE_HOLD", "UNVERIFIED"] as const;
export { inArray };
