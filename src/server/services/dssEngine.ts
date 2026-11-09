export type DssFinding = { type: string; message: string };

export function detectSplitOrderAnomaly(prs: { dept: string; vendor: string; amount: number; date: Date }[], threshold: number): DssFinding[] {
  const findings: DssFinding[] = [];
  for (let i = 0; i < prs.length; i++) {
    for (let j = i + 1; j < prs.length; j++) {
      const a = prs[i], b = prs[j];
      const days = Math.abs((a.date.getTime() - b.date.getTime()) / (1000 * 60 * 60 * 24));
      if (a.dept === b.dept && a.vendor === b.vendor && days <= 7 && a.amount < threshold && b.amount < threshold && a.amount + b.amount >= threshold) {
        findings.push({ type: "SPLIT_ORDER_ANOMALY", message: `Split PR detected in ${a.dept}` });
      }
    }
  }
  return findings;
}

export function priceCreepAlert(items: { name: string; price: number; hps: number }[]): DssFinding[] {
  return items
    .filter((i) => i.hps > 0 && (i.price - i.hps) / i.hps > 0.1)
    .map((i) => ({ type: "PRICE_CREEP_ALERT", message: `${i.name} price creep` }));
}

export function vendorDowngradeRecommendation(vendors: { name: string; onTime: number; rejectRate: number }[]): DssFinding[] {
  return vendors
    .filter((v) => v.onTime < 80 || v.rejectRate > 5)
    .map((v) => ({ type: "VENDOR_DOWNGRADE_RECOMMENDATION", message: `${v.name} downgrade` }));
}
