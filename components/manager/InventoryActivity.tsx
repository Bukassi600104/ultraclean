"use client";
import {useManagerFetch} from "@/contexts/ManagerPeriodContext";


import { useEffect, useRef, useState } from "react";
import { activeMortality, inventoryTransactionDay } from '@/lib/farm-inventory';
import { useFarmRecordAnchor } from '@/hooks/useFarmRecordAnchor';
import { farmProductLabel } from "@/lib/farm-products";
import { FarmCorrectionRequest } from "@/components/manager/FarmCorrectionRequest";
import { livestockGroupLabel } from "@/lib/farm-livestock-categories";
import type { FarmInventoryTransaction } from "@/types";

export function InventoryActivity({ action, refreshKey }: { action: "add" | "mortality"; refreshKey?: string | null }) {
 const managerFetch=useManagerFetch();
  const [movements, setMovements] = useState<FarmInventoryTransaction[]>([]);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [range, setRange] = useState<{from: string; to: string} | null>(null);
  const details = useRef<HTMLDetailsElement>(null);
  useFarmRecordAnchor(action === 'mortality' && loaded);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from'), to = params.get('to');
    const dates = action === 'mortality' && from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to ? {from, to} : null;
    setRange(dates);
    setLoaded(false);
    if (action === 'mortality' && window.location.hash === '#mortality-log' && details.current) details.current.open = true;
    const query = dates ? '?' + new URLSearchParams({...dates, all: '1'}) : '';
    managerFetch("/api/farm/inventory/transaction" + query).then(async (response) => {
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (active) { setMovements(result.data ?? []); setError(false); }
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [action, refreshKey,managerFetch]);
  const rows = range ? activeMortality(movements).filter(row => {
    const date = inventoryTransactionDay(row);
    return date >= range.from && date <= range.to;
  }) : movements.filter(movement => movement.action === action);
  const reversed = new Set(movements.filter((movement) => movement.correction_role === "reversal").map((movement) => movement.correction_of));
  return <details ref={details} id={action === 'mortality' ? 'mortality-log' : undefined} tabIndex={action === 'mortality' ? -1 : undefined} className="bg-white rounded-2xl border p-4">
    <summary className="font-semibold text-sm cursor-pointer">{range ? 'Mortality records for selected dates' : 'View recent saved ' + (action === 'add' ? 'stock' : 'mortality') + ' activity'}</summary>
    {range && <p className="mt-2 text-sm text-gray-600">{range.from === range.to ? range.to : range.from + ' to ' + range.to}</p>}
    {!loaded ? <p className="py-3 text-sm" role="status">Loading activity…</p> : error ? <p className="text-sm py-3 text-red-700">Activity could not be loaded.</p> : rows.length === 0 ? <p className="text-sm py-3 text-gray-500">No activity recorded.</p> : rows.map((row) => {
      const corrected = row.mortality_reversed || reversed.has(row.id);
      const status = corrected ? "Corrected" : row.correction_role ? "Correction entry" : "";
      return <div key={row.id} className="border-t mt-3 pt-3 flex justify-between gap-3 items-center">
        <div><p className="text-sm font-semibold">{farmProductLabel(row.product)} · {row.quantity}</p><p className="text-xs text-gray-600">{row.stock_group?livestockGroupLabel(row.stock_group):"Unclassified / legacy stock"}</p><p className="text-xs text-gray-500">{row.date}{status ? ` · ${status}` : ""}</p></div>
        {row.correction_role !== "reversal" && !corrected && <FarmCorrectionRequest recordType="inventory_transaction" recordId={row.id} />}
      </div>;
    })}
  </details>;
}
