import type { FarmInventoryTransaction } from "@/types";
/** Original movements remain visible in history; reversed mortality is not counted twice. */
export function activeMortality(transactions: FarmInventoryTransaction[]) {
  const reversed = new Set(transactions.filter(row => row.correction_role === "reversal").map(row => row.correction_of));
  return transactions.filter(row => row.action === "mortality" && !reversed.has(row.id));
}

export function mortalityByProduct(transactions: FarmInventoryTransaction[], scope: {from?: string; to: string}) {
  const counts = new Map<string, number>();
  for (const row of activeMortality(transactions)) {
    if (row.date > scope.to || (scope.from && row.date < scope.from)) continue;
    counts.set(row.product, (counts.get(row.product) ?? 0) + Number(row.quantity));
  }
  const products = Array.from(counts, ([product, quantity]) => ({product, quantity})).sort((a,b) => a.product.localeCompare(b.product));
  return {total: products.reduce((sum, row) => sum + row.quantity, 0), products};
}
