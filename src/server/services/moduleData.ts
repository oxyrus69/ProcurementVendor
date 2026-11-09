import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { priceCreepAlert, vendorDowngradeRecommendation } from "@/server/services/dssEngine";
import { computeRfqWeightedScorePure } from "@/lib/procurementMath";

export function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function tally(rows: Record<string, unknown>[], key: string): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const k = String(row[key]);
    return { ...acc, [k]: (acc[k] ?? 0) + 1 };
  }, {});
}

/* ------------------------------------------------------------------ PR ---- */

export async function getRequisitionBundle() {
  const [rows, budgets, catalog] = await Promise.all([
    db
      .select({
        id: s.purchaseRequisitions.id,
        prNumber: s.purchaseRequisitions.prNumber,
        title: s.purchaseRequisitions.title,
        justification: s.purchaseRequisitions.justification,
        status: s.purchaseRequisitions.status,
        estimatedTotal: s.purchaseRequisitions.estimatedTotal,
        neededByDate: s.purchaseRequisitions.neededByDate,
        approvedAt: s.purchaseRequisitions.approvedAt,
        requester: s.profiles.fullName,
        costCenter: s.costCentersBudgets.departmentName,
        costCenterCode: s.costCentersBudgets.code,
      })
      .from(s.purchaseRequisitions)
      .leftJoin(s.profiles, eq(s.purchaseRequisitions.requesterId, s.profiles.id))
      .leftJoin(s.costCentersBudgets, eq(s.purchaseRequisitions.costCenterId, s.costCentersBudgets.id))
      .orderBy(desc(s.purchaseRequisitions.neededByDate)),
    db
      .select({ id: s.costCentersBudgets.id, code: s.costCentersBudgets.code, departmentName: s.costCentersBudgets.departmentName })
      .from(s.costCentersBudgets)
      .orderBy(s.costCentersBudgets.code),
    db
      .select({
        id: s.catalogItems.id,
        itemCode: s.catalogItems.itemCode,
        name: s.catalogItems.name,
        uom: s.catalogItems.uom,
        standardReferencePrice: s.catalogItems.standardReferencePrice,
      })
      .from(s.catalogItems)
      .orderBy(s.catalogItems.itemCode),
  ]);

  const mapped = rows.map((r) => ({
    id: r.id,
    prNumber: r.prNumber,
    title: r.title,
    justification: r.justification ?? "",
    status: r.status,
    estimatedTotal: num(r.estimatedTotal),
    neededByDate: r.neededByDate,
    approvedAt: r.approvedAt,
    requester: r.requester ?? "Tidak diketahui",
    costCenter: r.costCenter ?? "—",
    costCenterCode: r.costCenterCode ?? "—",
  }));

  return {
    rows: mapped,
    budgets,
    catalog,
    counts: tally(mapped, "status"),
    totalValue: mapped.reduce((sum, r) => sum + r.estimatedTotal, 0),
  };
}

export async function getRequisitionDetail(id: string) {
  const [pr] = await db
    .select({
      id: s.purchaseRequisitions.id,
      prNumber: s.purchaseRequisitions.prNumber,
      title: s.purchaseRequisitions.title,
      justification: s.purchaseRequisitions.justification,
      status: s.purchaseRequisitions.status,
      estimatedTotal: s.purchaseRequisitions.estimatedTotal,
      neededByDate: s.purchaseRequisitions.neededByDate,
      approvedAt: s.purchaseRequisitions.approvedAt,
      version: s.purchaseRequisitions.version,
      requester: s.profiles.fullName,
      requesterEmail: s.profiles.email,
      approver: sql<string | null>`(select full_name from profiles where id = ${s.purchaseRequisitions.approvedBy})`,
      costCenter: s.costCentersBudgets.departmentName,
      costCenterCode: s.costCentersBudgets.code,
      allocated: s.costCentersBudgets.totalBudgetAllocated,
      committed: s.costCentersBudgets.committedEncumbered,
      spent: s.costCentersBudgets.actualSpentInvoiced,
    })
    .from(s.purchaseRequisitions)
    .leftJoin(s.profiles, eq(s.purchaseRequisitions.requesterId, s.profiles.id))
    .leftJoin(s.costCentersBudgets, eq(s.purchaseRequisitions.costCenterId, s.costCentersBudgets.id))
    .where(eq(s.purchaseRequisitions.id, id))
    .limit(1);
  if (!pr) return null;

  const items = await db
    .select({
      id: s.purchaseRequisitionItems.id,
      description: s.purchaseRequisitionItems.description,
      qty: s.purchaseRequisitionItems.qty,
      unitPriceEstimate: s.purchaseRequisitionItems.unitPriceEstimate,
      lineTotal: s.purchaseRequisitionItems.lineTotal,
      uom: s.catalogItems.uom,
      standardReferencePrice: s.catalogItems.standardReferencePrice,
    })
    .from(s.purchaseRequisitionItems)
    .leftJoin(s.catalogItems, eq(s.purchaseRequisitionItems.itemId, s.catalogItems.id))
    .where(eq(s.purchaseRequisitionItems.prId, id));

  const rfqs = await db
    .select({ id: s.rfqEvents.id, rfqNumber: s.rfqEvents.rfqNumber, status: s.rfqEvents.status, title: s.rfqEvents.title })
    .from(s.rfqEvents)
    .where(eq(s.rfqEvents.prId, id));

  const pos = await db
    .select({ id: s.purchaseOrders.id, poNumber: s.purchaseOrders.poNumber, status: s.purchaseOrders.status, grandTotal: s.purchaseOrders.grandTotal })
    .from(s.purchaseOrders)
    .where(eq(s.purchaseOrders.prId, id));

  return {
    pr,
    items: items.map((i) => ({
      ...i,
      qty: num(i.qty),
      unitPriceEstimate: num(i.unitPriceEstimate),
      lineTotal: num(i.lineTotal),
      standardReferencePrice: num(i.standardReferencePrice),
    })),
    rfqs,
    pos: pos.map((p) => ({ ...p, grandTotal: num(p.grandTotal) })),
    budget: {
      allocated: num(pr.allocated),
      committed: num(pr.committed),
      spent: num(pr.spent),
      available: num(pr.allocated) - num(pr.committed) - num(pr.spent),
      utilisation: num(pr.allocated) > 0 ? ((num(pr.committed) + num(pr.spent)) / num(pr.allocated)) * 100 : 0,
    },
  };
}

