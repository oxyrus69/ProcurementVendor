"use server";

import { randomUUID, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { requireRole } from "@/server/rbac";
import { checkAndEncumberBudget } from "@/server/services/budgetEngine";
import { evaluateThreeWayMatchPure } from "@/lib/procurementMath";
import { eq, sql, and } from "drizzle-orm";

/**
 * Mengubah galat tak terduga (basis data, koneksi, sesi basi) menjadi pesan
 * yang bisa dipakai pengguna. Pesan validasi domain diteruskan apa adanya.
 */
function toUserError(error: unknown): Error {
  if (error instanceof Error) {
    const message = error.message;
    const isDomainMessage =
      !/query|constraint|Failed query|SQL|react\.dev|Minified React|ECONN|serialize/i.test(message) && message.length < 200;
    if (isDomainMessage) return error;
  }
  console.error("[procurement-action]", error);
  return new Error("Aksi tidak dapat diselesaikan. Muat ulang halaman lalu coba lagi.");
}

/** Menjalankan badan aksi dan memetakan galat tak terduga ke pesan yang ramah. */
async function run(action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    throw toUserError(error);
  }
}

function seq(prefix: string) {
  const d = new Date();
  return `${prefix}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

async function audit(actorId: string, action: string, entity: string, entityId: string) {
  await db.insert(s.auditLogs).values({ id: randomUUID(), actorId, action, entity, entityId });
}

export async function createRequisition(formData: FormData) {
  await run(async () => {
    const user = await requireRole(["SUPER_ADMIN", "DEPT_APPROVER"]);
    const title = String(formData.get("title") || "").trim();
    const itemId = String(formData.get("itemId") || "");
    const costCenterId = String(formData.get("costCenterId") || "");
    const qty = Number(formData.get("qty"));
    const unitPrice = Number(formData.get("unitPrice"));
    if (!title || !itemId || !costCenterId || !Number.isInteger(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error("Input PR tidak valid.");

    const prId = randomUUID();
    const total = qty * unitPrice;
    await db.insert(s.purchaseRequisitions).values({ id: prId, prNumber: seq("PR"), requesterId: user.sub, costCenterId, title, justification: String(formData.get("justification") || ""), estimatedTotal: total.toFixed(2), status: "PENDING_APPROVAL" });
    await db.insert(s.purchaseRequisitionItems).values({ id: randomUUID(), prId, itemId, description: title, qty, unitPriceEstimate: unitPrice.toFixed(2), lineTotal: total.toFixed(2) });
    await audit(user.sub, "CREATE_REQUISITION", "purchase_requisition", prId);
    revalidatePath("/requisitions");
    revalidatePath("/admin");
  });
}

export async function approveRequisition(formData: FormData) {
  await run(async () => {
    const user = await requireRole(["SUPER_ADMIN", "PROCUREMENT_OFFICER"]);
    const prId = String(formData.get("prId"));
    await db.transaction(async (tx) => {
      const [pr] = await tx.select().from(s.purchaseRequisitions).where(eq(s.purchaseRequisitions.id, prId)).limit(1);
      if (!pr) throw new Error("PR tidak ditemukan.");
      if (!["DRAFT", "PENDING_APPROVAL"].includes(pr.status)) throw new Error("PR sudah diproses dan tidak dapat disetujui ulang.");
      if (!pr.costCenterId) throw new Error("Cost center PR tidak valid.");

      const [budget] = await tx.select().from(s.costCentersBudgets).where(eq(s.costCentersBudgets.id, pr.costCenterId)).limit(1);
      if (!budget) throw new Error("Anggaran tidak ditemukan.");

      const check = checkAndEncumberBudget({
        totalBudgetAllocated: Number(budget.totalBudgetAllocated),
        committedEncumbered: Number(budget.committedEncumbered),
        actualSpentInvoiced: Number(budget.actualSpentInvoiced),
        prAmount: Number(pr.estimatedTotal),
      });
      if (!check.ok) throw new Error(`Pagu tidak cukup. Tersedia Rp ${check.available.toLocaleString("id-ID")}.`);

      await tx.update(s.costCentersBudgets)
        .set({ committedEncumbered: sql`${s.costCentersBudgets.committedEncumbered} + ${pr.estimatedTotal}`, version: sql`${s.costCentersBudgets.version} + 1` })
        .where(eq(s.costCentersBudgets.id, budget.id));
      await tx.update(s.purchaseRequisitions)
        .set({ status: "APPROVED_FOR_SOURCING", approvedBy: user.sub, approvedAt: new Date(), version: sql`${s.purchaseRequisitions.version} + 1` })
        .where(eq(s.purchaseRequisitions.id, prId));
      await tx.insert(s.auditLogs).values({ id: randomUUID(), actorId: user.sub, action: "APPROVE_REQUISITION", entity: "purchase_requisition", entityId: prId });
    });
    revalidatePath("/requisitions");
    revalidatePath("/budgets");
    revalidatePath("/admin");
  });
}

export async function convertPrToRfq(formData: FormData) {
  await run(async () => {
    const user = await requireRole(["SUPER_ADMIN", "PROCUREMENT_OFFICER"]);
    const prId = String(formData.get("prId"));
    const [pr] = await db.select().from(s.purchaseRequisitions).where(eq(s.purchaseRequisitions.id, prId)).limit(1);
    if (!pr || pr.status !== "APPROVED_FOR_SOURCING") throw new Error("PR belum siap dikonversi.");

    const rfqId = randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(s.rfqEvents).values({ id: rfqId, rfqNumber: seq("RFQ"), prId, title: pr.title, deadlineAt: new Date(Date.now() + 7 * 86400000), status: "OPEN_FOR_BIDDING" });
      await tx.update(s.purchaseRequisitions).set({ status: "CONVERTED_TO_RFQ_PO" }).where(eq(s.purchaseRequisitions.id, prId));
    });

    const approvedVendors = await db.select().from(s.vendors).where(eq(s.vendors.tier, "APPROVED"));
    if (approvedVendors.length) {
      await db.insert(s.rfqInvitedVendors).values(approvedVendors.map((v) => ({ id: randomUUID(), rfqId, vendorId: v.id })));
    }
    await audit(user.sub, "CONVERT_PR_TO_RFQ", "purchase_requisition", prId);
    revalidatePath("/requisitions");
    revalidatePath("/rfq");
    revalidatePath("/admin");
  });
}

export async function awardRfq(formData: FormData) {
  await run(async () => {
    const user = await requireRole(["SUPER_ADMIN", "PROCUREMENT_OFFICER"]);
    const rfqId = String(formData.get("rfqId"));
    const quotationId = String(formData.get("quotationId"));
    await db.transaction(async (tx) => {
      const [q] = await tx.select().from(s.rfqQuotations).where(eq(s.rfqQuotations.id, quotationId)).limit(1);
      const [rfq] = await tx.select().from(s.rfqEvents).where(eq(s.rfqEvents.id, rfqId)).limit(1);
      if (!q || !rfq || q.rfqId !== rfqId) throw new Error("Kuotasi tidak sesuai dengan RFQ.");
      if (["AWARDED", "CANCELLED"].includes(rfq.status)) throw new Error("RFQ sudah ditutup dan tidak dapat diberi pemenang ulang.");

      const [pr] = await tx.select().from(s.purchaseRequisitions).where(eq(s.purchaseRequisitions.id, rfq.prId!)).limit(1);
      if (!pr) throw new Error("PR sumber tidak ditemukan.");
      const prItems = await tx.select().from(s.purchaseRequisitionItems).where(eq(s.purchaseRequisitionItems.prId, pr.id));
      if (!prItems.length) throw new Error("PR tidak memiliki baris barang.");

      const bid = Number(q.totalBidAmount);
      if (!Number.isFinite(bid) || bid <= 0) throw new Error("Nilai kuotasi tidak valid.");

      const tax = Math.round(bid * 0.11);
      const poId = randomUUID();
      const ratio = Number(pr.estimatedTotal) > 0 ? bid / Number(pr.estimatedTotal) : 1;

      await tx.update(s.rfqEvents)
        .set({ status: "AWARDED", awardedVendorId: q.vendorId, awardJustification: String(formData.get("justification") || "Skor tertinggi pada matriks evaluasi") })
        .where(eq(s.rfqEvents.id, rfqId));
      await tx.insert(s.purchaseOrders).values({
        id: poId,
        poNumber: seq("PO"),
        prId: rfq.prId,
        rfqId,
        vendorId: q.vendorId,
        costCenterId: pr.costCenterId,
        status: "ISSUED_SENT",
        subtotal: bid.toFixed(2),
        taxAmount: tax.toFixed(2),
        shippingCost: "0.00",
        grandTotal: (bid + tax).toFixed(2),
        expectedDeliveryDate: new Date(Date.now() + q.deliveryLeadTimeDays * 86400000),
        paymentTermsDays: q.paymentTermsDays,
        verificationHash: createHash("sha256").update(`${poId}:${rfqId}:${bid}`).digest("hex"),
      });
      await tx.insert(s.purchaseOrderItems).values(
        prItems.map((item) => {
          const unitPrice = Number(item.unitPriceEstimate) * ratio;
          return {
            id: randomUUID(),
            poId,
            itemId: item.itemId,
            description: item.description,
            orderedQty: item.qty,
            receivedAcceptedQty: 0,
            invoicedQty: 0,
            unitPriceAgreed: unitPrice.toFixed(2),
            lineTotal: (unitPrice * item.qty).toFixed(2),
          };
        }),
      );
      await tx.update(s.purchaseRequisitions).set({ status: "CONVERTED_TO_RFQ_PO" }).where(eq(s.purchaseRequisitions.id, pr.id));
      await tx.insert(s.auditLogs).values({ id: randomUUID(), actorId: user.sub, action: "AWARD_RFQ", entity: "rfq_event", entityId: rfqId });
    });
    revalidatePath(`/rfq/${rfqId}`);
    revalidatePath("/rfq");
    revalidatePath("/purchase-orders");
    revalidatePath("/requisitions");
    revalidatePath("/admin");
  });
}

export async function receiveGoods(formData: FormData) {
  await run(async () => {
    const user = await requireRole(["SUPER_ADMIN", "WAREHOUSE_RECEIVER", "PROCUREMENT_OFFICER"]);
    const poId = String(formData.get("poId"));
    const poItemId = String(formData.get("poItemId"));
    const accepted = Number(formData.get("qtyAccepted"));
    const rejected = Number(formData.get("qtyRejected") || 0);
    if (!Number.isInteger(accepted) || !Number.isInteger(rejected) || accepted < 0 || rejected < 0 || accepted + rejected <= 0) throw new Error("Kuantitas GRN tidak valid.");

    await db.transaction(async (tx) => {
      const [poItem] = await tx.select().from(s.purchaseOrderItems).where(and(eq(s.purchaseOrderItems.id, poItemId), eq(s.purchaseOrderItems.poId, poId))).limit(1);
      if (!poItem) throw new Error("Item PO tidak sesuai dengan dokumen PO.");
      const remaining = poItem.orderedQty - poItem.receivedAcceptedQty;
      if (accepted > remaining) throw new Error(`Kuantitas diterima melebihi sisa PO (${remaining}).`);

      const grnId = randomUUID();
      await tx.insert(s.goodsReceipts).values({ id: grnId, grnNumber: seq("GRN"), poId, receivedBy: user.sub, deliveryNoteRef: String(formData.get("deliveryNoteRef") || "") });
      await tx.insert(s.goodsReceiptItems).values({ id: randomUUID(), grnId, poItemId, qtyDelivered: accepted + rejected, qtyAcceptedGood: accepted, qtyRejectedDamaged: rejected, inspectionNotes: String(formData.get("inspectionNotes") || "") });

      const acceptedTotal = poItem.receivedAcceptedQty + accepted;
      await tx.update(s.purchaseOrderItems).set({ receivedAcceptedQty: acceptedTotal }).where(eq(s.purchaseOrderItems.id, poItemId));

      const allItems = await tx.select().from(s.purchaseOrderItems).where(eq(s.purchaseOrderItems.poId, poId));
      const complete = allItems.every((item) => item.receivedAcceptedQty >= item.orderedQty);
      await tx.update(s.purchaseOrders).set({ status: complete ? "FULLY_RECEIVED" : "PARTIALLY_RECEIVED" }).where(eq(s.purchaseOrders.id, poId));
      await tx.insert(s.auditLogs).values({ id: randomUUID(), actorId: user.sub, action: "RECEIVE_GOODS", entity: "goods_receipt", entityId: grnId });
    });
    revalidatePath("/goods-receipts");
    revalidatePath(`/purchase-orders/${poId}`);
    revalidatePath("/admin");
  });
}

export async function verifyInvoice(formData: FormData) {
  await run(async () => {
    const user = await requireRole(["SUPER_ADMIN", "AP_FINANCE"]);
    const invoiceId = String(formData.get("invoiceId"));
    const items = await db
      .select({
        inv: s.vendorInvoiceItems,
        po: s.purchaseOrderItems,
        accepted: sql<number>`coalesce((select sum(${s.goodsReceiptItems.qtyAcceptedGood}) from ${s.goodsReceiptItems} where ${s.goodsReceiptItems.poItemId} = ${s.purchaseOrderItems.id}), 0)`,
      })
      .from(s.vendorInvoiceItems)
      .innerJoin(s.purchaseOrderItems, eq(s.vendorInvoiceItems.poItemId, s.purchaseOrderItems.id))
      .where(eq(s.vendorInvoiceItems.invoiceId, invoiceId));
    if (!items.length) throw new Error("Invoice tidak ditemukan atau tidak memiliki baris barang.");

    const results = items.map((row) =>
      evaluateThreeWayMatchPure({
        poUnitPrice: Number(row.po.unitPriceAgreed),
        poQty: row.po.orderedQty,
        grnAcceptedQty: Number(row.accepted),
        invUnitPrice: Number(row.inv.unitPriceInvoiced),
        invQty: row.inv.qtyInvoiced,
      }),
    );

    let status: "MATCHED_PASSED" | "WITHIN_TOLERANCE_PASSED" | "PRICE_VARIANCE_HOLD" | "QTY_VARIANCE_HOLD" = "MATCHED_PASSED";
    for (const r of results) {
      if (r.status === "QTY_VARIANCE_HOLD") status = "QTY_VARIANCE_HOLD";
      else if (r.status === "PRICE_VARIANCE_HOLD" && status !== "QTY_VARIANCE_HOLD") status = "PRICE_VARIANCE_HOLD";
      else if (r.status === "WITHIN_TOLERANCE_PASSED" && status === "MATCHED_PASSED") status = "WITHIN_TOLERANCE_PASSED";
    }

    const worstPrice = results.reduce((a, b) => (Math.abs(b.priceVarianceAmount) > Math.abs(a.priceVarianceAmount) ? b : a), results[0]);
    const worstQty = results.reduce((a, b) => (b.qtyVarianceUnits > a.qtyVarianceUnits ? b : a), results[0]);

    await db.update(s.vendorInvoices)
      .set({
        matchStatus: status,
        priceVarianceAmount: worstPrice.priceVarianceAmount.toFixed(2),
        priceVariancePct: worstPrice.priceVariancePct.toFixed(2),
        qtyVarianceUnits: worstQty.qtyVarianceUnits,
        discrepancySummary: results,
      })
      .where(eq(s.vendorInvoices.id, invoiceId));
    await db.insert(s.threeWayMatchLogs).values({ id: randomUUID(), invoiceId, result: status });
    await audit(user.sub, "VERIFY_INVOICE", "vendor_invoice", invoiceId);
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/admin");
  });
}

export async function payInvoice(formData: FormData) {
  await run(async () => {
    const user = await requireRole(["SUPER_ADMIN", "AP_FINANCE"]);
    const invoiceId = String(formData.get("invoiceId"));
    const [inv] = await db.select().from(s.vendorInvoices).where(eq(s.vendorInvoices.id, invoiceId)).limit(1);
    if (!inv) throw new Error("Invoice tidak ditemukan.");
    if (!["MATCHED_PASSED", "WITHIN_TOLERANCE_PASSED"].includes(inv.matchStatus)) throw new Error("Invoice masih ditahan dan tidak dapat dibayar.");

    const [po] = inv.poId ? await db.select().from(s.purchaseOrders).where(eq(s.purchaseOrders.id, inv.poId)).limit(1) : [null];
    await db.transaction(async (tx) => {
      await tx.update(s.vendorInvoices).set({ matchStatus: "PAID", paidAt: new Date() }).where(eq(s.vendorInvoices.id, invoiceId));
      if (po?.costCenterId) {
        const [budget] = await tx.select().from(s.costCentersBudgets).where(eq(s.costCentersBudgets.id, po.costCenterId)).limit(1);
        if (budget) {
          await tx.update(s.costCentersBudgets)
            .set({
              committedEncumbered: Math.max(0, Number(budget.committedEncumbered) - Number(po.grandTotal)).toFixed(2),
              actualSpentInvoiced: (Number(budget.actualSpentInvoiced) + Number(inv.totalClaimed)).toFixed(2),
              version: sql`${s.costCentersBudgets.version} + 1`,
            })
            .where(eq(s.costCentersBudgets.id, budget.id));
        }
      }
    });
    await audit(user.sub, "PAY_INVOICE", "vendor_invoice", invoiceId);
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/budgets");
    revalidatePath("/admin");
  });
}
