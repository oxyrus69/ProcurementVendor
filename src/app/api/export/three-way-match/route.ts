import { db } from "@/server/db";
import { vendorInvoices } from "@/server/db/schema";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const rows = await db.select().from(vendorInvoices);
  const csv = toCsv(["Invoice", "Vendor Invoice", "Status", "Total", "Variance Pct", "Variance Qty"], rows.map((r) => [r.internalInvNumber, r.vendorInvoiceNo, r.matchStatus, r.totalClaimed, r.priceVariancePct, r.qtyVarianceUnits]));
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=three-way-match.csv" } });
}