/* ------------------------------------------------------------------ RFQ ---- */

export async function getRfqBundle() {
  const [rfqs, prs, invited, quotes, vendors] = await Promise.all([
    db.select().from(s.rfqEvents).orderBy(desc(s.rfqEvents.deadlineAt)),
    db.select({ id: s.purchaseRequisitions.id, prNumber: s.purchaseRequisitions.prNumber }).from(s.purchaseRequisitions),
    db.select({ rfqId: s.rfqInvitedVendors.rfqId, n: sql<number>`count(*)` }).from(s.rfqInvitedVendors).groupBy(s.rfqInvitedVendors.rfqId),
    db.select({ rfqId: s.rfqQuotations.rfqId, totalBidAmount: s.rfqQuotations.totalBidAmount }).from(s.rfqQuotations),
    db.select({ id: s.vendors.id, companyName: s.vendors.companyName }).from(s.vendors),
  ]);
  const prMap = new Map(prs.map((p) => [p.id, p.prNumber]));
  const vendorMap = new Map(vendors.map((v) => [v.id, v.companyName]));

  const rows = rfqs.map((r) => {
    const bids = quotes.filter((q) => q.rfqId === r.id);
    return {
      id: r.id,
      rfqNumber: r.rfqNumber,
      title: r.title,
      status: r.status,
      deadlineAt: r.deadlineAt,
      prNumber: r.prId ? prMap.get(r.prId) ?? "—" : "—",
      invited: Number(invited.find((i) => i.rfqId === r.id)?.n ?? 0),
      quotations: bids.length,
      bestBid: bids.length ? Math.min(...bids.map((b) => num(b.totalBidAmount))) : 0,
      winner: r.awardedVendorId ? vendorMap.get(r.awardedVendorId) ?? null : null,
    };
  });
  return { rows, counts: tally(rows, "status") };
}

export async function getRfqDetail(id: string) {
  const [rfq] = await db
    .select({
      id: s.rfqEvents.id,
      rfqNumber: s.rfqEvents.rfqNumber,
      title: s.rfqEvents.title,
      status: s.rfqEvents.status,
      deadlineAt: s.rfqEvents.deadlineAt,
      awardJustification: s.rfqEvents.awardJustification,
      prId: s.purchaseRequisitions.id,
      prNumber: s.purchaseRequisitions.prNumber,
      prTitle: s.purchaseRequisitions.title,
    })
    .from(s.rfqEvents)
    .leftJoin(s.purchaseRequisitions, eq(s.rfqEvents.prId, s.purchaseRequisitions.id))
    .where(eq(s.rfqEvents.id, id))
    .limit(1);
  if (!rfq) return null;

  const quoteRows = await db
    .select({
      quote: s.rfqQuotations,
      vendorName: s.vendors.companyName,
      vendorCode: s.vendors.vendorCode,
      vendorScore: s.vendors.compositeVendorScore,
      onTime: s.vendors.onTimeDeliveryRate,
      quality: s.vendors.qualityAcceptanceRate,
    })
    .from(s.rfqQuotations)
    .innerJoin(s.vendors, eq(s.rfqQuotations.vendorId, s.vendors.id))
    .where(eq(s.rfqQuotations.rfqId, id));

  const scored = computeRfqWeightedScorePure(
    quoteRows.map((r) => ({
      vendorId: r.quote.vendorId ?? "",
      totalBid: num(r.quote.totalBidAmount),
      leadTime: r.quote.deliveryLeadTimeDays,
      technical: num(r.quote.technicalComplianceScore),
      vendorScore: num(r.vendorScore),
    })),
  );
  const scoreMap = new Map(scored.map((x) => [x.vendorId, x.score]));
  const winnerId = scored.length ? scored.reduce((a, b) => (a.score >= b.score ? a : b)).vendorId : null;

  const quotations = quoteRows
    .map((r) => ({
      id: r.quote.id,
      vendorId: r.quote.vendorId,
      vendorName: r.vendorName,
      vendorCode: r.vendorCode,
      totalBid: num(r.quote.totalBidAmount),
      leadTime: r.quote.deliveryLeadTimeDays,
      warrantyMonths: r.quote.warrantyMonths,
      paymentTermsDays: r.quote.paymentTermsDays,
      technical: num(r.quote.technicalComplianceScore),
      vendorScore: num(r.vendorScore),
      onTime: num(r.onTime),
      quality: num(r.quality),
      weighted: scoreMap.get(r.quote.vendorId ?? "") ?? 0,
      isWinner: (r.quote.vendorId ?? "") === winnerId,
    }))
    .sort((a, b) => b.weighted - a.weighted);

  return { rfq, quotations, winnerId };
}

