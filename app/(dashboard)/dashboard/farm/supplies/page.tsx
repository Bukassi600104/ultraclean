"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, History, Settings2, TrendingDown, TrendingUp, Package } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupplyItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  current_quantity: number;
  restock_threshold: number | null;
  notes: string | null;
  updated_at: string;
}

interface HistoryEntry {
  id: string;
  action: "purchase" | "use" | "adjustment";
  quantity_change: number;
  notes: string | null;
  created_at: string;
  farm_supply_inventory: { item_name: string; unit: string; category: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  feed: "Feed",
  medication: "Medication",
  fuel: "Fuel",
  equipment: "Equipment",
  other: "Other",
};

function isLow(item: SupplyItem) {
  return item.restock_threshold !== null && item.current_quantity <= item.restock_threshold;
}
function isOut(item: SupplyItem) {
  return item.current_quantity <= 0;
}
function fmt(n: number) {
  return Math.round(n * 100) / 100;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FarmSuppliesPage() {
  const [items, setItems] = useState<SupplyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Threshold dialog
  const [editItem, setEditItem] = useState<SupplyItem | null>(null);
  const [thresholdVal, setThresholdVal] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // History filter
  const [filterItemId, setFilterItemId] = useState<string>("all");

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/farm/supplies");
    const d = await res.json();
    setItems(Array.isArray(d) ? d : []);
    setIsLoading(false);
  }, []);

  const loadHistory = useCallback(async (itemId?: string) => {
    setHistoryLoading(true);
    const url = itemId && itemId !== "all"
      ? `/api/farm/supplies/history?item_id=${itemId}&limit=100`
      : "/api/farm/supplies/history?limit=100";
    const res = await fetch(url);
    const d = await res.json();
    setHistory(d.data || []);
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    loadItems();
    loadHistory();
  }, [loadItems, loadHistory]);

  async function saveThreshold() {
    if (!editItem) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/farm/supplies/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restock_threshold: thresholdVal }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      toast.success("Threshold updated");
      setEditItem(null);
      loadItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsSaving(false);
    }
  }

  const lowCount = items.filter(isLow).length;
  const outCount = items.filter(isOut).length;

  return (
    <>
      <DashboardHeader title="Farm Supplies" />
      <div className="p-4 lg:p-8 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">Total Items</p>
              <p className="text-2xl font-bold">{isLoading ? "—" : items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{isLoading ? "—" : outCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{isLoading ? "—" : lowCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">Thresholds Set</p>
              <p className="text-2xl font-bold">
                {isLoading ? "—" : items.filter((i) => i.restock_threshold !== null).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              All Supply Items
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Click the settings icon to set a restock alert threshold for any item.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const low = isLow(item);
                    const out = isOut(item);
                    return (
                      <TableRow key={item.id} className={out ? "bg-red-50" : low ? "bg-yellow-50" : ""}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {CATEGORY_LABELS[item.category] || item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-bold ${out ? "text-red-600" : low ? "text-yellow-600" : ""}`}>
                          {fmt(item.current_quantity)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                        <TableCell>
                          {item.restock_threshold !== null ? (
                            <span className="text-sm">{item.restock_threshold} {item.unit}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {out ? (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <AlertTriangle className="h-3 w-3" /> Out of stock
                            </Badge>
                          ) : low ? (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 gap-1 text-xs">
                              <AlertTriangle className="h-3 w-3" /> Low stock
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(item.updated_at).toLocaleDateString("en-NG", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Set restock threshold"
                            onClick={() => {
                              setEditItem(item);
                              setThresholdVal(item.restock_threshold?.toString() ?? "");
                            }}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Transaction history */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Transaction History
            </CardTitle>
            <select
              value={filterItemId}
              onChange={(e) => {
                setFilterItemId(e.target.value);
                loadHistory(e.target.value);
              }}
              className="text-sm border rounded-lg px-2 py-1 bg-background"
            >
              <option value="all">All items</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.item_name}</option>
              ))}
            </select>
          </CardHeader>
          <CardContent className="p-0">
            {historyLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No transactions recorded yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(h.created_at).toLocaleDateString("en-NG", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                        {" "}
                        {new Date(h.created_at).toLocaleTimeString("en-NG", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {h.farm_supply_inventory?.item_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {h.action === "purchase" ? (
                            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                          ) : h.action === "use" ? (
                            <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                          ) : (
                            <Settings2 className="h-3.5 w-3.5 text-gray-500" />
                          )}
                          <span className="capitalize text-sm">{h.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="font-semibold text-sm"
                          style={{ color: h.quantity_change > 0 ? "#16a34a" : "#dc2626" }}
                        >
                          {h.quantity_change > 0 ? "+" : ""}{fmt(h.quantity_change)}{" "}
                          {h.farm_supply_inventory?.unit ?? ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {h.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Threshold dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Restock Threshold</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Set the minimum quantity for <strong>{editItem.item_name}</strong>.
                The manager will be warned when stock falls to or below this level.
              </p>
              <div className="space-y-2">
                <Label>Threshold ({editItem.unit})</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="e.g. 10"
                  value={thresholdVal}
                  onChange={(e) => setThresholdVal(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to remove the alert.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditItem(null)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={saveThreshold}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Threshold"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
