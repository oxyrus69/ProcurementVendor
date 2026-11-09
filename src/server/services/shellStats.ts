import { count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { priceCreepAlert, vendorDowngradeRecommendation } from "@/server/services/dssEngine";

/**
 * Penghitung ringkas untuk lencana live pada navigation rail (Zona A).
 * Sengaja dibatasi beberapa agregat agar setiap render halaman tetap murah.
 */
export interface ShellStats {
  pendingApprovals: number;
  openRfq: number;
  awaitingReceipt: number;
  invoiceHolds: number;
  dssAlerts: number;
  unreadActivity: number;
}

export async function getShellStats(): Promise<ShellStats> {
  const [
    pending,
    rfqOpen,
    poPending,
    invoiceHolds,
    vendors,
    creep,
    audits,
  ] = await Promise.all([
    db.select({ n: count() }).from(s.purchaseRequisitions).where(eq(s.purchaseRequisitions.status, "PENDING_APPROVAL")),
    db.select({ n: count() }).from(s.rfqEvents).where(inArray(s.rfqEvents.status, ["OPEN_FOR_BIDDING", "EVALUATION_LOCKED"])),
    db.select({ n: count() }).from(s.purchaseOrders).where(inArray(s.purchaseOrders.status, ["ISSUED_SENT", "PARTIALLY_RECEIVED"])),
    db.select({ n: count() }).from(s.vendorInvoices).where(inArray(s.vendorInvoices.matchStatus, ["PRICE_VARIANCE_HOLD", "QTY_VARIANCE_HOLD", "UNVERIFIED"])),
    db.select({ name: s.vendors.companyName, onTime: s.vendors.onTimeDeliveryRate, quality: s.vendors.qualityAcceptanceRate }).from(s.vendors),
    db.select({ item: s.catalogItems.name, price: s.purchaseOrderItems.unitPriceAgreed, hps: s.catalogItems.standardReferencePrice })
      .from(s.purchaseOrderItems).innerJoin(s.catalogItems, eq(s.purchaseOrderItems.itemId, s.catalogItems.id)),
    db.select({ n: count() }).from(s.auditLogs).where(sql`${s.auditLogs.createdAt} > now() - interval '24 hours'`),
  ]);

  const dssAlerts =
    priceCreepAlert(creep.map((r) => ({ name: r.item, price: Number(r.price), hps: Number(r.hps) }))).length +
    vendorDowngradeRecommendation(vendors.map((v) => ({ name: v.name, onTime: Number(v.onTime), rejectRate: 100 - Number(v.quality) }))).length;

  return {
    pendingApprovals: Number(pending[0]?.n ?? 0),
    openRfq: Number(rfqOpen[0]?.n ?? 0),
    awaitingReceipt: Number(poPending[0]?.n ?? 0),
    invoiceHolds: Number(invoiceHolds[0]?.n ?? 0),
    dssAlerts,
    unreadActivity: Number(audits[0]?.n ?? 0),
  };
}
