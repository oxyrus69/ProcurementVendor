import assert from "node:assert/strict";
import { evaluateThreeWayMatchPure, computeRfqWeightedScorePure } from "../src/lib/procurementMath.ts";
import { checkAndEncumberBudget } from "../src/server/services/budgetEngine.ts";
import { detectSplitOrderAnomaly, priceCreepAlert, vendorDowngradeRecommendation } from "../src/server/services/dssEngine.ts";
import { ACCESS_RULES, allowedForPath } from "../src/lib/access.ts";
import { ALL_ROLES, ROLE_HOME } from "../src/lib/roles.ts";
import { toCsv } from "../src/lib/csv.ts";

const base = { poUnitPrice: 100, poQty: 10, grnAcceptedQty: 10, invUnitPrice: 100, invQty: 10 };
assert.equal(evaluateThreeWayMatchPure(base).status, "MATCHED_PASSED");
assert.equal(evaluateThreeWayMatchPure({ ...base, invUnitPrice: 101 }).status, "WITHIN_TOLERANCE_PASSED");
assert.equal(evaluateThreeWayMatchPure({ ...base, grnAcceptedQty: 8 }).status, "QTY_VARIANCE_HOLD");
assert.equal(evaluateThreeWayMatchPure({ ...base, invUnitPrice: 108 }).status, "PRICE_VARIANCE_HOLD");
assert.equal(evaluateThreeWayMatchPure({ ...base, invUnitPrice: 101, invQty: 100001, grnAcceptedQty: 100001 }).status, "PRICE_VARIANCE_HOLD", "Toleransi rupiah harus tetap membatasi varian harga");
assert.equal(evaluateThreeWayMatchPure({ ...base, poUnitPrice: 0 }).status, "PRICE_VARIANCE_HOLD", "Harga PO nol tidak boleh lolos otomatis");
assert.equal(evaluateThreeWayMatchPure({ ...base, invUnitPrice: 95 }).status, "MATCHED_PASSED");

const scores = computeRfqWeightedScorePure([
  { vendorId: "A", totalBid: 100, leadTime: 10, technical: 80, vendorScore: 80 },
  { vendorId: "B", totalBid: 120, leadTime: 10, technical: 80, vendorScore: 80 },
]);
assert.ok(scores[0].score > scores[1].score, "Skor RFQ harus memberi bobot harga");
assert.equal(checkAndEncumberBudget({ totalBudgetAllocated: 100, committedEncumbered: 20, actualSpentInvoiced: 10, prAmount: 70 }).ok, true);
assert.equal(checkAndEncumberBudget({ totalBudgetAllocated: 100, committedEncumbered: 20, actualSpentInvoiced: 10, prAmount: 71 }).ok, false);

const split = detectSplitOrderAnomaly([
  { dept: "IT", vendor: "A", amount: 48_000_000, date: new Date("2026-01-01") },
  { dept: "IT", vendor: "A", amount: 48_000_000, date: new Date("2026-01-05") },
], 50_000_000);
assert.equal(split[0].type, "SPLIT_ORDER_ANOMALY");
assert.equal(priceCreepAlert([{ name: "Laptop", price: 111, hps: 100 }]).length, 1);
assert.equal(vendorDowngradeRecommendation([{ name: "Vendor A", onTime: 79, rejectRate: 0 }]).length, 1);

assert.equal(ALL_ROLES.length, 6);
assert.equal(new Set(Object.values(ROLE_HOME)).size, 5);
assert.equal(allowedForPath("/admin/settings", "PROCUREMENT_OFFICER"), false, "Longest-prefix /admin/settings harus mengalahkan /admin");
assert.equal(allowedForPath("/admin", "PROCUREMENT_OFFICER"), true);
assert.equal(allowedForPath("/rfq/abc", "WAREHOUSE_RECEIVER"), false);
assert.equal(allowedForPath("/goods-receipts", "WAREHOUSE_RECEIVER"), true);
assert.ok(ACCESS_RULES.every((rule, i, all) => i === 0 || rule.prefix !== all[i - 1].prefix));

const csv = toCsv(["a", "b"], [["x;y", "=SUM(1;2)"]]);
assert.equal(csv.charCodeAt(0), 0xfeff);
assert.ok(csv.includes('"x;y"'));
assert.ok(csv.includes("'=SUM(1;2)"));
assert.ok(csv.includes("\r\n"));

console.log("E2E verify passed: 3-way match, RFQ, budget, DSS, RBAC, CSV");