/* ------------------------------------------------------------------- PO ---- */

export async function getPoBundle() {
  const [rows, vendors] = await Promise.all([
    db
      .select({
        id: s.purchaseOrders.id,
        poNumber: s.purchaseOrders.poNumber,
        status: s.purchaseOrders.status,
        subtotal: s.purchaseOrders.subtotal,
        taxAmount: s.purchaseOrders.taxAmount,
        shippingCost: s.purchaseOrders.shippingCost,
        grandTotal: s.purchaseOrders.grandTotal,
        expectedDeliveryDate: s.purchaseOrders.expectedDeliveryDate,
        paymentTermsDays: s.purchaseOrders.paymentTermsDays,
        verificationHash: s.purchaseOrders.verificationHash,
        prNumber: s.purchaseRequisitions.prNumber,
        vendorName: s.vendors.companyName,
        vendorCode: s.vendors.vendorCode,
        costCenter: s.costCentersBudgets.departmentName,
      })
      .from(s.purchaseOrders)
      .leftJoin(s.purchaseRequisitions, eq(s.purchaseOrders.prId, s.purchaseRequisitions.id))
      .leftJoin(s.vendors, eq(s.purchaseOrders.vendorId, s.vendors.id))
      .leftJoin(s.costCentersBudgets, eq(s.purchaseOrders.costCenterId, s.costCentersBudgets.id))
      .orderBy(desc(s.purchaseOrders.expectedDeliveryDate)),
    db.select({ id: s.vendors.id, companyName: s.vendors.companyName }).from(s.vendors).orderBy(s.vendors.companyName),
  ]);

  const mapped = rows.map((r) => ({
    id: r.id,
    poNumber: r.poNumber,
    status: r.status,
    subtotal: num(r.subtotal),
    taxAmount: num(r.taxAmount),
    shippingCost: num(r.shippingCost),
    grandTotal: num(r.grandTotal),
    expectedDeliveryDate: r.expectedDeliveryDate,
    paymentTermsDays: r.paymentTermsDays ?? 0,
    verificationHash: r.verificationHash,
    prNumber: r.prNumber ?? "—",
    vendorName: r.vendorName ?? "—",
    vendorCode: r.vendorCode ?? "—",
    costCenter: r.costCenter ?? "—",
  }));
  return { rows: mapped, vendors, counts: tally(mapped, "status") };
}

