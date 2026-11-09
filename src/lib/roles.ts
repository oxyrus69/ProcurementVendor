export type Role = "SUPER_ADMIN" | "PROCUREMENT_OFFICER" | "DEPT_APPROVER" | "WAREHOUSE_RECEIVER" | "AP_FINANCE" | "VENDOR_PARTNER";

export const ALL_ROLES: Role[] = ["SUPER_ADMIN", "PROCUREMENT_OFFICER", "DEPT_APPROVER", "WAREHOUSE_RECEIVER", "AP_FINANCE", "VENDOR_PARTNER"];

export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  PROCUREMENT_OFFICER: "/admin",
  DEPT_APPROVER: "/requisitions",
  WAREHOUSE_RECEIVER: "/goods-receipts",
  AP_FINANCE: "/invoices",
  VENDOR_PARTNER: "/vendor-portal",
};
