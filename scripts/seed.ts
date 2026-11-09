import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/server/db";
import * as s from "../src/server/db/schema";

const id = () => randomUUID();
const money = (n: number) => n.toFixed(2);

async function seed() {
  // Reset in FK-safe order so seeding is repeatable.
  for (const table of [
    s.threeWayMatchLogs,
    s.vendorInvoiceItems,
    s.vendorInvoices,
    s.goodsReceiptItems,
    s.goodsReceipts,
    s.purchaseOrderItems,
    s.purchaseOrders,
    s.rfqQuotationItems,
    s.rfqQuotations,
    s.rfqInvitedVendors,
    s.rfqEvents,
    s.purchaseRequisitionItems,
    s.purchaseRequisitions,
    s.auditLogs,
    s.decisionLogs,
    s.profiles,
    s.vendors,
    s.catalogItems,
    s.costCentersBudgets,
    s.appSettings,
    s.documentSequences,
    s.idempotencyKeys,
    s.decisionRules,
  ]) {
    await db.delete(table);
  }

  /* ---------------------------------------------------------- cost center */
  const budgetSeed: [string, number, number, number][] = [
    ["IT", 1_000_000_000, 400_000_000, 0],
    ["Operations", 1_250_000_000, 35_000_000, 95_000_000],
    ["Medical", 1_500_000_000, 50_000_000, 120_000_000],
    ["Facilities", 1_750_000_000, 0, 0],
  ];
  const budgets = budgetSeed.map(([departmentName, totalBudgetAllocated, committedEncumbered, actualSpentInvoiced], i) => ({
    id: id(),
    code: `CC-${departmentName.toUpperCase()}-2026`,
    departmentName,
    fiscalYear: 2026,
    totalBudgetAllocated: money(totalBudgetAllocated),
    committedEncumbered: money(committedEncumbered),
    actualSpentInvoiced: money(actualSpentInvoiced),
    version: 1 + i,
  }));
  await db.insert(s.costCentersBudgets).values(budgets);

  /* -------------------------------------------------------------- catalog */
  const itemSeed = [
    ["IT-001", "Laptop ThinkPad", "IT", "UNIT", 15_000_000],
    ["IT-002", "Rack Server", "IT", "UNIT", 80_000_000],
    ["IT-003", "Network Switch 48 Port", "IT", "UNIT", 12_000_000],
    ["IT-004", "Microsoft 365 License", "Software", "LICENSE", 2_500_000],
    ["OPS-001", "Kertas A4 80gsm", "Office", "BOX", 350_000],
    ["OPS-002", "Toner LaserJet", "Office", "UNIT", 1_200_000],
    ["MED-001", "Sarung Tangan Medis", "Medical", "BOX", 250_000],
    ["MED-002", "Masker N95", "Medical", "BOX", 450_000],
    ["FAC-001", "Kabel UTP Cat6", "Facilities", "ROLL", 1_800_000],
    ["FAC-002", "Semen Portland", "Construction", "KG", 75_000],
  ] as const;
  const items = itemSeed.map(([itemCode, name, category, uom, price]) => ({
    id: id(),
    itemCode,
    name,
    category,
    uom,
    standardReferencePrice: money(price),
    lastPurchasePrice: money(price),
  }));
  await db.insert(s.catalogItems).values(items);

  /* -------------------------------------------------------------- vendors */
  const vendorNames = ["Mitra Teknologi", "Sumber Sarana", "Medika Supply", "Karya Konstruksi", "Global Office"];
  const vendorRows = vendorNames.map((companyName, i) => ({
    id: id(),
    vendorCode: `VND-${String(i + 1).padStart(3, "0")}`,
    companyName,
    npwp: `01.234.567.8-09${i}.000`,
    contactEmail: `sales@${companyName.toLowerCase().replaceAll(" ", "")}.co.id`,
    phone: `021-555-010${i}`,
    categorySpecialty: i < 2 ? "IT" : i === 2 ? "Medical" : i === 3 ? "Construction" : "Office",
    tier: i === 4 ? "PROBATION" : "APPROVED",
    onTimeDeliveryRate: money([96, 88, 92, 78, 85][i]),
    qualityAcceptanceRate: money([98, 96, 99, 94, 90][i]),
    priceCompetitivenessScore: money([92, 88, 85, 82, 90][i]),
    compositeVendorScore: money([95, 90, 88, 78, 85][i]),
    bankAccountInfo: `BCA 12345678${i}`,
  }));
  await db.insert(s.vendors).values(vendorRows);

  /* --------------------------------------------------------------- users */
  const hash = await bcrypt.hash("nexus123", 10);
  const users = [
    ["cpo@nexusprocure.id", "Chief Procurement Officer", "SUPER_ADMIN"],
    ["buyer@nexusprocure.id", "Procurement Buyer", "PROCUREMENT_OFFICER"],
    ["it.head@nexusprocure.id", "IT Department Head", "DEPT_APPROVER"],
    ["receiving@nexusprocure.id", "Warehouse Receiver", "WAREHOUSE_RECEIVER"],
    ["ap.finance@nexusprocure.id", "AP Finance", "AP_FINANCE"],
    ["sales@mitrateknologi.co.id", "Mitra Teknologi Sales", "VENDOR_PARTNER"],
  ] as const;
  const profileRows = users.map(([email, fullName, role]) => ({
    id: id(),
    email,
    fullName,
    role,
    passwordHash: hash,
    vendorId: role === "VENDOR_PARTNER" ? vendorRows[0].id : null,
  }));
  await db.insert(s.profiles).values(profileRows);
  const [cpo, buyer, deptHead, receiver, apFinance] = profileRows;

  /* ------------------------------------------------------------------ PR */
  const prSeed: [string, string, number, number, number, string, Date | null, string | null, Date | null][] = [
    // title, justification, itemIdx, qty, budgetIdx, status, neededBy, approvedBy, approvedAt
    ["Refresh laptop divisi IT", "Penggantian unit usia di atas 4 tahun", 0, 10, 0, "CONVERTED_TO_RFQ_PO", new Date("2026-12-10"), cpo.id, new Date("2026-11-01")],
    ["Pengadaan server data center", "Kapasitas storage menyentuh batas aman", 1, 5, 0, "CONVERTED_TO_RFQ_PO", new Date("2026-12-12"), cpo.id, new Date("2026-11-01")],
    ["Stok ATK kuartal IV", "Persediaan kertas dan toner untuk operasional", 4, 100, 1, "APPROVED_FOR_SOURCING", new Date("2026-12-05"), cpo.id, new Date("2026-11-03")],
    ["Belanja alat medis", "Penambahan stok ruang isolasi", 6, 100, 2, "APPROVED_FOR_SOURCING", new Date("2026-12-08"), cpo.id, new Date("2026-11-04")],
    ["Kabel UTP proyek lantai 3", "Penarikan kabel jaringan area baru", 8, 40, 3, "PENDING_APPROVAL", new Date("2026-12-18"), null, null],
    ["Lisensi Microsoft 365 tambahan", "Onboarding 25 karyawan baru", 3, 25, 0, "PENDING_APPROVAL", new Date("2026-12-20"), null, null],
  ];
  const prRows = prSeed.map(([title, justification, itemIdx, qty, budgetIdx, status, neededByDate, approvedBy, approvedAt], i) => {
    const unit = Number(items[itemIdx].standardReferencePrice);
    return {
      id: id(),
      prNumber: `PR-202611-${String(i + 1).padStart(4, "0")}`,
      requesterId: deptHead.id,
      costCenterId: budgets[budgetIdx].id,
      title,
      justification,
      neededByDate,
      estimatedTotal: money(qty * unit),
      status,
      approvedBy,
      approvedAt,
      version: 1,
    };
  });
  await db.insert(s.purchaseRequisitions).values(prRows);

  await db.insert(s.purchaseRequisitionItems).values(
    prRows.map((pr, i) => {
      const itemIdx = prSeed[i][2];
      const qty = prSeed[i][3];
      const unit = Number(items[itemIdx].standardReferencePrice);
      return {
        id: id(),
        prId: pr.id,
        itemId: items[itemIdx].id,
        description: items[itemIdx].name,
        qty,
        unitPriceEstimate: items[itemIdx].standardReferencePrice,
        lineTotal: money(qty * unit),
      };
    }),
  );

  /* ----------------------------------------------------------------- RFQ */
  const rfqRows = [0, 1].map((i) => ({
    id: id(),
    rfqNumber: `RFQ-202611-${String(i + 1).padStart(4, "0")}`,
    prId: prRows[i].id,
    title: prSeed[i][0],
    deadlineAt: new Date("2026-11-20"),
    status: i === 0 ? "EVALUATION_LOCKED" : "AWARDED",
    awardedVendorId: i === 1 ? vendorRows[0].id : null,
    awardJustification: i === 1 ? "Skor tertinggi dan lead time terbaik" : null,
  }));
  await db.insert(s.rfqEvents).values(rfqRows);

  await db.insert(s.rfqInvitedVendors).values(
    rfqRows.flatMap((rfq) => vendorRows.slice(0, 3).map((v) => ({ id: id(), rfqId: rfq.id, vendorId: v.id }))),
  );

  const quoteRows = rfqRows.flatMap((rfq, ri) =>
    vendorRows.slice(0, 3).map((v, vi) => ({
      id: id(),
      rfqId: rfq.id,
      vendorId: v.id,
      totalBidAmount: money((ri === 0 ? 145_000_000 : 390_000_000) + vi * 5_000_000),
      deliveryLeadTimeDays: 14 + vi * 7,
      warrantyMonths: 12 + vi * 12,
      paymentTermsDays: [30, 45, 60][vi],
      technicalComplianceScore: money(90 - vi * 5),
      weightedRankScore: money(95 - vi * 4),
    })),
  );
  await db.insert(s.rfqQuotations).values(quoteRows);

  /* ------------------------------------------------------------------ PO */
  // itemIdx, qty, vendorIdx, budgetIdx, priceMultiplier, status
  const poSeed: [number, number, number, number, number, string][] = [
    [0, 10, 0, 0, 1.0, "FULLY_RECEIVED"],
    [1, 5, 1, 0, 1.0, "PARTIALLY_RECEIVED"],
    [2, 100, 2, 2, 1.0, "PARTIALLY_RECEIVED"],
    [3, 40, 3, 3, 1.14, "ISSUED_SENT"],
    [4, 25, 4, 1, 1.0, "ISSUED_SENT"],
  ];
  const poRows = poSeed.map(([itemIdx, qty, vendorIdx, budgetIdx, multiplier, status], i) => {
    const price = Number(items[itemIdx].standardReferencePrice) * multiplier;
    const subtotal = qty * price;
    const tax = Math.round(subtotal * 0.11);
    return {
      id: id(),
      poNumber: `PO-202611-${String(i + 1).padStart(4, "0")}`,
      prId: prRows[i].id,
      rfqId: i < 2 ? rfqRows[i].id : null,
      vendorId: vendorRows[vendorIdx].id,
      costCenterId: budgets[budgetIdx].id,
      status,
      subtotal: money(subtotal),
      taxAmount: money(tax),
      shippingCost: "500000.00",
      grandTotal: money(subtotal + tax + 500000),
      expectedDeliveryDate: new Date("2026-11-15"),
      paymentTermsDays: 30,
      verificationHash: `sha256-${i}-nexus`,
    };
  });
  await db.insert(s.purchaseOrders).values(poRows);

  const poItemRows = poRows.map((po, i) => {
    const itemIdx = poSeed[i][0];
    const qty = poSeed[i][1];
    const price = Number(items[itemIdx].standardReferencePrice) * poSeed[i][4];
    return {
      id: id(),
      poId: po.id,
      itemId: items[itemIdx].id,
      description: items[itemIdx].name,
      orderedQty: qty,
      receivedAcceptedQty: i < 2 ? qty : i === 2 ? qty : 0,
      invoicedQty: i < 4 ? qty : 0,
      unitPriceAgreed: money(price),
      lineTotal: money(qty * price),
    };
  });
  await db.insert(s.purchaseOrderItems).values(poItemRows);

  /* ----------------------------------------------------------------- GRN */
  const grnRows = poRows.slice(0, 3).map((po, i) => ({
    id: id(),
    grnNumber: `GRN-202611-${String(i + 1).padStart(4, "0")}`,
    poId: po.id,
    receivedBy: receiver.id,
    receivedAt: new Date(`2026-11-0${i + 3}T08:00:00Z`),
    deliveryNoteRef: `SJ-VND-${100 + i}`,
  }));
  await db.insert(s.goodsReceipts).values(grnRows);

  const grnItemRows = grnRows.map((grn, i) => {
    const ordered = poItemRows[i].orderedQty;
    const rejected = i === 2 ? 2 : 0;
    return {
      id: id(),
      grnId: grn.id,
      poItemId: poItemRows[i].id,
      qtyDelivered: ordered,
      qtyAcceptedGood: ordered - rejected,
      qtyRejectedDamaged: rejected,
      inspectionNotes: rejected ? "2 unit ditolak karena cacat fisik" : "Sesuai PO",
    };
  });
  await db.insert(s.goodsReceiptItems).values(grnItemRows);

  /* ------------------------------------------------------------- INVOICE */
  const invoiceStatuses = ["PAID", "WITHIN_TOLERANCE_PASSED", "QTY_VARIANCE_HOLD", "PRICE_VARIANCE_HOLD"];
  const invoiceRows = poRows.slice(0, 4).map((po, i) => {
    const factor = i === 1 ? 1.01 : i === 3 ? 1.08 : 1;
    const subtotal = Math.round(Number(po.subtotal) * factor);
    const tax = Math.round(subtotal * 0.11);
    return {
      id: id(),
      internalInvNumber: `VINV-202611-${String(i + 1).padStart(4, "0")}`,
      vendorInvoiceNo: `INV-EXT-${200 + i}`,
      poId: po.id,
      vendorId: po.vendorId,
      invoiceDate: new Date("2026-11-06"),
      dueDate: new Date("2026-12-06"),
      subtotalClaimed: money(subtotal),
      taxClaimed: money(tax),
      totalClaimed: money(subtotal + tax),
      matchStatus: invoiceStatuses[i],
      poTotalReference: po.subtotal,
      grnAcceptedValueReference: po.subtotal,
      priceVarianceAmount: money(subtotal - Number(po.subtotal)),
      priceVariancePct: money(i === 1 ? 1 : i === 3 ? 8 : 0),
      qtyVarianceUnits: i === 2 ? 2 : 0,
      discrepancySummary: { scenario: invoiceStatuses[i] },
      overrideApprovedBy: null,
      overrideReason: null,
      paidAt: i === 0 ? new Date("2026-11-07") : null,
    };
  });
  await db.insert(s.vendorInvoices).values(invoiceRows);

  const invoiceItemRows = invoiceRows.map((inv, i) => {
    const unitPrice = Number(poItemRows[i].unitPriceAgreed) * (i === 1 ? 1.01 : i === 3 ? 1.08 : 1);
    const qty = poItemRows[i].orderedQty;
    return {
      id: id(),
      invoiceId: inv.id,
      poItemId: poItemRows[i].id,
      description: poItemRows[i].description,
      qtyInvoiced: qty,
      unitPriceInvoiced: money(unitPrice),
      lineTotal: money(unitPrice * qty),
    };
  });
  await db.insert(s.vendorInvoiceItems).values(invoiceItemRows);

  await db.insert(s.threeWayMatchLogs).values(
    invoiceRows.map((inv) => ({ id: id(), invoiceId: inv.id, result: inv.matchStatus })),
  );

  /* ---------------------------------------------------- SETTINGS & RULES */
  await db.insert(s.appSettings).values([
    { id: id(), key: "priceTolerancePct", value: "2.0" },
    { id: id(), key: "maxToleranceIdr", value: "100000" },
    { id: id(), key: "rfqThresholdIdr", value: "50000000" },
  ]);

  const ruleRows = [
    { id: id(), name: "priceCreepAlert", threshold: money(0.1) },
    { id: id(), name: "vendorDowngradeRecommendation", threshold: money(80) },
    { id: id(), name: "detectSplitOrderAnomaly", threshold: money(50_000_000) },
    { id: id(), name: "threeWayMatchTolerancePct", threshold: money(2.0) },
  ];
  await db.insert(s.decisionRules).values(ruleRows);

  await db.insert(s.decisionLogs).values([
    { id: id(), ruleId: ruleRows[0].id, result: "FLAGGED", createdAt: new Date("2026-11-06T09:15:00Z") },
    { id: id(), ruleId: ruleRows[1].id, result: "FLAGGED", createdAt: new Date("2026-11-06T09:16:00Z") },
    { id: id(), ruleId: ruleRows[1].id, result: "FLAGGED", createdAt: new Date("2026-11-06T09:16:00Z") },
    { id: id(), ruleId: ruleRows[2].id, result: "PASSED", createdAt: new Date("2026-11-06T09:17:00Z") },
    { id: id(), ruleId: ruleRows[3].id, result: "PASSED", createdAt: new Date("2026-11-07T14:02:00Z") },
  ]);

  /* ---------------------------------------------------------- AUDIT LOGS */
  const auditSeed: [string, string, string, string | null, Date][] = [
    ["APPROVE_REQUISITION", "purchase_requisition", prRows[0].id, cpo.id, new Date("2026-11-01T08:30:00Z")],
    ["CONVERT_PR_TO_RFQ", "purchase_requisition", prRows[0].id, buyer.id, new Date("2026-11-01T10:05:00Z")],
    ["APPROVE_REQUISITION", "purchase_requisition", prRows[1].id, cpo.id, new Date("2026-11-01T08:35:00Z")],
    ["CONVERT_PR_TO_RFQ", "purchase_requisition", prRows[1].id, buyer.id, new Date("2026-11-01T10:10:00Z")],
    ["APPROVE_REQUISITION", "purchase_requisition", prRows[2].id, cpo.id, new Date("2026-11-03T09:00:00Z")],
    ["APPROVE_REQUISITION", "purchase_requisition", prRows[3].id, cpo.id, new Date("2026-11-04T09:20:00Z")],
    ["AWARD_RFQ", "rfq_event", rfqRows[1].id, buyer.id, new Date("2026-11-05T11:40:00Z")],
    ["RECEIVE_GOODS", "goods_receipt", grnRows[0].id, receiver.id, new Date("2026-11-03T08:00:00Z")],
    ["RECEIVE_GOODS", "goods_receipt", grnRows[1].id, receiver.id, new Date("2026-11-04T08:10:00Z")],
    ["RECEIVE_GOODS", "goods_receipt", grnRows[2].id, receiver.id, new Date("2026-11-05T08:25:00Z")],
    ["VERIFY_INVOICE", "vendor_invoice", invoiceRows[0].id, apFinance.id, new Date("2026-11-06T13:15:00Z")],
    ["VERIFY_INVOICE", "vendor_invoice", invoiceRows[1].id, apFinance.id, new Date("2026-11-06T13:20:00Z")],
    ["VERIFY_INVOICE", "vendor_invoice", invoiceRows[2].id, apFinance.id, new Date("2026-11-06T13:25:00Z")],
    ["VERIFY_INVOICE", "vendor_invoice", invoiceRows[3].id, apFinance.id, new Date("2026-11-06T13:30:00Z")],
    ["PAY_INVOICE", "vendor_invoice", invoiceRows[0].id, apFinance.id, new Date("2026-11-07T10:00:00Z")],
  ];
  await db.insert(s.auditLogs).values(
    auditSeed.map(([action, entity, entityId, actorId, createdAt]) => ({ id: id(), action, entity, entityId, actorId, createdAt })),
  );

  console.log(
    "Seed lengkap: 4 anggaran, 10 item, 5 vendor, 6 pengguna, 6 PR, 2 RFQ, 5 PO, 3 GRN, 4 invoice, " +
      `${auditSeed.length} catatan audit.`,
  );
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
