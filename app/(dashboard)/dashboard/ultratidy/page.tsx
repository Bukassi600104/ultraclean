"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, DollarSign, Package, ArrowRight, Loader2,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const CAD = (v: number) =>
  v.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

const PIE_COLORS = ["#0BBDB2", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981"];

export default function UltraTidyOverviewPage() {
  const [inflow, setInflow] = useState<{ amount: number; service: string }[]>([]);
  const [expenses, setExpenses] = useState<{ amount: number; category: string }[]>([]);
  const [inventory, setInventory] = useState<{ item_name: string; current_quantity: number; reorder_level: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/ultratidy/inflow?limit=1000").then((r) => r.json()),
      fetch("/api/ultratidy/expenses?limit=1000").then((r) => r.json()),
      fetch("/api/ultratidy/inventory").then((r) => r.json()),
    ])
      .then(([inf, exp, inv]) => {
        setInflow(inf.data || []);
        setExpenses(exp.data || []);
        setInventory(Array.isArray(inv) ? inv : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalInflow = inflow.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0);
  const netProfit = totalInflow - totalExpenses;
  const lowStock = inventory.filter(
    (i) => Number(i.current_quantity) <= Number(i.reorder_level)
  ).length;

  // Group inflow by service
  const inflowByService = Object.entries(
    inflow.reduce<Record<string, number>>((acc, r) => {
      const k = r.service.replace(/_/g, " ");
      acc[k] = (acc[k] || 0) + Number(r.amount);
      return acc;
    }, {})
  ).map(([service, total]) => ({ service, total }));

  // Group expenses by category
  const expensesByCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, r) => {
      const k = r.category.charAt(0).toUpperCase() + r.category.slice(1);
      acc[k] = (acc[k] || 0) + Number(r.amount);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <>
      <DashboardHeader title="UltraTidy Finances" />
      <div className="p-4 lg:p-8 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Inflow", value: CAD(totalInflow), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
            { label: "Total Expenses", value: CAD(totalExpenses), icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
            { label: "Net Profit", value: CAD(netProfit), icon: DollarSign, color: netProfit >= 0 ? "text-primary" : "text-red-500", bg: netProfit >= 0 ? "bg-primary/10" : "bg-red-50" },
            { label: "Low Stock Items", value: loading ? "—" : lowStock.toString(), icon: Package, color: lowStock > 0 ? "text-amber-600" : "text-gray-400", bg: "bg-amber-50" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border bg-card p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mt-1 text-muted-foreground" />
                ) : (
                  <p className="text-lg font-bold mt-0.5">{c.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-sm mb-4">Inflow by Service</h3>
            {inflowByService.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No inflow data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={inflowByService} margin={{ left: 0, right: 0 }}>
                  <XAxis dataKey="service" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => CAD(v)} />
                  <Bar dataKey="total" fill="#0BBDB2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-sm mb-4">Expenses by Category</h3>
            {expensesByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No expense data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                    {expensesByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => CAD(v)} />
                  <Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Record Inflow", desc: "Log a cleaning job payment", href: "/dashboard/ultratidy/inflow", color: "bg-green-50", icon: TrendingUp, iconColor: "text-green-600" },
            { label: "Record Expense", desc: "Log a business cost", href: "/dashboard/ultratidy/expenses", color: "bg-red-50", icon: TrendingDown, iconColor: "text-red-500" },
            { label: "Manage Inventory", desc: "Track supplies & equipment", href: "/dashboard/ultratidy/inventory", color: "bg-primary/10", icon: Package, iconColor: "text-primary" },
          ].map((card) => (
            <div key={card.href} className="rounded-xl border bg-card p-5 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center shrink-0`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{card.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
                <Link href={card.href} className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                  Go <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
