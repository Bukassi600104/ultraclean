"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  TrendingUp, Plus, Lock, Edit2, Trash2, X, AlertTriangle
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Sale {
  id: string;
  date: string;
  customer_name: string;
  product: "catfish" | "goat" | "chicken" | "other";
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  notes?: string;
  is_edited?: boolean;
}

interface DailyRecord {
  id?: string;
  date: string;
  status: "open" | "closed";
  closed_at?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRODUCT_COLORS: Record<string, string> = {
  catfish: "#3b82f6",
  goat: "#f59e0b",
  chicken: "#f97316",
  other: "#8b5cf6",
};

const PRODUCT_LABELS: Record<string, string> = {
  catfish: "Catfish",
  goat: "Goat",
  chicken: "Chicken",
  other: "Other",
};

function fmt(n: number) {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Close Day Confirm Dialog ─────────────────────────────────────────────────

function CloseDayDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Close Today&apos;s Records?</p>
            <p className="text-sm text-gray-500">This cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Once you close the day, all sales records will be locked and cannot be edited or deleted.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-gray-200 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#1b4332" }}
          >
            Close Day
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Sale Dialog ─────────────────────────────────────────────────────────

function EditSaleDialog({
  sale,
  onSave,
  onCancel,
}: {
  sale: Sale;
  onSave: (id: string, updates: Partial<Sale>) => Promise<void>;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState(String(sale.quantity));
  const [price, setPrice] = useState(String(sale.unit_price));
  const [customer, setCustomer] = useState(sale.customer_name);
  const [payMethod, setPayMethod] = useState(sale.payment_method);
  const [notes, setNotes] = useState(sale.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(sale.id, {
      quantity: Number(qty),
      unit_price: Number(price),
      customer_name: customer,
      payment_method: payMethod as Sale["payment_method"],
      notes,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-gray-900">Edit Sale — {PRODUCT_LABELS[sale.product]}</p>
          <button onClick={onCancel} className="p-1.5 rounded-full bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</label>
              <input
                type="number"
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Price (₦)</label>
              <input
                type="number"
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
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

export default function SalesOverviewPage() {
  const router = useRouter();
  const today = getTodayStr();
  const [sales, setSales] = useState<Sale[]>([]);
  const [dayRecord, setDayRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [closing, setClosing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, recordRes] = await Promise.all([
        fetch(`/api/farm/sales?date=${today}&limit=100`).then((r) => r.json()),
        fetch(`/api/farm/daily-record?date=${today}`).then((r) => r.json()),
      ]);
      setSales(salesRes.data || []);
      setDayRecord(recordRes.record || null);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  // Chart data
  const chartData = ["catfish", "goat", "chicken", "other"].map((product) => ({
    product: PRODUCT_LABELS[product],
    total: sales.filter((s) => s.product === product).reduce((sum, s) => sum + (s.total_amount || 0), 0),
    color: PRODUCT_COLORS[product],
  })).filter((d) => d.total > 0);

  const totalSales = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalUnits = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
  const isDayClosed = dayRecord?.status === "closed";

  async function handleCloseDay() {
    setClosing(true);
    try {
      const res = await fetch("/api/farm/daily-record/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      if (!res.ok) throw new Error();
      toast.success("Day closed. Records are now locked.");
      await loadData();
    } catch {
      toast.error("Failed to close day");
    } finally {
      setClosing(false);
      setShowCloseConfirm(false);
    }
  }

  async function handleEditSave(id: string, updates: Partial<Sale>) {
    try {
      const res = await fetch(`/api/farm/sales/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      toast.success("Sale updated");
      setEditSale(null);
      await loadData();
    } catch {
      toast.error("Failed to update sale");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/farm/sales/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Sale removed");
      await loadData();
    } catch {
      toast.error("Failed to delete sale");
    }
  }

  const dateLabel = new Date().toLocaleDateString("en-NG", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">{dateLabel}</p>
          <h1 className="text-lg font-bold text-gray-900">Sales Overview</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: isDayClosed ? "#fef3c7" : "#dcfce7",
              color: isDayClosed ? "#92400e" : "#166534",
            }}
          >
            {isDayClosed ? <Lock className="h-3 w-3" /> : <div className="h-2 w-2 rounded-full bg-green-500" />}
            {isDayClosed ? "Closed" : "Open"}
          </span>
          {!isDayClosed && (
            <button
              onClick={() => setShowCloseConfirm(true)}
              disabled={closing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "#1b4332" }}
            >
              <Lock className="h-3.5 w-3.5" />
              {closing ? "Closing..." : "Close Day"}
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total Sales", value: fmt(totalSales), color: "#11d469" },
          { label: "Units Sold", value: String(totalUnits), color: "#3b82f6" },
          { label: "Transactions", value: String(sales.length), color: "#8b5cf6" },
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
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Record New Sale</p>
          <div className="grid grid-cols-2 gap-2">
            {["catfish", "goat", "chicken", "other"].map((product) => (
              <button
                key={product}
                onClick={() => router.push(`/sales/${product}`)}
                className="flex items-center justify-between rounded-xl px-4 py-3 border transition-all active:scale-[0.97]"
                style={{ borderColor: PRODUCT_COLORS[product] + "40", backgroundColor: PRODUCT_COLORS[product] + "0d" }}
              >
                <span className="text-sm font-semibold" style={{ color: PRODUCT_COLORS[product] }}>
                  {PRODUCT_LABELS[product]}
                </span>
                <TrendingUp className="h-4 w-4" style={{ color: PRODUCT_COLORS[product] + "99" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-sm font-bold text-gray-700 mb-3">Today&apos;s Sales by Product</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="product" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.product} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Records list */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
          Today&apos;s Records ({sales.length})
        </p>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-gray-200 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No sales recorded today</p>
            {!isDayClosed && (
              <button
                onClick={() => router.push("/sales/catfish")}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: "#11d469", color: "#012d1d" }}
              >
                <Plus className="h-3.5 w-3.5" />
                Record First Sale
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {sales.map((sale) => (
              <div key={sale.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: PRODUCT_COLORS[sale.product] + "20",
                          color: PRODUCT_COLORS[sale.product],
                        }}
                      >
                        {PRODUCT_LABELS[sale.product]}
                      </span>
                      {sale.is_edited && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          Edited
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{sale.customer_name}</p>
                    <p className="text-xs text-gray-400">
                      {sale.quantity} unit{sale.quantity !== 1 ? "s" : ""} × {fmt(sale.unit_price)} · {sale.payment_method}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">{fmt(sale.total_amount)}</p>
                    {!isDayClosed && (
                      <div className="flex gap-1 mt-1 justify-end">
                        <button
                          onClick={() => setEditSale(sale)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sale.id)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showCloseConfirm && (
        <CloseDayDialog
          onConfirm={handleCloseDay}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
      {editSale && (
        <EditSaleDialog
          sale={editSale}
          onSave={handleEditSave}
          onCancel={() => setEditSale(null)}
        />
      )}
    </div>
  );
}
