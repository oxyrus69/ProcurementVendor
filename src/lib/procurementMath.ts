export type MatchStatus =
  | "MATCHED_PASSED"
  | "WITHIN_TOLERANCE_PASSED"
  | "PRICE_VARIANCE_HOLD"
  | "QTY_VARIANCE_HOLD";

export interface ThreeWayLineInput {
  poUnitPrice: number;
  poQty: number;
  grnAcceptedQty: number;
  invUnitPrice: number;
  invQty: number;
}

export interface ThreeWayMatchResult {
  status: MatchStatus;
  priceVariancePct: number;
  qtyVarianceUnits: number;
  priceVarianceAmount: number;
}

export function evaluateThreeWayMatchPure(
  line: ThreeWayLineInput,
  priceTolerancePct = 2.0,
  maxToleranceIdr = 100000,
): ThreeWayMatchResult {
  const qtyVariance = line.invQty - line.grnAcceptedQty;
  if (qtyVariance > 0) {
    return {
      status: "QTY_VARIANCE_HOLD",
      priceVariancePct: 0,
      qtyVarianceUnits: qtyVariance,
      priceVarianceAmount: 0,
    };
  }
  const priceVariancePct =
    line.poUnitPrice === 0
      ? line.invUnitPrice === 0 ? 0 : Number.POSITIVE_INFINITY
      : ((line.invUnitPrice - line.poUnitPrice) / line.poUnitPrice) * 100;
  const priceVarianceAmount = (line.invUnitPrice - line.poUnitPrice) * line.invQty;

  if (priceVariancePct === 0) {
    return {
      status: "MATCHED_PASSED",
      priceVariancePct,
      qtyVarianceUnits: qtyVariance,
      priceVarianceAmount,
    };
  }
  if (
    priceVariancePct > 0 &&
    priceVariancePct <= priceTolerancePct &&
    Math.abs(priceVarianceAmount) <= maxToleranceIdr
  ) {
    return {
      status: "WITHIN_TOLERANCE_PASSED",
      priceVariancePct,
      qtyVarianceUnits: qtyVariance,
      priceVarianceAmount,
    };
  }
  if (priceVariancePct > priceTolerancePct) {
    return {
      status: "PRICE_VARIANCE_HOLD",
      priceVariancePct,
      qtyVarianceUnits: qtyVariance,
      priceVarianceAmount,
    };
  }
  return {
    status: priceVariancePct > 0 ? "PRICE_VARIANCE_HOLD" : "MATCHED_PASSED",
    priceVariancePct,
    qtyVarianceUnits: qtyVariance,
    priceVarianceAmount,
  };
}

export function computeRfqWeightedScorePure(
  quotes: { vendorId: string; totalBid: number; leadTime: number; technical: number; vendorScore: number }[],
): { vendorId: string; score: number }[] {
  const minBid = Math.min(...quotes.map((q) => q.totalBid));
  const minLead = Math.min(...quotes.map((q) => q.leadTime));
  return quotes.map((q) => {
    const scoreP = (minBid / q.totalBid) * 100;
    const scoreD = (minLead / q.leadTime) * 100;
    const total = 0.5 * scoreP + 0.2 * scoreD + 0.15 * q.technical + 0.15 * q.vendorScore;
    return { vendorId: q.vendorId, score: Number(total.toFixed(2)) };
  });
}
