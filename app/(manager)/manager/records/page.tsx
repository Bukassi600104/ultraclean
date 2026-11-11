"use client";
import {useManagerFetch,useManagerPeriod} from "@/contexts/ManagerPeriodContext";
import {SalePaymentDetails} from "@/components/manager/SalePaymentDetails";
import type {FarmSale} from "@/types";
import {useAuth} from "@/contexts/AuthContext";
import {LegacyManagerExportButton} from "@/components/manager/LegacyManagerExportButton";
import {useFarmRecordRefresh} from "@/hooks/useFarmRecordRefresh";

import { formatCurrency } from "@/lib/utils";

import { useEffect, useState, useCallback, useRef } from "react";
import { FarmCorrectionRequest } from "@/components/manager/FarmCorrectionRequest";

function fmt(n: number): string {
  return formatCurrency(n);
}

type MainTab = "sales" | "expenses";
type ExpenseSub = "all" | "general" | "feed";

interface SaleRecord extends Pick<FarmSale,'invoice'|'invoice_id'> {
  id: string;
  date: string;
  product: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  weight_kg?: number;
  pricing_basis?: "per_kg" | "per_head" | "per_unit" | null;
  gender?: string;
  other_product_name?: string;
  customer_name?: string;
  payment_method: string;
}

interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  amount: number;
  paid_to?: string;
  payment_method: string;
}

interface FeedRecord {
  id: string;
  date: string;
  feed_type: string;
  feed_source: string;
  weight_amount: number;
  weight_unit: string;
  num_bags: number;
  cost: number;
}

const PAGE_SIZE = 30;

function DateFilterBar({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <div
      className="rounded-2xl p-3 mx-4 mt-3"
      style={{ backgroundColor: "#eef5f2" }}
    >
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => onFrom(e.target.value)}
            className="w-full rounded-xl px-3 py-2 outline-none text-sm"
            style={{
              backgroundColor: "#ffffff",
              height: "44px",
              color: "#161d1b",
              border: "none",
            }}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => onTo(e.target.value)}
            className="w-full rounded-xl px-3 py-2 outline-none text-sm"
            style={{
              backgroundColor: "#ffffff",
              height: "44px",
              color: "#161d1b",
              border: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SalesTab({ from, to }: { from: string; to: string }) {
 const managerFetch=useManagerFetch();
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(
    async (pageNum: number, reset: boolean) => {
      setIsLoading(true);
      const version = ++requestRef.current; setLoadError("");
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(), with_payment:"1",
          limit: PAGE_SIZE.toString(),
          ...(from ? {from} : {}), ...(to ? {to} : {}),
        });
        const res = await managerFetch(`/api/farm/sales?${params}`);
        if (!res.ok) throw new Error("Records unavailable");
        const d = await res.json();
        if (version !== requestRef.current) return;
        const allRecs: SaleRecord[] = d.data || [];

        const filtered = allRecs;

        setRecords((prev) => (reset ? filtered : [...prev, ...filtered]));
        setHasMore(allRecs.length === PAGE_SIZE);
      } catch {
        if (version === requestRef.current) setLoadError("Records could not be loaded. Change the filter or retry.");
      } finally {
        if (version === requestRef.current) setIsLoading(false);
      }
    },
    [from, to,managerFetch]
  );

  useEffect(() => {
    setPage(1);
    setRecords([]);
    load(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const next = page + 1;
          setPage(next);
          load(next, false);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, isLoading, page, load]);

  if (isLoading && records.length === 0) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl h-20 animate-pulse"
            style={{ backgroundColor: "#e8efec" }}
          />
        ))}
      </div>
    );
  }

  if (loadError) return <div role="alert" className="p-4 text-red-700">{loadError}<button className="ml-3 underline min-h-11" onClick={() => load(page, page === 1)}>Retry</button></div>;
  if (!isLoading && records.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20"
        style={{ color: "#6b7280" }}
      >
        <p className="text-lg">No sales records found</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-8">
      {records.map((s) => (
        <div
          key={s.id}
          className="rounded-2xl p-4 mb-3"
          style={{
            backgroundColor: "#ffffff",
            boxShadow: "0 4px 12px rgba(27,67,50,0.06)",
          }}
        >
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: "#11d469" }}
              />
              <span className="text-sm font-bold capitalize" style={{ color: "#161d1b" }}>
                {s.other_product_name || s.product}
              </span>
              {s.customer_name && (
                <span className="text-xs" style={{ color: "#6b7280" }}>
                  — {s.customer_name}
                </span>
              )}
            </div>
            <span className="text-lg font-bold" style={{ color: "#11d469" }}>
              {fmt(s.total_amount)}
            </span>
          </div>
          <p className="text-xs ml-5" style={{ color: "#6b7280" }}>
            {new Date(s.date + "T00:00:00").toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 ml-5">
            <span className="text-xs" style={{ color: "#6b7280" }}>
              Qty: {s.quantity}
            </span>
            <span className="text-xs" style={{ color: "#6b7280" }}>
              {s.pricing_basis ? `${fmt(s.unit_price)}/${s.pricing_basis === "per_kg" ? "kg" : s.pricing_basis === "per_head" ? "head" : "unit"}` : "Historical total retained"}
            </span>
            {s.weight_kg && (
              <span className="text-xs" style={{ color: "#6b7280" }}>
                {s.weight_kg}kg
              </span>
            )}
            {s.gender && (
              <span className="text-xs capitalize" style={{ color: "#6b7280" }}>
                {s.gender}
              </span>
            )}
            <SalePaymentDetails sale={s}/>
          </div>
          <FarmCorrectionRequest recordType="sale" recordId={s.id} />
        </div>
      ))}
      <div ref={loaderRef} className="h-8" />
      {isLoading && (
        <div className="text-center py-4" style={{ color: "#6b7280" }}>
          Loading...
        </div>
      )}
    </div>
  );
}