export async function getPoDetail(id: string) {
  const [po] = await db
    .select({
      id: s.purchaseOrders.id,
      poNumber: s.purchaseOrders.poNumber,
      status: s.purchaseOrders.status,
      subtotal: s.purchaseOrders.subtotal,
      taxAmount: s.purchaseOrders.taxAmount,
      shippingCost: s.purchaseOrders.shippingCost,
      grandTotal: s.purchaseOrders.grandTotal,
      expectedDeliveryDate: s.purchaseOrders.expectedDeliveryDate,
      paymentTermsDays: s.purchaseOrders.paymentTermsDays,
      verificationHash: s.purchaseOrders.verificationHash,
      version: s.purchaseOrders.version,
      prNumber: s.purchaseRequisitions.prNumber,
      prTitle: s.purchaseRequisitions.title,
      rfqNumber: s.rfqEvents.rfqNumber,
      vendorName: s.vendors.companyName,
      vendorCode: s.vendors.vendorCode,
      vendorEmail: s.vendors.contactEmail,
      vendorPhone: s.vendors.phone,
      vendorTier: s.vendors.tier,
      costCenter: s.costCentersBudgets.departmentName,
      costCenterCode: s.costCentersBudgets.code,
    })
    .from(s.purchaseOrders)
    .leftJoin(s.purchaseRequisitions, eq(s.purchaseOrders.prId, s.purchaseRequisitions.id))
    .leftJoin(s.rfqEvents, eq(s.purchaseOrders.rfqId, s.rfqEvents.id))
    .leftJoin(s.vendors, eq(s.purchaseOrders.vendorId, s.vendors.id))
    .leftJoin(s.costCentersBudgets, eq(s.purchaseOrders.costCenterId, s.costCentersBudgets.id))
    .where(eq(s.purchaseOrders.id, id))
    .limit(1);
  if (!po) return null;

  const items = await db
    .select({
      id: s.purchaseOrderItems.id,
      description: s.purchaseOrderItems.description,
      orderedQty: s.purchaseOrderItems.orderedQty,
      receivedAcceptedQty: s.purchaseOrderItems.receivedAcceptedQty,
      invoicedQty: s.purchaseOrderItems.invoicedQty,
      unitPriceAgreed: s.purchaseOrderItems.unitPriceAgreed,
      lineTotal: s.purchaseOrderItems.lineTotal,
      uom: s.catalogItems.uom,
      itemCode: s.catalogItems.itemCode,
    })
    .from(s.purchaseOrderItems)
    .leftJoin(s.catalogItems, eq(s.purchaseOrderItems.itemId, s.catalogItems.id))
    .where(eq(s.purchaseOrderItems.poId, id));

  const grns = await db
    .select({ id: s.goodsReceipts.id, grnNumber: s.goodsReceipts.grnNumber, receivedAt: s.goodsReceipts.receivedAt, deliveryNoteRef: s.goodsReceipts.deliveryNoteRef })
    .from(s.goodsReceipts)
    .where(eq(s.goodsReceipts.poId, id))
    .orderBy(desc(s.goodsReceipts.receivedAt));

  const invoices = await db
    .select({ id: s.vendorInvoices.id, internalInvNumber: s.vendorInvoices.internalInvNumber, matchStatus: s.vendorInvoices.matchStatus, totalClaimed: s.vendorInvoices.totalClaimed })
    .from(s.vendorInvoices)
    .where(eq(s.vendorInvoices.poId, id));

  return {
    po,
    items: items.map((i) => ({
      ...i,
      orderedQty: num(i.orderedQty),
      receivedAcceptedQty: num(i.receivedAcceptedQty),
      invoicedQty: num(i.invoicedQty),
      unitPriceAgreed: num(i.unitPriceAgreed),
      lineTotal: num(i.lineTotal),
      remaining: num(i.orderedQty) - num(i.receivedAcceptedQty),
    })),
    grns,
    invoices: invoices.map((i) => ({ ...i, totalClaimed: num(i.totalClaimed) })),
  };
}

/* ------------------------------------------------------------------ GRN ---- */

export async function getGrnBundle() {
  const [rows, pos] = await Promise.all([
    db
      .select({
        id: s.goodsReceipts.id,
        grnNumber: s.goodsReceipts.grnNumber,
        receivedAt: s.goodsReceipts.receivedAt,
        deliveryNoteRef: s.goodsReceipts.deliveryNoteRef,
        poNumber: s.purchaseOrders.poNumber,
        poId: s.purchaseOrders.id,
        poStatus: s.purchaseOrders.status,
        receiver: s.profiles.fullName,
        vendorName: s.vendors.companyName,
      })
      .from(s.goodsReceipts)
      .leftJoin(s.purchaseOrders, eq(s.goodsReceipts.poId, s.purchaseOrders.id))
      .leftJoin(s.profiles, eq(s.goodsReceipts.receivedBy, s.profiles.id))
      .leftJoin(s.vendors, eq(s.purchaseOrders.vendorId, s.vendors.id))
      .orderBy(desc(s.goodsReceipts.receivedAt)),
    db
      .select({ id: s.purchaseOrders.id, poNumber: s.purchaseOrders.poNumber, status: s.purchaseOrders.status, vendorName: s.vendors.companyName })
      .from(s.purchaseOrders)
      .leftJoin(s.vendors, eq(s.purchaseOrders.vendorId, s.vendors.id))
      .orderBy(s.purchaseOrders.poNumber),
  ]);

  const items = await db
    .select({
      grnId: s.goodsReceiptItems.grnId,
      delivered: sql<number>`coalesce(sum(${s.goodsReceiptItems.qtyDelivered}), 0)`,
      accepted: sql<number>`coalesce(sum(${s.goodsReceiptItems.qtyAcceptedGood}), 0)`,
      rejected: sql<number>`coalesce(sum(${s.goodsReceiptItems.qtyRejectedDamaged}), 0)`,
    })
    .from(s.goodsReceiptItems)
    .groupBy(s.goodsReceiptItems.grnId);
  const itemMap = new Map(items.map((i) => [i.grnId, i]));

  return {
    rows: rows.map((r) => {
      const agg = itemMap.get(r.id);
      return {
        id: r.id,
        grnNumber: r.grnNumber,
        receivedAt: r.receivedAt,
        deliveryNoteRef: r.deliveryNoteRef ?? "—",
        poId: r.poId,
        poNumber: r.poNumber ?? "—",
        poStatus: r.poStatus ?? "—",
        receiver: r.receiver ?? "—",
        vendorName: r.vendorName ?? "—",
        delivered: num(agg?.delivered),
        accepted: num(agg?.accepted),
        rejected: num(agg?.rejected),
      };
    }),
    openPos: pos.filter((p) => ["ISSUED_SENT", "PARTIALLY_RECEIVED"].includes(p.status)),
  };
}

