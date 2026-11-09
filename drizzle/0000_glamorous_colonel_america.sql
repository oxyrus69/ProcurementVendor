CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"uom" text NOT NULL,
	"standard_reference_price" numeric(14, 2) NOT NULL,
	"last_purchase_price" numeric(14, 2),
	CONSTRAINT "catalog_items_item_code_unique" UNIQUE("item_code")
);
--> statement-breakpoint
CREATE TABLE "cost_centers_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"department_name" text NOT NULL,
	"fiscal_year" integer NOT NULL,
	"total_budget_allocated" numeric(14, 2) NOT NULL,
	"committed_encumbered" numeric(14, 2) DEFAULT '0' NOT NULL,
	"actual_spent_invoiced" numeric(14, 2) DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "cost_centers_budgets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "decision_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid,
	"result" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"threshold" numeric(14, 2)
);
--> statement-breakpoint
CREATE TABLE "document_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prefix" text NOT NULL,
	"year_month" text NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grn_id" uuid,
	"po_item_id" uuid,
	"qty_delivered" integer NOT NULL,
	"qty_accepted_good" integer NOT NULL,
	"qty_rejected_damaged" integer DEFAULT 0 NOT NULL,
	"inspection_notes" text
);
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grn_number" text NOT NULL,
	"po_id" uuid,
	"received_by" uuid,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"delivery_note_ref" text,
	CONSTRAINT "goods_receipts_grn_number_unique" UNIQUE("grn_number")
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"vendor_id" uuid,
	"password_hash" text NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid,
	"item_id" uuid,
	"description" text NOT NULL,
	"ordered_qty" integer NOT NULL,
	"received_accepted_qty" integer DEFAULT 0 NOT NULL,
	"invoiced_qty" integer DEFAULT 0 NOT NULL,
	"unit_price_agreed" numeric(14, 2) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_number" text NOT NULL,
	"pr_id" uuid,
	"rfq_id" uuid,
	"vendor_id" uuid,
	"cost_center_id" uuid,
	"status" text DEFAULT 'ISSUED_SENT' NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"tax_amount" numeric(14, 2) NOT NULL,
	"shipping_cost" numeric(14, 2) NOT NULL,
	"grand_total" numeric(14, 2) NOT NULL,
	"expected_delivery_date" timestamp,
	"payment_terms_days" integer,
	"verification_hash" text,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "purchase_requisition_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_id" uuid,
	"item_id" uuid,
	"description" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_price_estimate" numeric(14, 2) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_requisitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pr_number" text NOT NULL,
	"requester_id" uuid,
	"cost_center_id" uuid,
	"title" text NOT NULL,
	"justification" text,
	"needed_by_date" timestamp,
	"estimated_total" numeric(14, 2) NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "purchase_requisitions_pr_number_unique" UNIQUE("pr_number")
);
--> statement-breakpoint
CREATE TABLE "rfq_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_number" text NOT NULL,
	"pr_id" uuid,
	"title" text NOT NULL,
	"deadline_at" timestamp,
	"status" text DEFAULT 'OPEN_FOR_BIDDING' NOT NULL,
	"awarded_vendor_id" uuid,
	"award_justification" text,
	CONSTRAINT "rfq_events_rfq_number_unique" UNIQUE("rfq_number")
);
--> statement-breakpoint
CREATE TABLE "rfq_invited_vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid,
	"vendor_id" uuid
);
--> statement-breakpoint
CREATE TABLE "rfq_quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid,
	"item_id" uuid,
	"unit_price" numeric(14, 2) NOT NULL,
	"qty" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid,
	"vendor_id" uuid,
	"total_bid_amount" numeric(14, 2) NOT NULL,
	"delivery_lead_time_days" integer NOT NULL,
	"warranty_months" integer NOT NULL,
	"payment_terms_days" integer NOT NULL,
	"technical_compliance_score" numeric(5, 2) NOT NULL,
	"weighted_rank_score" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "three_way_match_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid,
	"result" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid,
	"po_item_id" uuid,
	"description" text NOT NULL,
	"qty_invoiced" integer NOT NULL,
	"unit_price_invoiced" numeric(14, 2) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_inv_number" text NOT NULL,
	"vendor_invoice_no" text NOT NULL,
	"po_id" uuid,
	"vendor_id" uuid,
	"invoice_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"subtotal_claimed" numeric(14, 2) NOT NULL,
	"tax_claimed" numeric(14, 2) NOT NULL,
	"total_claimed" numeric(14, 2) NOT NULL,
	"match_status" text DEFAULT 'UNVERIFIED' NOT NULL,
	"po_total_reference" numeric(14, 2),
	"grn_accepted_value_reference" numeric(14, 2),
	"price_variance_amount" numeric(14, 2),
	"price_variance_pct" numeric(5, 2),
	"qty_variance_units" integer,
	"discrepancy_summary" jsonb,
	"override_approved_by" uuid,
	"override_reason" text,
	"paid_at" timestamp,
	CONSTRAINT "vendor_invoices_internal_inv_number_unique" UNIQUE("internal_inv_number")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_code" text NOT NULL,
	"company_name" text NOT NULL,
	"npwp" text,
	"contact_email" text,
	"phone" text,
	"category_specialty" text,
	"tier" text DEFAULT 'APPROVED' NOT NULL,
	"on_time_delivery_rate" numeric(5, 2),
	"quality_acceptance_rate" numeric(5, 2),
	"price_competitiveness_score" numeric(5, 2),
	"composite_vendor_score" numeric(5, 2),
	"bank_account_info" text,
	CONSTRAINT "vendors_vendor_code_unique" UNIQUE("vendor_code")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_logs" ADD CONSTRAINT "decision_logs_rule_id_decision_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."decision_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_grn_id_goods_receipts_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."goods_receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_po_item_id_purchase_order_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_profiles_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_item_id_catalog_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_pr_id_purchase_requisitions_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_rfq_id_rfq_events_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfq_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_cost_center_id_cost_centers_budgets_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers_budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_pr_id_purchase_requisitions_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_item_id_catalog_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_requester_id_profiles_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_cost_center_id_cost_centers_budgets_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers_budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_events" ADD CONSTRAINT "rfq_events_pr_id_purchase_requisitions_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_events" ADD CONSTRAINT "rfq_events_awarded_vendor_id_vendors_id_fk" FOREIGN KEY ("awarded_vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_invited_vendors" ADD CONSTRAINT "rfq_invited_vendors_rfq_id_rfq_events_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfq_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_invited_vendors" ADD CONSTRAINT "rfq_invited_vendors_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quotation_items" ADD CONSTRAINT "rfq_quotation_items_quotation_id_rfq_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."rfq_quotations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quotation_items" ADD CONSTRAINT "rfq_quotation_items_item_id_catalog_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quotations" ADD CONSTRAINT "rfq_quotations_rfq_id_rfq_events_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfq_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_quotations" ADD CONSTRAINT "rfq_quotations_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "three_way_match_logs" ADD CONSTRAINT "three_way_match_logs_invoice_id_vendor_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."vendor_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoice_items" ADD CONSTRAINT "vendor_invoice_items_invoice_id_vendor_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."vendor_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoice_items" ADD CONSTRAINT "vendor_invoice_items_po_item_id_purchase_order_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_override_approved_by_profiles_id_fk" FOREIGN KEY ("override_approved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;