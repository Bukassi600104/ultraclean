"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  Receipt, Plus, Lock, Edit2, Trash2, X, Users, Package,
  Zap, HeartPulse, Truck, Wrench,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  paid_to?: string;
  payment_method: string;
  notes?: string;
  is_edited?: boolean;
  _type?: "expense";
}

interface FeedPurchase {
  id: string;
  date: string;
  feed_type: string;
  num_bags: number;
  cost: number;
  notes?: string;
  _type: "feed";
}

type ListItem = Expense | FeedPurchase;

interface DailyRecord {
  date: string;
  status: "open" | "closed";
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; href: string }> = {
  labor: { label: "Labour", color: "#6366f1", icon: Users, href: "/expenses/labor" },
  feed: { label: "Feed", color: "#f59e0b", icon: Package, href: "/expenses/feed" },
  utilities: { label: "Utilities", color: "#3b82f6", icon: Zap, href: "/expenses/utilities" },
  veterinary: { label: "Veterinary", color: "#ef4444", icon: HeartPulse, href: "/expenses/veterinary" },
  transport: { label: "Transport", color: "#10b981", icon: Truck, href: "/expenses/transport" },
  equipment: { label: "Equipment", color: "#8b5cf6", icon: Wrench, href: "/expenses/equipment" },
};

function fmt(n: number) {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] ?? { label: category, color: "#6b7280", icon: Receipt, href: `/expenses/${category}` };
}

// ─── Edit Expense Dialog ──────────────────────────────────────────────────────

function EditExpenseDialog({
  expense,
  onSave,
  onCancel,
}: {
  expense: Expense;
  onSave: (id: string, updates: Partial<Expense>) => Promise<void>;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(String(expense.amount));
  const [paidTo, setPaidTo] = useState(expense.paid_to ?? "");
  const [payMethod, setPayMethod] = useState(expense.payment_method);
  const [notes, setNotes] = useState(expense.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(expense.id, {
      amount: Number(amount),
      paid_to: paidTo,
      payment_method: payMethod,
      notes,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-gray-900">Edit — {getCategoryConfig(expense.category).label}</p>
          <button onClick={onCancel} className="p-1.5 rounded-full bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount (₦)</label>
            <input
              type="number"
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid To</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Method</label>
            <select
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="transfer">Transfer</option>
              <option value="pos">POS</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-gray-200 text-gray-600">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#1b4332" }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpensesOverviewPage() {
  const router = useRouter();
  const today = getTodayStr();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [feedPurchases, setFeedPurchases] = useState<FeedPurchase[]>([]);
  const [dayRecord, setDayRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, feedRes, recordRes] = await Promise.all([
        fetch(`/api/farm/expenses?date=${today}&limit=100`).then((r) => r.json()),
        fetch(`/api/farm/feed-purchases?date=${today}&limit=100`).then((r) => r.json()),
        fetch(`/api/farm/daily-record?date=${today}`).then((r) => r.json()),
      ]);
      setExpenses(expRes.data || []);
      setFeedPurchases((feedRes.data || []).map((f: FeedPurchase) => ({ ...f, _type: "feed" as const })));
      setDayRecord(recordRes.record || null);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  // Merge list — expenses first then feed purchases, sorted by created_at desc
  const allItems: ListItem[] = [
    ...expenses.map((e) => ({ ...e, _type: "expense" as const })),
    ...feedPurchases,
  ];

  // Chart data — expenses by category only
  const chartData = Object.entries(CATEGORY_CONFIG)
    .map(([key, cfg]) => ({
      category: cfg.label,
      total: expenses
        .filter((e) => e.category === key)
        .reduce((sum, e) => sum + (e.amount || 0), 0),
      color: cfg.color,
    }))
    .filter((d) => d.total > 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalFeed = feedPurchases.reduce((sum, f) => sum + (f.cost || 0), 0);
  const isDayClosed = dayRecord?.status === "closed";

  const dateLabel = new Date().toLocaleDateString("en-NG", {
    weekday: "long", day: "numeric", month: "long",
  });

  async function handleEditSave(id: string, updates: Partial<Expense>) {
    try {
      const res = await fetch(`/api/farm/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      toast.success("Expense updated");
      setEditExpense(null);
      await loadData();
    } catch {
      toast.error("Failed to update expense");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/farm/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Expense removed");
      await loadData();
    } catch {
      toast.error("Failed to delete expense");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">{dateLabel}</p>
          <h1 className="text-lg font-bold text-gray-900">Expenses Overview</h1>
        </div>
        {isDayClosed && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            <Lock className="h-3 w-3" />
            Closed
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Expenses", value: fmt(totalExpenses), color: "#ef4444" },
          { label: "Feed Purchases", value: fmt(totalFeed), color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl p-3 bg-white border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className="text-base font-bold" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick record buttons */}
      {!isDayClosed && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Record Expense</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => router.push(cfg.href)}
                className="flex items-center justify-between rounded-xl px-4 py-3 border transition-all active:scale-[0.97]"
                style={{ borderColor: cfg.color + "40", backgroundColor: cfg.color + "0d" }}
              >
                <div className="flex items-center gap-2">
                  <cfg.icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: cfg.color }} />
                  <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-sm font-bold text-gray-700 mb-3">Today&apos;s Expenses by Category</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="category" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.category} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Records list */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
          Today&apos;s Records ({allItems.length})
        </p>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : allItems.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-gray-200 p-8 text-center">
            <Receipt className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No expenses recorded today</p>
            {!isDayClosed && (
              <button
                onClick={() => router.push("/expenses/labor")}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: "#1b4332" }}
              >
                <Plus className="h-3.5 w-3.5" />
                Record First Expense
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {allItems.map((item) => {
              if (item._type === "feed") {
                const feed = item as FeedPurchase;
                return (
                  <div key={`feed-${feed.id}`} className="bg-white rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            Feed Purchase
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">{feed.feed_type} feed</p>
                        <p className="text-xs text-gray-400">{feed.num_bags} bag{feed.num_bags !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900">{fmt(feed.cost)}</p>
                      </div>
                    </div>
                  </div>
                );
              }

              const expense = item as Expense;
              const cfg = getCategoryConfig(expense.category);
              return (
                <div key={expense.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: cfg.color + "20", color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                        {expense.is_edited && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            Edited
                          </span>
                        )}
                      </div>
                      {expense.paid_to && (
                        <p className="text-sm font-semibold text-gray-900 mt-1">{expense.paid_to}</p>
                      )}
                      <p className="text-xs text-gray-400">{expense.payment_method}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900">{fmt(expense.amount)}</p>
                      {!isDayClosed && (
                        <div className="flex gap-1 mt-1 justify-end">
                          <button
                            onClick={() => setEditExpense(expense)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editExpense && (
        <EditExpenseDialog
          expense={editExpense}
          onSave={handleEditSave}
          onCancel={() => setEditExpense(null)}
        />
      )}
    </div>
  );
}