export async function getGrnDetail(id: string) {
  const [grn] = await db
    .select({
      id: s.goodsReceipts.id,
      grnNumber: s.goodsReceipts.grnNumber,
      receivedAt: s.goodsReceipts.receivedAt,
      deliveryNoteRef: s.goodsReceipts.deliveryNoteRef,
      receiver: s.profiles.fullName,
      poNumber: s.purchaseOrders.poNumber,
      poId: s.purchaseOrders.id,
      poStatus: s.purchaseOrders.status,
      vendorName: s.vendors.companyName,
      vendorCode: s.vendors.vendorCode,
      grandTotal: s.purchaseOrders.grandTotal,
    })
    .from(s.goodsReceipts)
    .leftJoin(s.purchaseOrders, eq(s.goodsReceipts.poId, s.purchaseOrders.id))
    .leftJoin(s.profiles, eq(s.goodsReceipts.receivedBy, s.profiles.id))
    .leftJoin(s.vendors, eq(s.purchaseOrders.vendorId, s.vendors.id))
    .where(eq(s.goodsReceipts.id, id))
    .limit(1);
  if (!grn) return null;

  const items = await db
    .select({
      id: s.goodsReceiptItems.id,
      qtyDelivered: s.goodsReceiptItems.qtyDelivered,
      qtyAcceptedGood: s.goodsReceiptItems.qtyAcceptedGood,
      qtyRejectedDamaged: s.goodsReceiptItems.qtyRejectedDamaged,
      inspectionNotes: s.goodsReceiptItems.inspectionNotes,
      description: s.purchaseOrderItems.description,
      orderedQty: s.purchaseOrderItems.orderedQty,
      unitPriceAgreed: s.purchaseOrderItems.unitPriceAgreed,
    })
    .from(s.goodsReceiptItems)
    .leftJoin(s.purchaseOrderItems, eq(s.goodsReceiptItems.poItemId, s.purchaseOrderItems.id))
    .where(eq(s.goodsReceiptItems.grnId, id));

  return {
    grn,
    items: items.map((i) => ({
      ...i,
      qtyDelivered: num(i.qtyDelivered),
      qtyAcceptedGood: num(i.qtyAcceptedGood),
      qtyRejectedDamaged: num(i.qtyRejectedDamaged),
      orderedQty: num(i.orderedQty),
      unitPriceAgreed: num(i.unitPriceAgreed),
    })),
  };
}

/* -------------------------------------------------------------- INVOICE ---- */

export async function getInvoiceBundle() {
  const rows = await db
    .select({
      id: s.vendorInvoices.id,
      internalInvNumber: s.vendorInvoices.internalInvNumber,
      vendorInvoiceNo: s.vendorInvoices.vendorInvoiceNo,
      invoiceDate: s.vendorInvoices.invoiceDate,
      dueDate: s.vendorInvoices.dueDate,
      totalClaimed: s.vendorInvoices.totalClaimed,
      matchStatus: s.vendorInvoices.matchStatus,
      priceVarianceAmount: s.vendorInvoices.priceVarianceAmount,
      priceVariancePct: s.vendorInvoices.priceVariancePct,
      qtyVarianceUnits: s.vendorInvoices.qtyVarianceUnits,
      paidAt: s.vendorInvoices.paidAt,
      poNumber: s.purchaseOrders.poNumber,
      poTotalReference: s.purchaseOrders.grandTotal,
      vendorName: s.vendors.companyName,
      vendorCode: s.vendors.vendorCode,
    })
    .from(s.vendorInvoices)
    .leftJoin(s.purchaseOrders, eq(s.vendorInvoices.poId, s.purchaseOrders.id))
    .leftJoin(s.vendors, eq(s.vendorInvoices.vendorId, s.vendors.id))
    .orderBy(desc(s.vendorInvoices.dueDate));

  const mapped = rows.map((r) => ({
    id: r.id,
    internalInvNumber: r.internalInvNumber,
    vendorInvoiceNo: r.vendorInvoiceNo,
    invoiceDate: r.invoiceDate,
    dueDate: r.dueDate,
    totalClaimed: num(r.totalClaimed),
    matchStatus: r.matchStatus,
    priceVarianceAmount: num(r.priceVarianceAmount),
    priceVariancePct: num(r.priceVariancePct),
    qtyVarianceUnits: num(r.qtyVarianceUnits),
    paidAt: r.paidAt,
    poNumber: r.poNumber ?? "—",
    poTotalReference: num(r.poTotalReference),
    vendorName: r.vendorName ?? "—",
    vendorCode: r.vendorCode ?? "—",
  }));
  return { rows: mapped, counts: tally(mapped, "matchStatus") };
}

