"use client";
import { livestockGroupLabel } from "@/lib/farm-livestock-categories";

import Link from 'next/link';
import { LivestockInventoryBreakdown } from "@/components/manager/LivestockInventoryBreakdown";
import { useEffect, useState } from "react";
import { DashboardHeader, DashboardReadError } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Skull, TrendingDown, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import type { FarmInventory, FarmInventoryTransaction } from "@/types";
import { activeMortality } from "@/lib/farm-inventory";
import { FarmAdminCorrection } from "@/components/dashboard/farm/FarmActivityPanel";

interface MortalitySummary {
  product: string;
  total_deaths: number;
  current_stock: number | null;
}

const ACTION_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  add:       { label: "Add",       className: "bg-green-100 text-green-700" },
  remove:    { label: "Remove",    className: "bg-orange-100 text-orange-700" },
  sale:      { label: "Sale",      className: "bg-blue-100 text-blue-700" },
  mortality: { label: "Mortality", className: "bg-red-100 text-red-700" },
};

export default function FarmInventoryPage() {
  const [inventory, setInventory] = useState<FarmInventory[]>([]);
  const [mortalityLog, setMortalityLog] = useState<FarmInventoryTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<FarmInventoryTransaction[]>([]);
  const [loadError,setLoadError]=useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [refresh, setRefresh] = useState(0);
  const [selectedTab, setSelectedTab] = useState("stock");
  const [periodId, setPeriodId] = useState<string|null>(null);
  useEffect(() => {
    async function load() {
      setIsLoading(true);setLoadError("");
      try {
        const scope = new URLSearchParams(window.location.search);
        const period = scope.get("period_id") || "", from = scope.get("from"), to = scope.get("to");
        setPeriodId(period);
        if (scope.get("tab") === "mortality") setSelectedTab("mortality");
        const filter = period ? "?period_id=" + encodeURIComponent(period) : "";
        const [invRes, allRes] = await Promise.all([
          fetch("/api/farm/inventory" + filter),
          fetch("/api/farm/inventory/transaction" + (filter ? filter + "&all=1" : "")),
        ]);
        const invData = await invRes.json();
        const allData = await allRes.json();
        if (!invRes.ok || !allRes.ok) throw new Error("Inventory unavailable");
        setInventory(Array.isArray(invData) ? invData : []);
        const throughEnd = (allData.data || []).filter((row:FarmInventoryTransaction) => !to || row.date <= to);
        setMortalityLog(activeMortality(throughEnd).filter(row => !from || row.date >= from));
        setAllTransactions(throughEnd.filter((row:FarmInventoryTransaction) => !from || row.date >= from));
      } catch {
        setLoadError("Farm inventory could not be loaded. Please retry.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [refresh]);

  // Report recorded deaths; current stock is not a reliable historical cohort size.
  const mortalityProducts = new Set([...inventory.map(row=>row.product),...mortalityLog.map(row=>row.product)]);
  const mortalitySummary: MortalitySummary[] = Array.from(mortalityProducts, product => {
    const deaths = mortalityLog
      .filter((m) => m.product === product)
      .reduce((sum, m) => sum + m.quantity, 0);
    return {
      product,
      total_deaths: deaths,
      current_stock: inventory.find(row=>row.product===product)?.current_stock??null,
    };
  });

  function formatDate(tx: FarmInventoryTransaction) {
    const raw = tx.date || tx.created_at;
    return format(new Date(raw), "dd MMM yyyy");
  }

  if(loadError)return <DashboardReadError title="Farm Inventory" message={loadError} onRetry={()=>setRefresh(v=>v+1)}/>;
  return (
    <>
      <DashboardHeader title="Farm Inventory" />
      <div className="mx-auto w-full p-4 lg:p-8 space-y-6 max-w-7xl">
      <Link className="inline-flex min-h-11 items-center font-semibold text-emerald-900 underline" href={'/dashboard/farm/stores?view=animals'+(periodId?'&period_id='+encodeURIComponent(periodId):'')}>Review physical animal counts</Link>
      {periodId!==null&&<LivestockInventoryBreakdown canManage={!periodId} refreshKey={refresh} periodId={periodId}/>}
        

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="stock">Current Stock</TabsTrigger>
            <TabsTrigger value="transactions">All Transactions</TabsTrigger>
            <TabsTrigger value="mortality">Mortality</TabsTrigger>
          </TabsList>

          {/* ── Stock Tab ── */}
          <TabsContent value="stock" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Stock Levels</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : inventory.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Correction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium capitalize">
                            {item.product}
                          </TableCell>
                          <TableCell>{item.current_stock}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                item.current_stock > 10
                                  ? "bg-green-100 text-green-700"
                                  : item.current_stock > 0
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }
                            >
                              {item.current_stock > 10
                                ? "In Stock"
                                : item.current_stock > 0
                                  ? "Low"
                                  : "Out of Stock"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(item.last_updated).toLocaleDateString()}
                          </TableCell>
                          <TableCell><FarmAdminCorrection recordType="inventory" record={item} onSaved={() => setRefresh(value => value + 1)} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-12">
                    No inventory data
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── All Transactions Tab ── */}
          <TabsContent value="transactions" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <ClipboardList className="h-4 w-4 text-gray-500" />
                <CardTitle className="text-base">
                  All Inventory Entries
                  {!isLoading && (
                    <span className="ml-2 text-xs font-normal text-gray-600">
                      ({allTransactions.length} records)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : allTransactions.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Reason / Cause
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Notes
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allTransactions.map((tx) => {
                        const badge =
                          ACTION_BADGE[tx.action] ?? {
                            label: tx.action,
                            className: "bg-gray-100 text-gray-700",
                          };
                        const isDecrease = ["remove", "sale", "mortality"].includes(
                          tx.action
                        );
                        return (
                          <TableRow key={tx.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {formatDate(tx)}
                            </TableCell>
                            <TableCell className="capitalize">
                              {tx.product}{tx.stock_group&&<span className="block text-xs normal-case text-gray-600">{livestockGroupLabel(tx.stock_group)}</span>}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={badge.className}
                              >
                                {badge.label}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={`font-semibold ${
                                isDecrease ? "text-red-600" : "text-green-700"
                              }`}
                            >
                              {isDecrease ? "-" : "+"}
                              {tx.quantity}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                              {tx.reason || "—"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-gray-600">
                              {tx.notes || "—"}
                            </TableCell>
                            <TableCell>{!tx.sale_id && tx.correction_role !== "reversal" && !allTransactions.some(row => row.correction_of === tx.id && row.correction_role === "reversal") && <FarmAdminCorrection recordType="inventory_transaction" record={tx} onSaved={() => setRefresh(value => value + 1)} />}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-12">
                    No transactions recorded yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Mortality Tab ── */}
          <TabsContent value="mortality" className="mt-4 space-y-5">
            {/* Mortality Rate Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28" />
                  ))
                : mortalitySummary.map((s) => (
                    <Card key={s.product}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-500 capitalize mb-1">
                              {s.product}
                            </p>
                            <p className="text-3xl font-bold text-red-600">
                              {s.total_deaths}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              recorded deaths
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                              <Skull className="h-5 w-5 text-red-400" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t flex justify-between text-xs text-gray-500">
                          <span>
                            <span className="font-semibold text-red-600">
                              {s.total_deaths}
                            </span>{" "}
                            died
                          </span>
                          <span>
                            <span className="font-semibold text-gray-700">
                              {s.current_stock ?? 'Count unavailable'}
                            </span>{" "}
                            {s.current_stock!==null?'remaining':''}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
            </div>

            {/* Mortality Log Table */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <CardTitle className="text-base">Mortality Log</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : mortalityLog.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date of Mortality</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Deaths</TableHead>
                        <TableHead>Cause</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Notes
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mortalityLog.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">
                            {formatDate(m)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {m.product}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-red-600">
                              {m.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {m.reason || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-gray-600">
                            {m.notes || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-12">
                    No mortality records yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
