"use client";
import { FarmActivityPanel, FarmAdminCorrection } from "@/components/dashboard/farm/FarmActivityPanel";
import { farmDateToday } from "@/lib/farm-products";
import { activeMortality } from "@/lib/farm-inventory";

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
  revision?: number;
  id: string;
  date: string;
  amount: number;
  notes?: string;
  created_at: string;
}

function fmt(n: number) {
  return `₦${n.toLocaleString()}`;
}

export default function FarmOverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [financialError, setFinancialError] = useState(false);
  const [ownerBalance, setOwnerBalance] = useState(0);
  const [ownerSpent, setOwnerSpent] = useState(0);
  const [fundTotal, setFundTotal] = useState(0);
  const [mortalityByProduct, setMortalityByProduct] = useState<Record<string, number>>({});
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
    date: farmDateToday(),
    amount: "",
    notes: "",
  });
  const [isAddingTransfer, setIsAddingTransfer] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const today = farmDateToday();
        const [financeRes, inventoryRes, mortRes] = await Promise.all([
          fetch(`/api/farm/balance?date=${today}`), fetch("/api/farm/inventory"),
          fetch("/api/farm/inventory/transaction"),
        ]);
        if (!financeRes.ok || !inventoryRes.ok || !mortRes.ok) throw new Error("Farm figures unavailable");
        const [finance, inv, mortData] = await Promise.all([financeRes.json(), inventoryRes.json(), mortRes.json()]);
        setRevenue(finance.revenue); setExpenses(finance.general_expenses); setFeedExpenses(finance.feed_expenses);
        setOwnerBalance(finance.closing_balance); setFundTotal(finance.total_transferred); setOwnerSpent(finance.total_spent_before + finance.total_spent_today);
        setInventory(Array.isArray(inv) ? inv : []);
        const deaths: Record<string, number> = {};
        activeMortality(mortData.data || []).forEach((record: FarmInventoryTransaction) => { deaths[record.product] = (deaths[record.product] || 0) + Number(record.quantity); });
        setMortalityByProduct(deaths); setTotalDeaths(Object.values(deaths).reduce((n, value) => n + value, 0));
        setSalesByProduct(finance.sales_by_product); setExpensesByCategory(finance.expenses_by_category);
      } catch {
        setFinancialError(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, []);

  async function refreshFinance() {
    try {
      const responses = await Promise.all([
        fetch(`/api/farm/balance?date=${farmDateToday()}`),
        fetch("/api/farm/inventory"), fetch("/api/farm/inventory/transaction"),
      ]);
      if (responses.some(response => !response.ok)) throw new Error("Farm figures unavailable");
      const [finance, inv, movements] = await Promise.all(responses.map(response => response.json()));
      setOwnerBalance(finance.closing_balance); setFundTotal(finance.total_transferred);
      setOwnerSpent(finance.total_spent_before + finance.total_spent_today);
      setRevenue(finance.revenue); setExpenses(finance.general_expenses); setFeedExpenses(finance.feed_expenses);
      setSalesByProduct(finance.sales_by_product); setExpensesByCategory(finance.expenses_by_category);
      setInventory(Array.isArray(inv) ? inv : []);
      const deaths: Record<string, number> = {};
      activeMortality(movements.data || []).forEach((record: FarmInventoryTransaction) => { deaths[record.product] = (deaths[record.product] || 0) + Number(record.quantity); });
      setMortalityByProduct(deaths); setTotalDeaths(Object.values(deaths).reduce((sum, value) => sum + value, 0));
      setFinancialError(false);
    } catch { setFinancialError(true); }
  }
  async function fetchTransfers() {
    setTransfersLoading(true);
    try {
      const res = await fetch("/api/farm/fund-transfers?limit=50");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Unable to load transfers");
      setTransfers(d.data || []);
    } catch {
      toast.error("Unable to load transfers");
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
      setTransferForm({ date: farmDateToday(), amount: "", notes: "" });
      setShowAddTransfer(false);
      fetchTransfers();
      refreshFinance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add transfer");
    } finally {
      setIsAddingTransfer(false);
    }
  }

  const totalTransferred = fundTotal;
  const totalSpent = expenses + feedExpenses;
  const currentBalance = ownerBalance;

  return (
    <>
      <DashboardHeader title="Farm Overview" />
      <div className="p-4 lg:p-8 space-y-6">
        {financialError && <p role="alert" className="text-red-600">Farm figures could not be loaded. Refresh before relying on these totals.</p>}
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />)
          ) : (
            <>
              <SummaryCard title="Total Revenue" value={financialError ? "Unavailable" : `₦${revenue.toLocaleString()}`} icon={TrendingUp} />
              <SummaryCard title="Total Expenses" value={financialError ? "Unavailable" : `₦${totalSpent.toLocaleString()}`} icon={TrendingDown} />
              <SummaryCard title="Net Profit" value={financialError ? "Unavailable" : `₦${(revenue - totalSpent).toLocaleString()}`} icon={DollarSign} />
              <SummaryCard title="Inventory Types" value={inventory.length} icon={Package} />
              <SummaryCard title="Total Mortality" value={totalDeaths} icon={Skull} iconClassName="text-red-500" />
            </>
          )}
        </div>

        {Object.keys(mortalityByProduct).length > 0 && <p className="text-sm text-gray-600">Mortality by product: {Object.entries(mortalityByProduct).map(([name, count]) => `${name}: ${count}`).join(" · ")}</p>}
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
                <p className="text-xs text-muted-foreground mb-1">Owner Funds Available</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: currentBalance >= 0 ? "#16a34a" : "#dc2626" }}
                >

                  {financialError ? "Unavailable" : fmt(currentBalance)}
                </p>
              </div>
              <div className="rounded-xl p-4 bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Sent</p>
                <p className="text-2xl font-bold text-foreground">{financialError ? "Unavailable" : fmt(totalTransferred)}</p>
              </div>
              <div className="rounded-xl p-4 bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Owner Funds Spent</p>
                <p className="text-2xl font-bold text-red-600">{financialError ? "Unavailable" : fmt(ownerSpent)}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-2">Recent transfers. Balances include all active records.</p>
            {/* Transfer history */}
            {transfersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : transfers.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => (
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
                      <TableCell><FarmAdminCorrection recordType="fund" record={t} onSaved={() => { fetchTransfers(); refreshFinance(); }} /></TableCell>
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

      <FarmActivityPanel onSaved={() => { void refreshFinance(); void fetchTransfers(); }} />
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