function GeneralExpensesTab({ from, to }: { from: string; to: string }) {
 const managerFetch=useManagerFetch();
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(
    async (pageNum: number, reset: boolean) => {
      setIsLoading(true);
      const version = ++requestRef.current; setLoadError("");
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: PAGE_SIZE.toString(),
          ...(from ? {from} : {}), ...(to ? {to} : {}),
        });
        const res = await managerFetch(`/api/farm/expenses?${params}`);
        if (!res.ok) throw new Error("Records unavailable");
        const d = await res.json();
        if (version !== requestRef.current) return;
        const allRecs: ExpenseRecord[] = d.data || [];
        const filtered = allRecs;
        setRecords((prev) => (reset ? filtered : [...prev, ...filtered]));
        setHasMore(allRecs.length === PAGE_SIZE);
      } catch {
        if (version === requestRef.current) setLoadError("Records could not be loaded. Change the filter or retry.");
      } finally {
        if (version === requestRef.current) setIsLoading(false);
      }
    },
    [from, to,managerFetch]
  );

  useEffect(() => {
    setPage(1);
    setRecords([]);
    load(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const next = page + 1;
          setPage(next);
          load(next, false);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, isLoading, page, load]);

  if (isLoading && records.length === 0) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl h-16 animate-pulse"
            style={{ backgroundColor: "#e8efec" }}
          />
        ))}
      </div>
    );
  }

  if (loadError) return <div role="alert" className="p-4 text-red-700">{loadError}<button className="ml-3 underline min-h-11" onClick={() => load(page, page === 1)}>Retry</button></div>;
  if (!isLoading && records.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20"
        style={{ color: "#6b7280" }}
      >
        <p>No expense records found</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-8">
      {records.map((e) => (
        <div
          key={e.id}
          className="rounded-2xl p-4 mb-3"
          style={{
            backgroundColor: "#ffffff",
            boxShadow: "0 4px 12px rgba(27,67,50,0.06)",
          }}
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: "#F5C842" }}
              />
              <span className="text-sm font-bold capitalize" style={{ color: "#161d1b" }}>
                {e.category}
              </span>
            </div>
            <span className="text-lg font-bold" style={{ color: "#F5C842" }}>
              {fmt(e.amount)}
            </span>
          </div>
          <p className="text-xs mt-0.5 ml-5" style={{ color: "#6b7280" }}>
            {new Date(e.date + "T00:00:00").toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {e.paid_to ? ` · To: ${e.paid_to}` : ""}
            {" · "}{e.payment_method}
          </p>
        </div>
      ))}
      <div ref={loaderRef} className="h-8" />
      {isLoading && (
        <div className="text-center py-4" style={{ color: "#6b7280" }}>
          Loading...
        </div>
      )}
    </div>
  );
}

