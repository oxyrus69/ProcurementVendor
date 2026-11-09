import { db } from "@/server/db";
import { vendors } from "@/server/db/schema";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const rows = await db.select().from(vendors);
  const csv = toCsv(["Kode", "Vendor", "Tier", "On Time", "Quality", "Score"], rows.map((r) => [r.vendorCode, r.companyName, r.tier, r.onTimeDeliveryRate, r.qualityAcceptanceRate, r.compositeVendorScore]));
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=vendors.csv" } });
}
