import type { FarmInventoryTransaction } from "@/types";
/** Original movements remain visible in history; reversed mortality is not counted twice. */
export function activeMortality(transactions: FarmInventoryTransaction[]) {
  const reversed = new Set(transactions.filter(row => row.correction_role === "reversal").map(row => row.correction_of));
  return transactions.filter(row => row.action === "mortality" && !reversed.has(row.id));
}