function FeedTab({ from, to }: { from: string; to: string }) {
 const managerFetch=useManagerFetch();
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(
    async (pageNum: number, reset: boolean) => {
      setIsLoading(true);
      const version = ++requestRef.current; setLoadError("");
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: PAGE_SIZE.toString(),
          ...(from ? {from} : {}), ...(to ? {to} : {}),
        });
        const res = await managerFetch(`/api/farm/feed-purchases?${params}`);
        if (!res.ok) throw new Error("Records unavailable");
        const d = await res.json();
        if (version !== requestRef.current) return;
        const allRecs: FeedRecord[] = d.data || [];
        const filtered = allRecs;
        setRecords((prev) => (reset ? filtered : [...prev, ...filtered]));
        setHasMore(allRecs.length === PAGE_SIZE);
      } catch {
        if (version === requestRef.current) setLoadError("Records could not be loaded. Change the filter or retry.");
      } finally {
        if (version === requestRef.current) setIsLoading(false);
      }
    },
    [from, to,managerFetch]
  );

  useEffect(() => {
    setPage(1);
    setRecords([]);
    load(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const next = page + 1;
          setPage(next);
          load(next, false);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, isLoading, page, load]);

  if (isLoading && records.length === 0) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl h-16 animate-pulse"
            style={{ backgroundColor: "#e8efec" }}
          />
        ))}
      </div>
    );
  }

  if (loadError) return <div role="alert" className="p-4 text-red-700">{loadError}<button className="ml-3 underline min-h-11" onClick={() => load(page, page === 1)}>Retry</button></div>;
  if (!isLoading && records.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20"
        style={{ color: "#6b7280" }}
      >
        <p>No feed records found</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-8">
      {records.map((f) => (
        <div
          key={f.id}
          className="rounded-2xl p-4 mb-3"
          style={{
            backgroundColor: "#ffffff",
            boxShadow: "0 4px 12px rgba(27,67,50,0.06)",
          }}
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: "#F5C842" }}
              />
              <span className="text-sm font-bold capitalize" style={{ color: "#161d1b" }}>
                {f.feed_type} Feed — {f.feed_source}
              </span>
            </div>
            <span className="text-lg font-bold" style={{ color: "#11d469" }}>
              {fmt(f.cost)}
            </span>
          </div>
          <p className="text-xs mt-0.5 ml-5" style={{ color: "#6b7280" }}>
            {new Date(f.date + "T00:00:00").toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {" · "}{f.weight_amount} {f.weight_unit} · {f.num_bags} bags
          </p>
        </div>
      ))}
      <div ref={loaderRef} className="h-8" />
      {isLoading && (
        <div className="text-center py-4" style={{ color: "#6b7280" }}>
          Loading...
        </div>
      )}
    </div>
  );
}

