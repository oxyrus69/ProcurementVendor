import { pgTable, uuid, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";

export const userRoleEnum = ["SUPER_ADMIN","PROCUREMENT_OFFICER","DEPT_APPROVER","WAREHOUSE_RECEIVER","AP_FINANCE","VENDOR_PARTNER"] as const;

export const costCentersBudgets = pgTable("cost_centers_budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  departmentName: text("department_name").notNull(),
  fiscalYear: integer("fiscal_year").notNull(),
  totalBudgetAllocated: numeric("total_budget_allocated", { precision: 14, scale: 2 }).notNull(),
  committedEncumbered: numeric("committed_encumbered", { precision: 14, scale: 2 }).notNull().default("0"),
  actualSpentInvoiced: numeric("actual_spent_invoiced", { precision: 14, scale: 2 }).notNull().default("0"),
  version: integer("version").notNull().default(1),
});

export const catalogItems = pgTable("catalog_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemCode: text("item_code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  uom: text("uom").notNull(),
  standardReferencePrice: numeric("standard_reference_price", { precision: 14, scale: 2 }).notNull(),
  lastPurchasePrice: numeric("last_purchase_price", { precision: 14, scale: 2 }),
});

export const vendors = pgTable("vendors", {
  id: uuid("id").defaultRandom().primaryKey(),
  vendorCode: text("vendor_code").notNull().unique(),
  companyName: text("company_name").notNull(),
  npwp: text("npwp"),
  contactEmail: text("contact_email"),
  phone: text("phone"),
  categorySpecialty: text("category_specialty"),
  tier: text("tier").notNull().default("APPROVED"),
  onTimeDeliveryRate: numeric("on_time_delivery_rate", { precision: 5, scale: 2 }),
  qualityAcceptanceRate: numeric("quality_acceptance_rate", { precision: 5, scale: 2 }),
  priceCompetitivenessScore: numeric("price_competitiveness_score", { precision: 5, scale: 2 }),
  compositeVendorScore: numeric("composite_vendor_score", { precision: 5, scale: 2 }),
  bankAccountInfo: text("bank_account_info"),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  vendorId: uuid("vendor_id").references(() => vendors.id),
  passwordHash: text("password_hash").notNull(),
});

export const purchaseRequisitions = pgTable("purchase_requisitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  prNumber: text("pr_number").notNull().unique(),
  requesterId: uuid("requester_id").references(() => profiles.id),
  costCenterId: uuid("cost_center_id").references(() => costCentersBudgets.id),
  title: text("title").notNull(),
  justification: text("justification"),
  neededByDate: timestamp("needed_by_date"),
  estimatedTotal: numeric("estimated_total", { precision: 14, scale: 2 }).notNull(),
  status: text("status").notNull().default("DRAFT"),
  approvedBy: uuid("approved_by").references(() => profiles.id),
  approvedAt: timestamp("approved_at"),
  version: integer("version").notNull().default(1),
});

export const purchaseRequisitionItems = pgTable("purchase_requisition_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  prId: uuid("pr_id").references(() => purchaseRequisitions.id),
  itemId: uuid("item_id").references(() => catalogItems.id),
  description: text("description").notNull(),
  qty: integer("qty").notNull(),
  unitPriceEstimate: numeric("unit_price_estimate", { precision: 14, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
});

export const rfqEvents = pgTable("rfq_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  rfqNumber: text("rfq_number").notNull().unique(),
  prId: uuid("pr_id").references(() => purchaseRequisitions.id),
  title: text("title").notNull(),
  deadlineAt: timestamp("deadline_at"),
  status: text("status").notNull().default("OPEN_FOR_BIDDING"),
  awardedVendorId: uuid("awarded_vendor_id").references(() => vendors.id),
  awardJustification: text("award_justification"),
});

export const rfqInvitedVendors = pgTable("rfq_invited_vendors", {
  id: uuid("id").defaultRandom().primaryKey(),
  rfqId: uuid("rfq_id").references(() => rfqEvents.id),
  vendorId: uuid("vendor_id").references(() => vendors.id),
});

export const rfqQuotations = pgTable("rfq_quotations", {
  id: uuid("id").defaultRandom().primaryKey(),
  rfqId: uuid("rfq_id").references(() => rfqEvents.id),
  vendorId: uuid("vendor_id").references(() => vendors.id),
  totalBidAmount: numeric("total_bid_amount", { precision: 14, scale: 2 }).notNull(),
  deliveryLeadTimeDays: integer("delivery_lead_time_days").notNull(),
  warrantyMonths: integer("warranty_months").notNull(),
  paymentTermsDays: integer("payment_terms_days").notNull(),
  technicalComplianceScore: numeric("technical_compliance_score", { precision: 5, scale: 2 }).notNull(),
  weightedRankScore: numeric("weighted_rank_score", { precision: 5, scale: 2 }),
});

