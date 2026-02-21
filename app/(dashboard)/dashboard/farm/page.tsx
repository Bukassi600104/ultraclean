"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingDown, TrendingUp, Package, Skull } from "lucide-react";
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

export default function FarmOverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [inventory, setInventory] = useState<FarmInventory[]>([]);
  const [totalDeaths, setTotalDeaths] = useState(0);
  const [salesByProduct, setSalesByProduct] = useState<
    { name: string; value: number }[]
  >([]);
  const [expensesByCategory, setExpensesByCategory] = useState<
    { name: string; value: number }[]
  >([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [salesRes, expensesRes, inventoryRes, mortRes] = await Promise.all([
          fetch("/api/farm/sales?limit=100"),
          fetch("/api/farm/expenses?limit=100"),
          fetch("/api/farm/inventory"),
          fetch("/api/farm/inventory/transaction?action=mortality"),
        ]);

        const salesData = await salesRes.json();
        const expensesData = await expensesRes.json();
        const inv = await inventoryRes.json();
        const mortData = await mortRes.json();

        const sales = salesData.data || [];
        const exps = expensesData.data || [];

        const totalRev = sales.reduce(
          (sum: number, s: { total_amount: number }) =>
            sum + (s.total_amount || 0),
          0
        );
        const totalExp = exps.reduce(
          (sum: number, e: { amount: number }) => sum + (e.amount || 0),
          0
        );

        // Group sales by product
        const productMap: Record<string, number> = {};
        sales.forEach(
          (s: { product: string; total_amount: number }) => {
            productMap[s.product] = (productMap[s.product] || 0) + (s.total_amount || 0);
          }
        );

        // Group expenses by category
        const catMap: Record<string, number> = {};
        exps.forEach(
          (e: { category: string; amount: number }) => {
            catMap[e.category] = (catMap[e.category] || 0) + e.amount;
          }
        );

        const mortTransactions: FarmInventoryTransaction[] = mortData.data || [];
        const deaths = mortTransactions.reduce((sum, m) => sum + m.quantity, 0);

        setRevenue(totalRev);
        setExpenses(totalExp);
        setInventory(Array.isArray(inv) ? inv : []);
        setTotalDeaths(deaths);
        setSalesByProduct(
          Object.entries(productMap).map(([name, value]) => ({ name, value }))
        );
        setExpensesByCategory(
          Object.entries(catMap).map(([name, value]) => ({ name, value }))
        );
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <>
      <DashboardHeader title="Farm Overview" />
      <div className="p-4 lg:p-8 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[110px]" />
            ))
          ) : (
            <>
              <SummaryCard
                title="Total Revenue"
                value={`₦${revenue.toLocaleString()}`}
                icon={TrendingUp}
              />
              <SummaryCard
                title="Total Expenses"
                value={`₦${expenses.toLocaleString()}`}
                icon={TrendingDown}
              />
              <SummaryCard
                title="Net Profit"
                value={`₦${(revenue - expenses).toLocaleString()}`}
                icon={DollarSign}
              />
              <SummaryCard
                title="Products Tracked"
                value={inventory.length}
                icon={Package}
              />
              <SummaryCard
                title="Total Mortality"
                value={totalDeaths}
                icon={Skull}
                iconClassName="text-red-500"
              />
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
        </div>

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
                <p className="text-sm text-gray-500 text-center py-12">
                  No sales data yet
                </p>
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
                        <Cell
                          key={i}
                          fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-12">
                  No expense data yet
                </p>
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
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium capitalize">
                        {item.product}
                      </TableCell>
                      <TableCell>{item.current_stock}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(item.last_updated).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No inventory data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
