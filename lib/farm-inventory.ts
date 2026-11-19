import type { FarmInventoryTransaction } from "@/types";
import { reportingDate } from "./ceo-calculations";

export function inventoryTransactionDay(row: FarmInventoryTransaction) {
  return reportingDate(row.date) || reportingDate(row.created_at);
}

/** Scoped reads mark reversed deaths even when the reversal is outside the returned rows. */
export function activeMortality(transactions: FarmInventoryTransaction[]) {
  const reversed = new Set(transactions.filter(row => row.correction_role === "reversal").map(row => row.correction_of));
  return transactions.filter(row => row.action === "mortality" && !row.mortality_reversed && !reversed.has(row.id));
}

export function mortalityByProduct(transactions: FarmInventoryTransaction[], scope: {from?: string; to: string}) {
  const counts = new Map<string, number>();
  for (const row of activeMortality(transactions)) {
    const day = inventoryTransactionDay(row);
    if (!day || day > scope.to || (scope.from && day < scope.from)) continue;
    counts.set(row.product, (counts.get(row.product) ?? 0) + Number(row.quantity));
  }
  const products = Array.from(counts, ([product, quantity]) => ({product, quantity})).sort((a,b) => a.product.localeCompare(b.product));
  return {total: products.reduce((sum, row) => sum + row.quantity, 0), products};
}
