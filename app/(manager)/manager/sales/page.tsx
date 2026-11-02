"use client";
import Link from "next/link";
import {Dialog,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import type {CreditData} from "@/lib/farm-credit";
import {formatExactCurrency} from "@/lib/money";
import {useManagerFetch} from "@/contexts/ManagerPeriodContext";

import { formatCurrency } from "@/lib/utils";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FARM_PRODUCTS, farmDateToday } from "@/lib/farm-products";
import {FarmRecordDiscussion} from '@/components/manager/FarmRecordThread';
import { FarmCorrectionRequest } from "@/components/manager/FarmCorrectionRequest";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Lock, AlertTriangle, ChevronRight } from "lucide-react";

import { livestockGroupLabel,type LivestockGroup } from "@/lib/farm-livestock-categories";

interface Sale {
  stock_group?:LivestockGroup|null;
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

const PRODUCTS = FARM_PRODUCTS;

function fmt(n: number) {
  return formatCurrency(n);
}

function getTodayStr() {
  return farmDateToday();
}

function CloseDayDialog({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <Dialog open onOpenChange={open=>{if(!open&&!loading)onCancel();}}>
      <DialogContent className="max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <DialogTitle className="pr-10 font-bold text-gray-900">Close Today&apos;s Records?</DialogTitle>
            <p className="text-sm text-gray-500">This cannot be undone.</p>
          </div>
        </div>
        <DialogDescription className="text-sm text-gray-600 mb-5">
          Once closed, managers cannot add or change records for this date. Bimbo can review correction requests.
        </DialogDescription>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading} className="min-h-11 flex-1 rounded-xl py-2.5 text-sm font-semibold border border-gray-200 text-gray-700">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="min-h-11 flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#1b4332" }}>
            {loading ? "Closing..." : "Close Day"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SalesPage() {
 const managerFetch=useManagerFetch();
  const router = useRouter();
  const today = getTodayStr();
  const [sales, setSales] = useState<Sale[]>([]);
  const [dayRecord, setDayRecord] = useState<DailyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{revenue:number;sales_by_product:{name:string;value:number}[]} | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [showProducts,setShowProducts]=useState(false);
  const [creditData,setCreditData]=useState<CreditData|null>(null),[creditError,setCreditError]=useState("");
  const [creditVersion,setCreditVersion]=useState(0);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    setDateLabel(new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" }));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);setLoadError(false);setSummary(null);
    try {
      const read = async (url:string) => {const response=await managerFetch(url);if(!response.ok)throw new Error("Unavailable");return response.json();};
      const [salesRes, recordRes, finance] = await Promise.all([
        read(`/api/farm/sales?date=${today}&limit=100`),
        read(`/api/farm/daily-record?date=${today}`),
        read(`/api/farm/balance?date=${today}&from=${today}&to=${today}`),
      ]);
      setSummary(finance);setSales(salesRes.data || []);
      setDayRecord(recordRes.record || null);
    } catch { setLoadError(true);toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, [today,managerFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(()=>{const controller=new AbortController();setCreditData(null);setCreditError("");managerFetch('/api/farm/credit',{signal:controller.signal}).then(async response=>{const body=await response.json();if(!response.ok||!body.summary||!Array.isArray(body.invoices))throw Error(body.error||'Customer balances unavailable');if(!controller.signal.aborted)setCreditData(body);}).catch(error=>{if(!controller.signal.aborted)setCreditError(error.message);});return()=>controller.abort();},[managerFetch,creditVersion]);
  useEffect(()=>{const refresh=()=>{void loadData();setCreditVersion(v=>v+1);};window.addEventListener('farm-records-synced',refresh);return()=>window.removeEventListener('farm-records-synced',refresh);},[loadData]);

  const isDayClosed = dayRecord?.status === "closed";
  const totalSales = summary?.revenue ?? 0;

  const chartData = PRODUCTS.map((p) => ({
    name: p.label,
    total: summary?.sales_by_product.find(row => row.name === p.key)?.value ?? 0,
    color: p.color,
  })).filter((d) => d.total > 0);

  async function handleCloseDay() {
    setClosing(true);
    try {
      const res = await managerFetch("/api/farm/daily-record/close", {
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
    <div className="mx-auto max-w-5xl space-y-6 text-slate-950">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">{dateLabel}</p>
          <p className="mt-1 text-base">Record sales and payments separately, with clear customer balances.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: isDayClosed ? "#fef3c7" : "#dcfce7", color: isDayClosed ? "#92400e" : "#166534" }}>
            {!loading&&!loadError&&(isDayClosed ? <Lock className="h-3 w-3" /> : <div className="h-2 w-2 rounded-full bg-green-500" />)}
            {loading ? "Loading status…" : loadError ? "Status unavailable" : isDayClosed ? "Closed" : "Open"}
          </span>
          {!isDayClosed && (
            <button onClick={() => setShowCloseConfirm(true)} disabled={closing||loading||loadError}
              className="flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "#1b4332" }}>
              <Lock className="h-3.5 w-3.5" />
              Close Day
            </button>
          )}
        </div>
      </div>

      {loadError && <p role="alert" className="text-red-700">Financial summary unavailable. <button className="underline min-h-11" onClick={loadData}>Retry</button></p>}
      <p className="text-xs text-gray-500">Reporting period: {today} · today only</p>
      <div className="flex flex-wrap gap-3">
        <button className="min-h-12 rounded-xl bg-emerald-900 px-5 py-3 text-base font-bold text-white disabled:opacity-50" disabled={loading||loadError||isDayClosed} onClick={()=>setShowProducts(true)}>Record a sale</button>
        <Link className="inline-flex min-h-12 items-center rounded-xl border border-emerald-800 bg-white px-5 py-3 text-base font-bold text-emerald-950" href="/credit?action=receipt">Record a payment</Link>
        <Link className="inline-flex min-h-12 items-center px-3 font-semibold text-emerald-900 underline" href="/credit">Customers &amp; payments</Link>
      </div>
      {isDayClosed&&<p className="rounded-xl bg-amber-50 p-4 text-amber-950">Today&apos;s records are closed. Saved sales remain available below. Payment entries are checked against their actual date.</p>}
      <section aria-label="Sales and customer balances" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-900 bg-emerald-950 p-5 text-white"><p className="text-base">Today&apos;s sales</p><p className="mt-2 break-words text-3xl font-bold tabular-nums">{loading?'Loading…':loadError?'Unavailable':fmt(totalSales)}</p><p className="mt-2 text-sm text-emerald-100">All recorded sales for {today}</p></div>
        {([['Invoice sales',creditData?.summary.revenue],['Payments received',creditData?.summary.collected],['Customer debt',creditData?.summary.owed]] as const).map(([label,value])=><div key={label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5"><p className="text-base text-slate-700">{label}</p><p className="mt-2 break-words text-3xl font-bold tabular-nums">{value!==undefined?formatExactCurrency(value,'NGN'):creditError?'Unavailable':'Loading…'}</p><p className="mt-2 text-sm text-slate-600">{label==='Customer debt'?'Assigned customers · current balance':'Your responsibility scope · all dates'}</p></div>)}
      </section>
      <p className="text-sm text-slate-600">Sales show what was sold. Payments show money actually received. Customer debt is still unpaid. These figures have different scopes and must not be added together.</p>
      {creditError&&<p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-950">{creditError}. <button className="min-h-11 underline" onClick={()=>setCreditVersion(v=>v+1)}>Retry customer balances</button></p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Recent invoices</h2><Link href="/credit" className="inline-flex min-h-11 items-center font-semibold text-emerald-900 underline">View all invoices</Link></div>
        <p className="mb-4 text-sm text-slate-600">Latest 10 in your permitted scope. Historical sales without invoices remain unchanged below.</p>
        {creditData?.invoices.length===0?<p>No invoices recorded in this scope.</p>:creditData?<div className="divide-y">{[...creditData.invoices].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map(invoice=><article key={invoice.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><h3 className="break-words font-bold">{invoice.number} · {invoice.customer_name}</h3><p className="text-sm text-slate-600">{invoice.date} · Due {invoice.due_date}</p><p className="mt-1 text-sm font-semibold">{invoice.voided_at?'Voided':invoice.overdue_days?`${invoice.overdue_days} days overdue`:Number(invoice.owed)>0?'Awaiting payment':'Settled'}</p></div><dl className="grid gap-1 text-sm"><div><dt className="inline text-slate-600">Sale value: </dt><dd className="inline font-bold">{formatExactCurrency(invoice.total,'NGN')}</dd></div><div><dt className="inline text-slate-600">Still owed: </dt><dd className="inline font-bold">{formatExactCurrency(invoice.owed,'NGN')}</dd></div></dl></article>)}</div>:<p>{creditError?'Invoices unavailable.':'Loading invoices…'}</p>}
      </section>
      <Dialog open={showProducts} onOpenChange={setShowProducts}><DialogContent><DialogTitle className="pr-10 text-2xl font-bold">Record a sale</DialogTitle><DialogDescription>Choose what was sold. The next form keeps the correct units, customer and stock details.</DialogDescription><div className="grid grid-cols-2 gap-3">{PRODUCTS.map(product=><button key={product.key} className="flex min-h-14 items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left font-semibold text-slate-950" onClick={()=>router.push(`/sales/${product.key}`)}>{product.label}<ChevronRight className="h-4 w-4 shrink-0"/></button>)}</div><Link href="/stores" className="min-h-11 py-2 text-sm font-semibold text-emerald-900 underline">Selling eggs? Choose the recorded egg batch in Physical Counts &amp; Eggs.</Link></DialogContent></Dialog>

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
        <p className="text-xl font-bold text-slate-950 mb-3">
          Today&apos;s sales records ({sales.length}{sales.length===100?" shown; more may exist":""})
        </p>
        {loading ? (
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
        ) : loadError ? <p className="text-red-700">Sales records unavailable.</p> : sales.length === 0 ? (
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
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: (p?.color ?? "#6b7280") + "20", color: p?.color ?? "#6b7280" }}>
                          {p?.label ?? sale.product}{sale.stock_group&&<span className="block text-xs font-normal text-gray-600">{livestockGroupLabel(sale.stock_group)}</span>}
                        </span>
                        {sale.is_edited && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Edited</span>
                        )}
                      </div>
                      {sale.customer_name && (
                        <p className="text-sm font-semibold text-gray-900 mt-1">{sale.customer_name}</p>
                      )}
                      <p className="mt-2 text-sm text-slate-600">
                        {sale.pricing_basis === "per_kg" ? `${sale.quantity} ${sale.product === "catfish" ? "fish" : "animals"} removed · ${sale.weight_kg} kg × ${fmt(sale.unit_price)}/kg` : sale.pricing_basis ? `${sale.quantity} × ${fmt(sale.unit_price)}` : `${sale.quantity} units · Historical total`} · {sale.payment_method.toUpperCase()}
                      </p>
                    </div>
                    <div className="min-w-0 sm:text-right">
                      <p className="text-sm text-slate-600">Sale value</p><p className="break-words text-xl font-bold text-slate-950">{fmt(sale.total_amount)}</p>
                      <FarmCorrectionRequest recordType="sale" recordId={sale.id} />
                      <div className="mt-2"><FarmRecordDiscussion resource="farm_sales" recordId={sale.id}/></div>
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
