export function checkAndEncumberBudget(input: {
  totalBudgetAllocated: number;
  committedEncumbered: number;
  actualSpentInvoiced: number;
  prAmount: number;
}): { available: number; ok: boolean } {
  const available = input.totalBudgetAllocated - input.committedEncumbered - input.actualSpentInvoiced;
  return { available, ok: input.prAmount <= available };
}
