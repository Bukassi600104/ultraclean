"use client";

import { useEffect, useState, useCallback, useRef } from "react";

function fmt(n: number): string {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

type MainTab = "sales" | "expenses";
type ExpenseSub = "general" | "feed";

interface SaleRecord {
  id: string;
  date: string;
  product: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  weight_kg?: number;
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
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (pageNum: number, reset: boolean) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: PAGE_SIZE.toString(),
        });
        const res = await fetch(`/api/farm/sales?${params}`);
        const d = await res.json();
        const allRecs: SaleRecord[] = d.data || [];

        // Filter client-side by date range
        const filtered = allRecs.filter((r) => {
          if (from && r.date < from) return false;
          if (to && r.date > to) return false;
          return true;
        });

        setRecords((prev) => (reset ? filtered : [...prev, ...filtered]));
        setHasMore(allRecs.length === PAGE_SIZE);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    },
    [from, to]
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
              {fmt(s.unit_price)}/unit
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
            <span
              className="text-xs rounded-full px-2 py-0.5 capitalize"
              style={{ backgroundColor: "rgba(245,200,66,0.15)", color: "#715800" }}
            >
              {s.payment_method}
            </span>
          </div>
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
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(
    async (pageNum: number, reset: boolean) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: PAGE_SIZE.toString(),
        });
        const res = await fetch(`/api/farm/expenses?${params}`);
        const d = await res.json();
        const allRecs: ExpenseRecord[] = d.data || [];
        const filtered = allRecs.filter((r) => {
          if (from && r.date < from) return false;
          if (to && r.date > to) return false;
          return true;
        });
        setRecords((prev) => (reset ? filtered : [...prev, ...filtered]));
        setHasMore(allRecs.length === PAGE_SIZE);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    },
    [from, to]
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
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(
    async (pageNum: number, reset: boolean) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: PAGE_SIZE.toString(),
        });
        const res = await fetch(`/api/farm/feed-purchases?${params}`);
        const d = await res.json();
        const allRecs: FeedRecord[] = d.data || [];
        const filtered = allRecs.filter((r) => {
          if (from && r.date < from) return false;
          if (to && r.date > to) return false;
          return true;
        });
        setRecords((prev) => (reset ? filtered : [...prev, ...filtered]));
        setHasMore(allRecs.length === PAGE_SIZE);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    },
    [from, to]
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

export default function RecordsPage() {
  const [mainTab, setMainTab] = useState<MainTab>("sales");
  const [expenseSub, setExpenseSub] = useState<ExpenseSub>("general");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f4fbf8" }}>
      {/* Forest Green Header */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: "linear-gradient(160deg, #1b4332 0%, #012d1d 100%)",
          paddingBottom: "16px",
        }}
      >
        <div className="px-5 pt-10 pb-2">
          <h1 className="text-lg font-bold text-white text-center">Past Records</h1>
        </div>

        {/* Main tab switcher */}
        <div className="px-4 mt-3">
          <div
            className="flex rounded-2xl p-1"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            {(["sales", "expenses"] as MainTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all"
                style={
                  mainTab === tab
                    ? { backgroundColor: "#ffffff", color: "#1b4332" }
                    : { color: "rgba(255,255,255,0.6)" }
                }
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Expense sub-tabs */}
        {mainTab === "expenses" && (
          <div className="flex px-4 pt-2 gap-2">
            {(["general", "feed"] as ExpenseSub[]).map((sub) => (
              <button
                key={sub}
                onClick={() => setExpenseSub(sub)}
                className="flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all"
                style={
                  expenseSub === sub
                    ? { backgroundColor: "#F5C842", color: "#012d1d" }
                    : { backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
                }
              >
                {sub === "general" ? "General" : "Feed Purchases"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content area with rounded top */}
      <div
        style={{
          backgroundColor: "#f4fbf8",
          borderRadius: "28px 28px 0 0",
          marginTop: "-12px",
          minHeight: "100vh",
        }}
      >
        <DateFilterBar
          from={fromDate}
          to={toDate}
          onFrom={setFromDate}
          onTo={setToDate}
        />

        <div className="mt-3">
          {mainTab === "sales" && <SalesTab from={fromDate} to={toDate} />}
          {mainTab === "expenses" && expenseSub === "general" && (
            <GeneralExpensesTab from={fromDate} to={toDate} />
          )}
          {mainTab === "expenses" && expenseSub === "feed" && (
            <FeedTab from={fromDate} to={toDate} />
          )}
        </div>
      </div>
    </div>
  );
}
