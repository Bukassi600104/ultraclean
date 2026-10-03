"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FARM_PRODUCTS, farmDateToday } from "@/lib/farm-products";
import { FarmCorrectionRequest } from "@/components/manager/FarmCorrectionRequest";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Lock, AlertTriangle, ChevronRight } from "lucide-react";

interface Sale {
  id: string;
  date: string;
  customer_name?: string;
  product: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  notes?: string;
  is_edited?: boolean;
  weight_kg?: number | null;
  pricing_basis?: string | null;
}

interface DailyRecord {
  date: string;
  status: "open" | "closed";
}

const PRODUCTS = FARM_PRODUCTS.filter((product) => product.key !== "other");

function fmt(n: number) {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

function getTodayStr() {
  return farmDateToday();
}

function CloseDayDialog({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
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
          Once closed, all records are locked and cannot be edited or deleted.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading} className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-gray-200 text-gray-700">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#1b4332" }}>
            {loading ? "Closing..." : "Close Day"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SalesPage() {
  const router = useRouter();
  const today = getTodayStr();
  const [sales, setSales] = useState<Sale[]>([]);
  const [dayRecord, setDayRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    setDateLabel(new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" }));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, recordRes] = await Promise.all([
        fetch(`/api/farm/sales?date=${today}&limit=100`).then((r) => r.json()),
        fetch(`/api/farm/daily-record?date=${today}`).then((r) => r.json()),
      ]);
      setSales(salesRes.data || []);
      setDayRecord(recordRes.record || null);
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  const isDayClosed = dayRecord?.status === "closed";
  const totalSales = sales.reduce((s, x) => s + (x.total_amount || 0), 0);

  const chartData = PRODUCTS.map((p) => ({
    name: p.label,
    total: sales.filter((s) => s.product === p.key).reduce((sum, s) => sum + s.total_amount, 0),
    color: p.color,
  })).filter((d) => d.total > 0);

  async function handleCloseDay() {
    setClosing(true);
    try {
      const res = await fetch("/api/farm/daily-record/close", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      if (!res.ok) throw new Error();
      toast.success("Day closed. Records are locked.");
      await loadData();
    } catch { toast.error("Failed to close day"); }
    finally { setClosing(false); setShowCloseConfirm(false); }
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">{dateLabel}</p>
          <h1 className="text-lg font-bold text-gray-900">Record Sales</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: isDayClosed ? "#fef3c7" : "#dcfce7", color: isDayClosed ? "#92400e" : "#166534" }}>
            {isDayClosed ? <Lock className="h-3 w-3" /> : <div className="h-2 w-2 rounded-full bg-green-500" />}
            {isDayClosed ? "Closed" : "Open"}
          </span>
          {!isDayClosed && (
            <button onClick={() => setShowCloseConfirm(true)} disabled={closing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "#1b4332" }}>
              <Lock className="h-3.5 w-3.5" />
              Close Day
            </button>
          )}
        </div>
      </div>

      {/* Total card */}
      {totalSales > 0 && (
        <div className="rounded-2xl p-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg,#1b4332,#2d6a4f)" }}>
          <p className="text-sm font-semibold text-white opacity-80">Today&apos;s Total Sales</p>
          <p className="text-2xl font-bold" style={{ color: "#11d469" }}>{fmt(totalSales)}</p>
        </div>
      )}

      {/* Product selection */}
      {!isDayClosed && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">What are you selling?</p>
          <div className="grid grid-cols-2 gap-3">
            {PRODUCTS.map((p) => (
              <button key={p.key} onClick={() => router.push(`/sales/${p.key}`)}
                className="flex items-center justify-between rounded-2xl px-4 py-4 border-2 transition-all active:scale-[0.97]"
                style={{ borderColor: p.color + "50", backgroundColor: p.bg }}>
                <span className="font-bold text-sm" style={{ color: p.color }}>{p.label}</span>
                <ChevronRight className="h-4 w-4" style={{ color: p.color + "80" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-sm font-bold text-gray-700 mb-3">Today by Product</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
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
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
        ) : sales.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-gray-200 p-8 text-center">
            <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No sales recorded today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sales.map((sale) => {
              const p = PRODUCTS.find((x) => x.key === sale.product);
              return (
                <div key={sale.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: (p?.color ?? "#6b7280") + "20", color: p?.color ?? "#6b7280" }}>
                          {p?.label ?? sale.product}
                        </span>
                        {sale.is_edited && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Edited</span>
                        )}
                      </div>
                      {sale.customer_name && (
                        <p className="text-sm font-semibold text-gray-900 mt-1">{sale.customer_name}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {sale.pricing_basis === "per_kg" ? `${sale.quantity} animals · ${sale.weight_kg} kg × ${fmt(sale.unit_price)}/kg` : sale.pricing_basis ? `${sale.quantity} × ${fmt(sale.unit_price)}` : `${sale.quantity} units · Historical total`} · {sale.payment_method.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900">{fmt(sale.total_amount)}</p>
                      <FarmCorrectionRequest recordType="sale" recordId={sale.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCloseConfirm && (
        <CloseDayDialog onConfirm={handleCloseDay} onCancel={() => setShowCloseConfirm(false)} loading={closing} />
      )}

    </div>
  );
}