export const rfqQuotationItems = pgTable("rfq_quotation_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  quotationId: uuid("quotation_id").references(() => rfqQuotations.id),
  itemId: uuid("item_id").references(() => catalogItems.id),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
  qty: integer("qty").notNull(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  prId: uuid("pr_id").references(() => purchaseRequisitions.id),
  rfqId: uuid("rfq_id").references(() => rfqEvents.id),
  vendorId: uuid("vendor_id").references(() => vendors.id),
  costCenterId: uuid("cost_center_id").references(() => costCentersBudgets.id),
  status: text("status").notNull().default("ISSUED_SENT"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull(),
  shippingCost: numeric("shipping_cost", { precision: 14, scale: 2 }).notNull(),
  grandTotal: numeric("grand_total", { precision: 14, scale: 2 }).notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  paymentTermsDays: integer("payment_terms_days"),
  verificationHash: text("verification_hash"),
  version: integer("version").notNull().default(1),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  poId: uuid("po_id").references(() => purchaseOrders.id),
  itemId: uuid("item_id").references(() => catalogItems.id),
  description: text("description").notNull(),
  orderedQty: integer("ordered_qty").notNull(),
  receivedAcceptedQty: integer("received_accepted_qty").notNull().default(0),
  invoicedQty: integer("invoiced_qty").notNull().default(0),
  unitPriceAgreed: numeric("unit_price_agreed", { precision: 14, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
});

export const goodsReceipts = pgTable("goods_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  grnNumber: text("grn_number").notNull().unique(),
  poId: uuid("po_id").references(() => purchaseOrders.id),
  receivedBy: uuid("received_by").references(() => profiles.id),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  deliveryNoteRef: text("delivery_note_ref"),
});

export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  grnId: uuid("grn_id").references(() => goodsReceipts.id),
  poItemId: uuid("po_item_id").references(() => purchaseOrderItems.id),
  qtyDelivered: integer("qty_delivered").notNull(),
  qtyAcceptedGood: integer("qty_accepted_good").notNull(),
  qtyRejectedDamaged: integer("qty_rejected_damaged").notNull().default(0),
  inspectionNotes: text("inspection_notes"),
});

export const vendorInvoices = pgTable("vendor_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  internalInvNumber: text("internal_inv_number").notNull().unique(),
  vendorInvoiceNo: text("vendor_invoice_no").notNull(),
  poId: uuid("po_id").references(() => purchaseOrders.id),
  vendorId: uuid("vendor_id").references(() => vendors.id),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  subtotalClaimed: numeric("subtotal_claimed", { precision: 14, scale: 2 }).notNull(),
  taxClaimed: numeric("tax_claimed", { precision: 14, scale: 2 }).notNull(),
  totalClaimed: numeric("total_claimed", { precision: 14, scale: 2 }).notNull(),
  matchStatus: text("match_status").notNull().default("UNVERIFIED"),
  poTotalReference: numeric("po_total_reference", { precision: 14, scale: 2 }),
  grnAcceptedValueReference: numeric("grn_accepted_value_reference", { precision: 14, scale: 2 }),
  priceVarianceAmount: numeric("price_variance_amount", { precision: 14, scale: 2 }),
  priceVariancePct: numeric("price_variance_pct", { precision: 5, scale: 2 }),
  qtyVarianceUnits: integer("qty_variance_units"),
  discrepancySummary: jsonb("discrepancy_summary"),
  overrideApprovedBy: uuid("override_approved_by").references(() => profiles.id),
  overrideReason: text("override_reason"),
  paidAt: timestamp("paid_at"),
});

export const vendorInvoiceItems = pgTable("vendor_invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => vendorInvoices.id),
  poItemId: uuid("po_item_id").references(() => purchaseOrderItems.id),
  description: text("description").notNull(),
  qtyInvoiced: integer("qty_invoiced").notNull(),
  unitPriceInvoiced: numeric("unit_price_invoiced", { precision: 14, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
});

export const threeWayMatchLogs = pgTable("three_way_match_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => vendorInvoices.id),
  result: text("result").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => profiles.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const documentSequences = pgTable("document_sequences", {
  id: uuid("id").defaultRandom().primaryKey(),
  prefix: text("prefix").notNull(),
  yearMonth: text("year_month").notNull(),
  lastSeq: integer("last_seq").notNull().default(0),
});

export const idempotencyKeys = pgTable("idempotency_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const decisionRules = pgTable("decision_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  threshold: numeric("threshold", { precision: 14, scale: 2 }),
});

export const decisionLogs = pgTable("decision_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  ruleId: uuid("rule_id").references(() => decisionRules.id),
  result: text("result").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
