"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Loader2, Trash2, X, Package, RefreshCw } from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const CATEGORIES = ["supplies", "equipment", "protective_gear", "other"];
const UNITS = ["units", "litres", "kg", "rolls", "pairs", "bottles", "boxes"];

interface Item { id: string; item_name: string; category: string; current_quantity: string; unit: string; reorder_level: string; last_updated: string; }
interface Tx { id: string; item_name: string; action: string; quantity: string; notes: string | null; created_at: string; }

function stockStatus(qty: number, reorder: number) {
  if (qty === 0) return { label: "Out of Stock", cls: "bg-red-100 text-red-700" };
  if (qty <= reorder) return { label: "Low", cls: "bg-yellow-100 text-yellow-700" };
  return { label: "In Stock", cls: "bg-green-100 text-green-700" };
}

export default function UltraTidyInventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState("");
  const [itemForm, setItemForm] = useState({ item_name: "", category: "supplies", current_quantity: "0", unit: "units", reorder_level: "0" });

  // Update stock form
  const [updateItem, setUpdateItem] = useState<Item | null>(null);
  const [savingTx, setSavingTx] = useState(false);
  const [txError, setTxError] = useState("");
  const [txForm, setTxForm] = useState({ action: "add", quantity: "", notes: "" });

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/ultratidy/inventory");
    setItems(await r.json());
    setLoading(false);
  }, []);

  const loadTxs = useCallback(async () => {
    setTxLoading(true);
    const r = await fetch("/api/ultratidy/inventory/transaction");
    setTxs(await r.json());
    setTxLoading(false);
  }, []);

  useEffect(() => { loadItems(); loadTxs(); }, [loadItems, loadTxs]);

  async function handleAddItem() {
    setItemError("");
    if (!itemForm.item_name.trim()) { setItemError("Item name is required."); return; }
    setSavingItem(true);
    const res = await fetch("/api/ultratidy/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(itemForm) });
    const data = await res.json();
    setSavingItem(false);
    if (!res.ok) { setItemError(data.error || "Failed to save."); return; }
    toast.success(`"${data.item_name}" added to inventory!`);
    setShowAddItem(false);
    setItemForm({ item_name: "", category: "supplies", current_quantity: "0", unit: "units", reorder_level: "0" });
    loadItems();
  }

  async function handleUpdateStock() {
    if (!updateItem) return;
    setTxError("");
    if (!txForm.quantity || parseFloat(txForm.quantity) <= 0) { setTxError("Enter a valid quantity."); return; }
    setSavingTx(true);
    const res = await fetch("/api/ultratidy/inventory/transaction", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: updateItem.id, item_name: updateItem.item_name, ...txForm, quantity: parseFloat(txForm.quantity) }),
    });
    const data = await res.json();
    setSavingTx(false);
    if (!res.ok) { setTxError(data.error || "Failed."); return; }
    toast.success("Stock updated!");
    setUpdateItem(null);
    setTxForm({ action: "add", quantity: "", notes: "" });
    loadItems(); loadTxs();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/ultratidy/inventory/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    toast.success("Item deleted.");
    loadItems();
  }

  const lowStockItems = items.filter((i) => Number(i.current_quantity) <= Number(i.reorder_level));

  return (
    <>
      <DashboardHeader title="UltraTidy — Inventory" />
      <div className="p-4 lg:p-8 space-y-6 max-w-5xl">
        <Link href="/dashboard/ultratidy" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to UltraTidy Overview
        </Link>

        <Tabs defaultValue="stock">
          <TabsList className="mb-4">
            <TabsTrigger value="stock">Current Stock</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="lowstock" className="relative">
              Low Stock
              {lowStockItems.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">{lowStockItems.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Current Stock Tab */}
          <TabsContent value="stock">
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Current Stock Levels</h3>
                <Button size="sm" onClick={() => setShowAddItem(true)}><Plus className="h-4 w-4 mr-1.5" />Add Item</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 border-b">
                    <tr>
                      {["Item", "Category", "Quantity", "Unit", "Reorder At", "Status", "Last Updated", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr><td colSpan={8} className="text-center py-12"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
                    ) : items.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No inventory items yet. Click Add Item to create your first.</td></tr>
                    ) : items.map((item) => {
                      const qty = Number(item.current_quantity);
                      const reorder = Number(item.reorder_level);
                      const { label, cls } = stockStatus(qty, reorder);
                      return (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium">{item.item_name}</td>
                          <td className="px-4 py-3 capitalize hidden sm:table-cell">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{item.category.replace(/_/g, " ")}</span>
                          </td>
                          <td className="px-4 py-3 font-bold tabular-nums">{qty}</td>
                          <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                          <td className="px-4 py-3 text-muted-foreground tabular-nums hidden sm:table-cell">{reorder}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                            {new Date(item.last_updated).toLocaleDateString("en-CA")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setUpdateItem(item); setTxForm({ action: "add", quantity: "", notes: "" }); }}>
                                <RefreshCw className="h-3 w-3" /> Update
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(item.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30">
                <h3 className="font-semibold text-sm">All Transactions ({txs.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 border-b">
                    <tr>
                      {["Date", "Item", "Action", "Qty", "Notes"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {txLoading ? (
                      <tr><td colSpan={5} className="text-center py-12"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
                    ) : txs.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">No transactions yet.</td></tr>
                    ) : txs.map((tx) => {
                      const isIncrease = tx.action === "add" || tx.action === "adjust";
                      const actionColors: Record<string, string> = { add: "bg-green-100 text-green-700", use: "bg-blue-100 text-blue-700", dispose: "bg-orange-100 text-orange-700", adjust: "bg-purple-100 text-purple-700" };
                      return (
                        <tr key={tx.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("en-CA", { day: "2-digit", month: "short", year: "numeric" })}</td>
                          <td className="px-4 py-3 font-medium">{tx.item_name}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${actionColors[tx.action] || "bg-gray-100 text-gray-700"}`}>{tx.action}</span></td>
                          <td className={`px-4 py-3 font-bold tabular-nums ${isIncrease ? "text-green-700" : "text-red-600"}`}>{isIncrease ? "+" : "−"}{Number(tx.quantity)}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{tx.notes || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Low Stock Tab */}
          <TabsContent value="lowstock">
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b bg-red-50">
                <h3 className="font-semibold text-sm text-red-700">Items Needing Restock ({lowStockItems.length})</h3>
              </div>
              {lowStockItems.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground text-sm">All items are sufficiently stocked.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/20 border-b">
                      <tr>
                        {["Item", "In Stock", "Reorder Level", "Unit", "Status"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lowStockItems.map((item) => {
                        const { label, cls } = stockStatus(Number(item.current_quantity), Number(item.reorder_level));
                        return (
                          <tr key={item.id} className="hover:bg-muted/20">
                            <td className="px-4 py-3 font-medium">{item.item_name}</td>
                            <td className="px-4 py-3 font-bold text-red-600 tabular-nums">{Number(item.current_quantity)}</td>
                            <td className="px-4 py-3 tabular-nums">{Number(item.reorder_level)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {itemError && <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{itemError}</div>}
            <div className="space-y-1.5">
              <Label>Item Name</Label>
              <Input placeholder="e.g. Multipurpose Spray" value={itemForm.item_name} onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={itemForm.unit} onValueChange={(v) => setItemForm({ ...itemForm, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Starting Quantity</Label>
                <Input type="number" min="0" step="1" placeholder="0" value={itemForm.current_quantity} onChange={(e) => setItemForm({ ...itemForm, current_quantity: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Reorder Level</Label>
                <Input type="number" min="0" step="1" placeholder="5" value={itemForm.reorder_level} onChange={(e) => setItemForm({ ...itemForm, reorder_level: e.target.value })} />
                <p className="text-xs text-muted-foreground">Alert when stock falls to this level</p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button onClick={handleAddItem} disabled={savingItem} className="flex-1">
                {savingItem ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Add Item"}
              </Button>
              <Button variant="ghost" onClick={() => setShowAddItem(false)} disabled={savingItem}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Stock Dialog */}
      <Dialog open={!!updateItem} onOpenChange={(o) => !o && setUpdateItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Stock — {updateItem?.item_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {txError && <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{txError}</div>}
            <p className="text-sm text-muted-foreground">Current: <span className="font-bold text-foreground">{Number(updateItem?.current_quantity)} {updateItem?.unit}</span></p>
            <div className="space-y-1.5">
              <Label>Action</Label>
              <Select value={txForm.action} onValueChange={(v) => setTxForm({ ...txForm, action: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add (received new stock)</SelectItem>
                  <SelectItem value="use">Use (used on a job)</SelectItem>
                  <SelectItem value="dispose">Dispose (damaged/expired)</SelectItem>
                  <SelectItem value="adjust">Adjust (correction)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="0" value={txForm.quantity} onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input placeholder="e.g. Used on 3 jobs today" value={txForm.notes} onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-1">
              <Button onClick={handleUpdateStock} disabled={savingTx} className="flex-1">
                {savingTx ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Update Stock"}
              </Button>
              <Button variant="ghost" onClick={() => setUpdateItem(null)} disabled={savingTx}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the item and all its transaction history. Cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
