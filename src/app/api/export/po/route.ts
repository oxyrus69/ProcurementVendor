import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const rows = await db.select({ po: s.purchaseOrders, vendor: s.vendors.companyName }).from(s.purchaseOrders).innerJoin(s.vendors, eq(s.purchaseOrders.vendorId, s.vendors.id));
  const csv = toCsv(["PO", "Vendor", "Status", "Grand Total"], rows.map((r) => [r.po.poNumber, r.vendor, r.po.status, r.po.grandTotal]));
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=purchase-orders.csv" } });
}