export async function getInvoiceDetail(id: string) {
  const [invoice] = await db
    .select({
      id: s.vendorInvoices.id,
      internalInvNumber: s.vendorInvoices.internalInvNumber,
      vendorInvoiceNo: s.vendorInvoices.vendorInvoiceNo,
      invoiceDate: s.vendorInvoices.invoiceDate,
      dueDate: s.vendorInvoices.dueDate,
      subtotalClaimed: s.vendorInvoices.subtotalClaimed,
      taxClaimed: s.vendorInvoices.taxClaimed,
      totalClaimed: s.vendorInvoices.totalClaimed,
      matchStatus: s.vendorInvoices.matchStatus,
      poTotalReference: s.purchaseOrders.grandTotal,
      grnAcceptedValueReference: s.vendorInvoices.grnAcceptedValueReference,
      priceVarianceAmount: s.vendorInvoices.priceVarianceAmount,
      priceVariancePct: s.vendorInvoices.priceVariancePct,
      qtyVarianceUnits: s.vendorInvoices.qtyVarianceUnits,
      discrepancySummary: s.vendorInvoices.discrepancySummary,
      overrideApprovedBy: s.vendorInvoices.overrideApprovedBy,
      overrideReason: s.vendorInvoices.overrideReason,
      paidAt: s.vendorInvoices.paidAt,
      poNumber: s.purchaseOrders.poNumber,
      poId: s.purchaseOrders.id,
      poStatus: s.purchaseOrders.status,
      vendorName: s.vendors.companyName,
      vendorCode: s.vendors.vendorCode,
      vendorEmail: s.vendors.contactEmail,
      poGrandTotal: s.purchaseOrders.grandTotal,
    })
    .from(s.vendorInvoices)
    .leftJoin(s.purchaseOrders, eq(s.vendorInvoices.poId, s.purchaseOrders.id))
    .leftJoin(s.vendors, eq(s.vendorInvoices.vendorId, s.vendors.id))
    .where(eq(s.vendorInvoices.id, id))
    .limit(1);
  if (!invoice) return null;

  const items = await db
    .select({
      id: s.vendorInvoiceItems.id,
      description: s.vendorInvoiceItems.description,
      qtyInvoiced: s.vendorInvoiceItems.qtyInvoiced,
      unitPriceInvoiced: s.vendorInvoiceItems.unitPriceInvoiced,
      lineTotal: s.vendorInvoiceItems.lineTotal,
      poItemId: s.vendorInvoiceItems.poItemId,
      poDescription: s.purchaseOrderItems.description,
      poQty: s.purchaseOrderItems.orderedQty,
      poUnitPrice: s.purchaseOrderItems.unitPriceAgreed,
      acceptedQty: sql<number>`coalesce((select sum(${s.goodsReceiptItems.qtyAcceptedGood}) from ${s.goodsReceiptItems} where ${s.goodsReceiptItems.poItemId} = ${s.purchaseOrderItems.id}), 0)`,
    })
    .from(s.vendorInvoiceItems)
    .innerJoin(s.purchaseOrderItems, eq(s.vendorInvoiceItems.poItemId, s.purchaseOrderItems.id))
    .where(eq(s.vendorInvoiceItems.invoiceId, id));

  const logs = await db
    .select({ id: s.threeWayMatchLogs.id, result: s.threeWayMatchLogs.result, createdAt: s.threeWayMatchLogs.createdAt })
    .from(s.threeWayMatchLogs)
    .where(eq(s.threeWayMatchLogs.invoiceId, id))
    .orderBy(desc(s.threeWayMatchLogs.createdAt));

  return {
    invoice,
    items: items.map((i) => ({
      ...i,
      qtyInvoiced: num(i.qtyInvoiced),
      unitPriceInvoiced: num(i.unitPriceInvoiced),
      lineTotal: num(i.lineTotal),
      poQty: num(i.poQty),
      poUnitPrice: num(i.poUnitPrice),
      acceptedQty: num(i.acceptedQty),
      priceDeltaPct: i.poUnitPrice && num(i.poUnitPrice) > 0 ? ((num(i.unitPriceInvoiced) - num(i.poUnitPrice)) / num(i.poUnitPrice)) * 100 : 0,
      qtyDelta: num(i.qtyInvoiced) - num(i.acceptedQty),
    })),
    logs,
  };
}

/* ---------------------------------------------------------------- VENDOR ---- */