function AllExpenses({from,to}:{from:string;to:string}){
 const refresh=useFarmRecordRefresh();
 const read=useManagerFetch(),[page,setPage]=useState(1),[retry,setRetry]=useState(0);
 const [rows,setRows]=useState<({_type:'expense',data:ExpenseRecord}|{_type:'feed',data:FeedRecord}|{_type:'purchase',data:{id:string;date:string;category:string;recipient:string;amount:number}})[]>([]);
 const [total,setTotal]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 useEffect(()=>{
  const controller=new AbortController(),params=new URLSearchParams({scope:'mine',page:String(page),limit:String(PAGE_SIZE)});
  if(from)params.set('from',from);if(to)params.set('to',to);
  setLoading(true);setError(false);
  read('/api/farm/expense-history?'+params,{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();const body=await r.json();if(!controller.signal.aborted){setRows(body.data);setTotal(body.total);}})
   .catch(()=>{if(!controller.signal.aborted)setError(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[from,to,page,retry,read,refresh]);
 if(error)return <p role="alert" className="p-4">Expense history is unavailable. <button className="min-h-11 underline" onClick={()=>setRetry(v=>v+1)}>Retry</button></p>;
 if(loading)return <p role="status" className="p-4">Loading expense history…</p>;
 return <section className="space-y-2 px-4"><p className="text-sm text-slate-600">{total} recorded expenses · {from||to?'Selected dates':'All dates'}</p>
  {rows.map(row=><article key={row._type+row.data.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-2">
   <strong>{row._type==='feed'?row.data.feed_type+' feed':row._type==='purchase'?row.data.recipient:row.data.paid_to||row.data.category}</strong>
   <strong>{fmt(row._type==='feed'?row.data.cost:row.data.amount)}</strong></div>
   <p className="text-sm text-slate-600">{new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(row.data.date+'T00:00:00Z'))} · {row._type==='feed'?row.data.num_bags+' bags':row._type==='purchase'?'Purchase payment':row.data.category}</p>
  </article>)}
  {total>PAGE_SIZE&&<div className="flex items-center justify-between gap-3"><button className="min-h-11 underline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button>Page {page} of {Math.ceil(total/PAGE_SIZE)}<button className="min-h-11 underline" disabled={page*PAGE_SIZE>=total} onClick={()=>setPage(p=>p+1)}>Next</button></div>}
 </section>;
}
export default function RecordsPage() {
  const {profile}=useAuth();
  const scope=useManagerPeriod();
  const [mainTab, setMainTab] = useState<MainTab>("sales");
  useEffect(()=>{if(new URLSearchParams(window.location.search).get("tab")==="expenses")setMainTab("expenses");},[]);
  const [expenseSub, setExpenseSub] = useState<ExpenseSub>(scope?.periodId?"all":"general");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  return (
    <div className="max-w-2xl mx-auto">
      {profile?.id&&<LegacyManagerExportButton targetId={profile.id}/>}

      {/* Tab switcher */}
      <div
        className="flex rounded-2xl p-1 mb-3"
        style={{ backgroundColor: "#e8efec" }}
      >
        {(["sales", "expenses"] as MainTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all"
            style={
              mainTab === tab
                ? { backgroundColor: "#1b4332", color: "#ffffff" }
                : { color: "#6b7280" }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Expense sub-tabs */}
      {mainTab === "expenses" && (
        <div className="flex gap-2 mb-3">
          {((scope?.periodId?["all","general","feed"]:["general","feed"]) as ExpenseSub[]).map((sub) => (
            <button
              key={sub}
              onClick={() => setExpenseSub(sub)}
              className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all"
              style={
                expenseSub === sub
                  ? { backgroundColor: "#F5C842", color: "#012d1d" }
                  : { backgroundColor: "#e8efec", color: "#6b7280" }
              }
            >
              {sub === "all" ? "All expenses" : sub === "general" ? "General" : "Feed Purchases"}
            </button>
          ))}
        </div>
      )}

      <DateFilterBar
        from={fromDate}
        to={toDate}
        onFrom={setFromDate}
        onTo={setToDate}
      />

      <div className="mt-3">
        {mainTab==="expenses"&&expenseSub==="all"&&<AllExpenses key={fromDate+toDate} from={fromDate} to={toDate}/>}
        {mainTab === "sales" && <SalesTab from={fromDate} to={toDate} />}
        {mainTab === "expenses" && expenseSub === "general" && (
          <GeneralExpensesTab from={fromDate} to={toDate} />
        )}
        {mainTab === "expenses" && expenseSub === "feed" && (
          <FeedTab from={fromDate} to={toDate} />
        )}
      </div>
    </div>
  );
}
