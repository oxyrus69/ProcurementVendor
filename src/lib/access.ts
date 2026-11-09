import type { Role } from "./roles";

export const ACCESS_RULES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin/settings", roles: ["SUPER_ADMIN"] },
  { prefix: "/admin/audit", roles: ["SUPER_ADMIN", "AP_FINANCE"] },
  { prefix: "/admin", roles: ["SUPER_ADMIN", "PROCUREMENT_OFFICER"] },
  { prefix: "/api/export", roles: ["SUPER_ADMIN", "PROCUREMENT_OFFICER", "AP_FINANCE"] },
  { prefix: "/vendor-portal", roles: ["SUPER_ADMIN", "VENDOR_PARTNER"] },
  { prefix: "/goods-receipts", roles: ["SUPER_ADMIN", "PROCUREMENT_OFFICER", "WAREHOUSE_RECEIVER"] },
  { prefix: "/purchase-orders", roles: ["SUPER_ADMIN", "PROCUREMENT_OFFICER", "WAREHOUSE_RECEIVER", "AP_FINANCE"] },
  { prefix: "/requisitions", roles: ["SUPER_ADMIN", "PROCUREMENT_OFFICER", "DEPT_APPROVER"] },
  { prefix: "/invoices", roles: ["SUPER_ADMIN", "AP_FINANCE"] },
  { prefix: "/budgets", roles: ["SUPER_ADMIN", "PROCUREMENT_OFFICER", "DEPT_APPROVER", "AP_FINANCE"] },
  { prefix: "/vendors", roles: ["SUPER_ADMIN", "PROCUREMENT_OFFICER"] },
  { prefix: "/dss", roles: ["SUPER_ADMIN", "PROCUREMENT_OFFICER"] },
  { prefix: "/rfq", roles: ["SUPER_ADMIN", "PROCUREMENT_OFFICER"] },
  { prefix: "/po", roles: ["SUPER_ADMIN", "PROCUREMENT_OFFICER", "AP_FINANCE"] },
  { prefix: "/grn", roles: ["SUPER_ADMIN", "WAREHOUSE_RECEIVER"] },
];

export function allowedForPath(pathname: string, role: Role) {
  const rule = ACCESS_RULES.filter((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return rule ? rule.roles.includes(role) : true;
}