export async function getVendorBundle() {
  const rows = await db.select().from(s.vendors).orderBy(desc(s.vendors.compositeVendorScore));
  const poValues = await db
    .select({ vendorId: s.purchaseOrders.vendorId, total: sql<string>`coalesce(sum(${s.purchaseOrders.grandTotal}), 0)`, n: sql<number>`count(*)` })
    .from(s.purchaseOrders)
    .groupBy(s.purchaseOrders.vendorId);
  const valueMap = new Map(poValues.map((p) => [p.vendorId, p]));

  return {
    rows: rows.map((v) => ({
      id: v.id,
      vendorCode: v.vendorCode,
      companyName: v.companyName,
      npwp: v.npwp ?? "—",
      contactEmail: v.contactEmail ?? "—",
      phone: v.phone ?? "—",
      categorySpecialty: v.categorySpecialty ?? "—",
      tier: v.tier,
      onTime: num(v.onTimeDeliveryRate),
      quality: num(v.qualityAcceptanceRate),
      price: num(v.priceCompetitivenessScore),
      score: num(v.compositeVendorScore),
      bankAccountInfo: v.bankAccountInfo ?? "—",
      poCount: Number(valueMap.get(v.id)?.n ?? 0),
      poValue: num(valueMap.get(v.id)?.total),
    })),
    counts: tally(rows, "tier"),
  };
}

export async function getVendorDetail(id: string) {
  const [vendor] = await db.select().from(s.vendors).where(eq(s.vendors.id, id)).limit(1);
  if (!vendor) return null;

  const [pos, rfqQuotes, invoices] = await Promise.all([
    db
      .select({ id: s.purchaseOrders.id, poNumber: s.purchaseOrders.poNumber, status: s.purchaseOrders.status, grandTotal: s.purchaseOrders.grandTotal, expectedDeliveryDate: s.purchaseOrders.expectedDeliveryDate })
      .from(s.purchaseOrders)
      .where(eq(s.purchaseOrders.vendorId, id))
      .orderBy(desc(s.purchaseOrders.expectedDeliveryDate)),
    db
      .select({ id: s.rfqQuotations.id, totalBidAmount: s.rfqQuotations.totalBidAmount, deliveryLeadTimeDays: s.rfqQuotations.deliveryLeadTimeDays, rfqNumber: s.rfqEvents.rfqNumber, status: s.rfqEvents.status })
      .from(s.rfqQuotations)
      .innerJoin(s.rfqEvents, eq(s.rfqQuotations.rfqId, s.rfqEvents.id))
      .where(eq(s.rfqQuotations.vendorId, id)),
    db
      .select({ id: s.vendorInvoices.id, internalInvNumber: s.vendorInvoices.internalInvNumber, matchStatus: s.vendorInvoices.matchStatus, totalClaimed: s.vendorInvoices.totalClaimed, dueDate: s.vendorInvoices.dueDate })
      .from(s.vendorInvoices)
      .where(eq(s.vendorInvoices.vendorId, id))
      .orderBy(desc(s.vendorInvoices.dueDate)),
  ]);

  return {
    vendor,
    pos: pos.map((p) => ({ ...p, grandTotal: num(p.grandTotal) })),
    quotes: rfqQuotes.map((q) => ({ ...q, totalBidAmount: num(q.totalBidAmount) })),
    invoices: invoices.map((i) => ({ ...i, totalClaimed: num(i.totalClaimed) })),
  };
}

/* --------------------------------------------------------------- BUDGET ---- */

export async function getBudgetBundle() {
  const rows = await db.select().from(s.costCentersBudgets).orderBy(s.costCentersBudgets.code);
  const poValues = await db
    .select({ costCenterId: s.purchaseOrders.costCenterId, total: sql<string>`coalesce(sum(${s.purchaseOrders.grandTotal}), 0)`, n: sql<number>`count(*)` })
    .from(s.purchaseOrders)
    .groupBy(s.purchaseOrders.costCenterId);
  const valueMap = new Map(poValues.map((p) => [p.costCenterId, p]));

  return rows.map((b) => {
    const allocated = num(b.totalBudgetAllocated);
    const committed = num(b.committedEncumbered);
    const spent = num(b.actualSpentInvoiced);
    return {
      id: b.id,
      code: b.code,
      departmentName: b.departmentName,
      fiscalYear: b.fiscalYear,
      allocated,
      committed,
      spent,
      available: allocated - committed - spent,
      utilisation: allocated > 0 ? ((committed + spent) / allocated) * 100 : 0,
      version: b.version,
      poCount: Number(valueMap.get(b.id)?.n ?? 0),
      poValue: num(valueMap.get(b.id)?.total),
    };
  });
}

/* ------------------------------------------------------------------ DSS ---- */

