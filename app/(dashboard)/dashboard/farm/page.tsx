"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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
import { DollarSign, TrendingDown, TrendingUp, Package, Skull, SendHorizontal, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { FarmInventory, FarmInventoryTransaction } from "@/types";

const EXPENSE_COLORS = [
  "#0BBDB2",
  "#6366F1",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

interface Transfer {
  id: string;
  date: string;
  amount: number;
  notes?: string;
  created_at: string;
}

function fmt(n: number) {
  return `₦${Math.abs(n).toLocaleString()}`;
}

export default function FarmOverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [feedExpenses, setFeedExpenses] = useState(0);
  const [inventory, setInventory] = useState<FarmInventory[]>([]);
  const [totalDeaths, setTotalDeaths] = useState(0);
  const [salesByProduct, setSalesByProduct] = useState<{ name: string; value: number }[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<{ name: string; value: number }[]>([]);

  // Fund transfer state
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    notes: "",
  });
  const [isAddingTransfer, setIsAddingTransfer] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [salesRes, expensesRes, inventoryRes, mortRes, feedRes] = await Promise.all([
          fetch("/api/farm/sales?limit=100"),
          fetch("/api/farm/expenses?limit=100"),
          fetch("/api/farm/inventory"),
          fetch("/api/farm/inventory/transaction?action=mortality"),
          fetch("/api/farm/feed-purchases?limit=100"),
        ]);

        const salesData = await salesRes.json();
        const expensesData = await expensesRes.json();
        const inv = await inventoryRes.json();
        const mortData = await mortRes.json();
        const feedData = feedRes.ok ? await feedRes.json() : { data: [] };

        const sales = salesData.data || [];
        const exps = expensesData.data || [];
        const feeds: { cost: number }[] = feedData.data || [];

        const totalRev = sales.reduce(
          (sum: number, s: { total_amount: number }) => sum + (s.total_amount || 0),
          0
        );
        const totalExp = exps.reduce(
          (sum: number, e: { amount: number }) => sum + (e.amount || 0),
          0
        );
        const totalFeed = feeds.reduce((sum, f) => sum + (f.cost || 0), 0);

        const productMap: Record<string, number> = {};
        sales.forEach((s: { product: string; total_amount: number }) => {
          productMap[s.product] = (productMap[s.product] || 0) + (s.total_amount || 0);
        });

        const catMap: Record<string, number> = {};
        exps.forEach((e: { category: string; amount: number }) => {
          catMap[e.category] = (catMap[e.category] || 0) + e.amount;
        });

        const mortTransactions: FarmInventoryTransaction[] = mortData.data || [];
        const deaths = mortTransactions.reduce((sum, m) => sum + m.quantity, 0);

        setRevenue(totalRev);
        setExpenses(totalExp);
        setFeedExpenses(totalFeed);
        setInventory(Array.isArray(inv) ? inv : []);
        setTotalDeaths(deaths);
        setSalesByProduct(Object.entries(productMap).map(([name, value]) => ({ name, value })));
        setExpensesByCategory(Object.entries(catMap).map(([name, value]) => ({ name, value })));
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, []);

  async function fetchTransfers() {
    setTransfersLoading(true);
    try {
      const res = await fetch("/api/farm/fund-transfers?limit=50");
      const d = await res.json();
      setTransfers(d.data || []);
    } catch {
      // ignore
    } finally {
      setTransfersLoading(false);
    }
  }

  async function handleAddTransfer() {
    const amount = parseFloat(transferForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!transferForm.date) {
      toast.error("Please enter a date");
      return;
    }

    setIsAddingTransfer(true);
    try {
      const res = await fetch("/api/farm/fund-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: transferForm.date,
          amount,
          notes: transferForm.notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add transfer");
      }

      toast.success("Transfer recorded");
      setTransferForm({ date: new Date().toISOString().split("T")[0], amount: "", notes: "" });
      setShowAddTransfer(false);
      fetchTransfers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add transfer");
    } finally {
      setIsAddingTransfer(false);
    }
  }

  const totalTransferred = transfers.reduce((s, t) => s + t.amount, 0);
  const totalSpent = expenses + feedExpenses;
  const currentBalance = totalTransferred - totalSpent;

  // Compute running balances for transfer history
  const transfersWithRunning = transfers.map((t) => {
    // Running balance = sum of transfers up to this index (newest first, so reverse)
    const ordered = [...transfers].reverse(); // oldest first
    const idx = ordered.findIndex((x) => x.id === t.id);
    const running = ordered
      .slice(0, idx + 1)
      .reduce((s, x) => s + x.amount, 0) - totalSpent;
    return { ...t, running };
  });

  return (
    <>
      <DashboardHeader title="Farm Overview" />
      <div className="p-4 lg:p-8 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />)
          ) : (
            <>
              <SummaryCard title="Total Revenue" value={`₦${revenue.toLocaleString()}`} icon={TrendingUp} />
              <SummaryCard title="Total Expenses" value={`₦${expenses.toLocaleString()}`} icon={TrendingDown} />
              <SummaryCard title="Net Profit" value={`₦${(revenue - expenses).toLocaleString()}`} icon={DollarSign} />
              <SummaryCard title="Products Tracked" value={inventory.length} icon={Package} />
              <SummaryCard title="Total Mortality" value={totalDeaths} icon={Skull} iconClassName="text-red-500" />
            </>
          )}
        </div>

        {/* Quick nav */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/farm/sales">View Sales</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/farm/expenses">View Expenses</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/farm/inventory">View Inventory</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard/farm/supplies">View Supplies</Link>
          </Button>
        </div>

        {/* Farm Funds Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Farm Funds</CardTitle>
            <Button
              size="sm"
              onClick={() => setShowAddTransfer(true)}
              className="gap-2"
            >
              <SendHorizontal className="h-4 w-4" />
              Add Transfer
            </Button>
          </CardHeader>
          <CardContent>
            {/* Balance summary */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-xl p-4 bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: currentBalance >= 0 ? "#16a34a" : "#dc2626" }}
                >
                  {currentBalance < 0 ? "-" : ""}
                  {fmt(currentBalance)}
                </p>
              </div>
              <div className="rounded-xl p-4 bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Sent</p>
                <p className="text-2xl font-bold text-foreground">{fmt(totalTransferred)}</p>
              </div>
              <div className="rounded-xl p-4 bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-red-600">{fmt(totalSpent)}</p>
              </div>
            </div>

            {/* Transfer history */}
            {transfersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : transfersWithRunning.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Running Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfersWithRunning.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">
                        {new Date(t.date + "T00:00:00").toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="font-semibold text-green-700">
                        {fmt(t.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.notes || "—"}
                      </TableCell>
                      <TableCell
                        className="font-medium"
                        style={{ color: t.running >= 0 ? "#16a34a" : "#dc2626" }}
                      >
                        {t.running < 0 ? "-" : ""}
                        {fmt(t.running)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No transfers recorded yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by Product</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px]" />
              ) : salesByProduct.length ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={salesByProduct}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                    <Bar dataKey="value" fill="#0BBDB2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-12">No sales data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px]" />
              ) : expensesByCategory.length ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name }) => name}
                    >
                      {expensesByCategory.map((_, i) => (
                        <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-12">No expense data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Inventory</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : inventory.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium capitalize">{item.product}</TableCell>
                      <TableCell>{item.current_stock}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(item.last_updated).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No inventory data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Transfer Dialog */}
      <Dialog open={showAddTransfer} onOpenChange={setShowAddTransfer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fund Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="t-date">Date</Label>
              <Input
                id="t-date"
                type="date"
                value={transferForm.date}
                onChange={(e) => setTransferForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-amount">Amount (₦)</Label>
              <Input
                id="t-amount"
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={transferForm.amount}
                onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-notes">Notes (optional)</Label>
              <Textarea
                id="t-notes"
                rows={2}
                placeholder="e.g. Monthly operating funds"
                value={transferForm.notes}
                onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddTransfer(false)}
                disabled={isAddingTransfer}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleAddTransfer}
                disabled={isAddingTransfer}
              >
                {isAddingTransfer && <Loader2 className="h-4 w-4 animate-spin" />}
                {isAddingTransfer ? "Saving..." : "Save Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
