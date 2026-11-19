"use client";
import {useManagerFetch} from "@/contexts/ManagerPeriodContext";


import { useEffect, useState } from "react";
import { farmProductLabel } from "@/lib/farm-products";
import { FarmCorrectionRequest } from "@/components/manager/FarmCorrectionRequest";
import { livestockGroupLabel } from "@/lib/farm-livestock-categories";
import type { FarmInventoryTransaction } from "@/types";

export function InventoryActivity({ action, refreshKey }: { action: "add" | "mortality"; refreshKey?: string | null }) {
 const managerFetch=useManagerFetch();
  const [movements, setMovements] = useState<FarmInventoryTransaction[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    managerFetch("/api/farm/inventory/transaction").then(async (response) => {
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (active) { setMovements(result.data ?? []); setError(false); }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [action, refreshKey,managerFetch]);
  const rows = movements.filter((movement) => movement.action === action);
  const reversed = new Set(movements.filter((movement) => movement.correction_role === "reversal").map((movement) => movement.correction_of));
  return <details className="bg-white rounded-2xl border p-4">
    <summary className="font-semibold text-sm cursor-pointer">View recent saved {action === "add" ? "stock" : "mortality"} activity</summary>
    {error ? <p className="text-sm py-3 text-red-700">Activity could not be loaded.</p> : rows.length === 0 ? <p className="text-sm py-3 text-gray-500">No activity recorded.</p> : rows.map((row) => {
      const corrected = row.mortality_reversed || reversed.has(row.id);
      const status = corrected ? "Corrected" : row.correction_role ? "Correction entry" : "";
      return <div key={row.id} className="border-t mt-3 pt-3 flex justify-between gap-3 items-center">
        <div><p className="text-sm font-semibold">{farmProductLabel(row.product)} · {row.quantity}</p><p className="text-xs text-gray-600">{row.stock_group?livestockGroupLabel(row.stock_group):"Unclassified / legacy stock"}</p><p className="text-xs text-gray-500">{row.date}{status ? ` · ${status}` : ""}</p></div>
        {row.correction_role !== "reversal" && !corrected && <FarmCorrectionRequest recordType="inventory_transaction" recordId={row.id} />}
      </div>;
    })}
  </details>;
}