export async function getDssBundle() {
  const [vendors, poItems, prs] = await Promise.all([
    db.select({ id: s.vendors.id, name: s.vendors.companyName, onTime: s.vendors.onTimeDeliveryRate, quality: s.vendors.qualityAcceptanceRate, score: s.vendors.compositeVendorScore, tier: s.vendors.tier }).from(s.vendors),
    db
      .select({ item: s.catalogItems.name, itemCode: s.catalogItems.itemCode, price: s.purchaseOrderItems.unitPriceAgreed, hps: s.catalogItems.standardReferencePrice })
      .from(s.purchaseOrderItems)
      .innerJoin(s.catalogItems, eq(s.purchaseOrderItems.itemId, s.catalogItems.id)),
    db
      .select({
        id: s.purchaseRequisitions.id,
        prNumber: s.purchaseRequisitions.prNumber,
        title: s.purchaseRequisitions.title,
        estimatedTotal: s.purchaseRequisitions.estimatedTotal,
        costCenter: s.costCentersBudgets.departmentName,
      })
      .from(s.purchaseRequisitions)
      .leftJoin(s.costCentersBudgets, eq(s.purchaseRequisitions.costCenterId, s.costCentersBudgets.id)),
  ]);

  const priceFindings = priceCreepAlert(poItems.map((r) => ({ name: r.item, price: num(r.price), hps: num(r.hps) })));
  const vendorFindings = vendorDowngradeRecommendation(
    vendors.map((v) => ({ name: v.name, onTime: num(v.onTime), rejectRate: 100 - num(v.quality) })),
  );

  const priceRows = poItems.map((r) => {
    const price = num(r.price);
    const hps = num(r.hps);
    return {
      item: r.item,
      itemCode: r.itemCode,
      price,
      hps,
      delta: price - hps,
      pct: hps > 0 ? ((price - hps) / hps) * 100 : 0,
      flagged: hps > 0 && (price - hps) / hps > 0.1,
    };
  });

  const splitFindings = detectSplitOrder(
    prs.map((p) => ({ id: p.id, dept: p.costCenter ?? "—", amount: num(p.estimatedTotal) })),
    50_000_000,
  );

  return {
    priceFindings: priceFindings.map((f) => ({ ...f, subject: f.message.replace(" price creep", "") })),
    vendorFindings: vendorFindings.map((f) => ({ ...f, subject: f.message.replace(" downgrade", "") })),
    priceRows,
    splitFindings,
    vendors: vendors.map((v) => ({ ...v, onTime: num(v.onTime), quality: num(v.quality), score: num(v.score), rejectRate: 100 - num(v.quality) })),
    stats: {
      priceCreep: priceFindings.length,
      vendorDowngrade: vendorFindings.length,
      splitOrder: splitFindings.length,
      itemsAboveHps: priceRows.filter((r) => r.flagged).length,
      itemsSampled: priceRows.length,
    },
  };
}

function detectSplitOrder(prs: { id: string; dept: string; amount: number }[], threshold: number) {
  // Heuristik ringan: pengajuan pada cost center yang sama dengan masing-masing nilai
  // di bawah ambang tender, tetapi totalnya mendekati atau melewati ambang tersebut.
  const findings: { subject: string; detail: string }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < prs.length; i++) {
    for (let j = i + 1; j < prs.length; j++) {
      const a = prs[i];
      const b = prs[j];
      if (a.id === b.id || a.dept !== b.dept) continue;
      const total = a.amount + b.amount;
      if (a.amount < threshold && b.amount < threshold && total >= threshold * 0.9) {
        const key = `${a.dept}-${a.id}-${b.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({
          subject: a.dept,
          detail: "Dua pengajuan pada cost center yang sama, masing-masing di bawah ambang tender, dengan total mendekati ambang.",
        });
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------- SETTINGS ---- */

export async function getSettingsBundle() {
  const [settings, rules, users, decisions] = await Promise.all([
    db.select().from(s.appSettings).orderBy(s.appSettings.key),
    db.select().from(s.decisionRules).orderBy(s.decisionRules.name),
    db.select({ id: s.profiles.id, email: s.profiles.email, fullName: s.profiles.fullName, role: s.profiles.role, vendorName: s.vendors.companyName }).from(s.profiles).leftJoin(s.vendors, eq(s.profiles.vendorId, s.vendors.id)).orderBy(s.profiles.role),
    db.select({ id: s.decisionLogs.id, result: s.decisionLogs.result, createdAt: s.decisionLogs.createdAt, ruleName: s.decisionRules.name }).from(s.decisionLogs).leftJoin(s.decisionRules, eq(s.decisionLogs.ruleId, s.decisionRules.id)).orderBy(desc(s.decisionLogs.createdAt)).limit(20),
  ]);
  return { settings, rules, users, decisions };
}

export async function getAuditBundle() {
  const rows = await db
    .select({ id: s.auditLogs.id, action: s.auditLogs.action, entity: s.auditLogs.entity, entityId: s.auditLogs.entityId, createdAt: s.auditLogs.createdAt, actor: s.profiles.fullName, role: s.profiles.role })
    .from(s.auditLogs)
    .leftJoin(s.profiles, eq(s.auditLogs.actorId, s.profiles.id))
    .orderBy(desc(s.auditLogs.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r, actor: r.actor ?? "Sistem" }));
}
