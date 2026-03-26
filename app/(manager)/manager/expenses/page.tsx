"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

function fmt(n: number): string {
  return `₦${Math.round(Math.abs(n)).toLocaleString("en-NG")}`;
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

type ExpenseCategory = "labor" | "utilities" | "veterinary" | "transport" | "equipment";
type Payment = "cash" | "transfer";
type FeedType = "fish" | "goat";
type FeedSource = "local" | "foreign";

interface ExpenseRow {
  id: string;
  category: ExpenseCategory;
  amount: string;
  paid_to: string;
  payment_method: Payment;
}

interface FeedRow {
  id: string;
  feed_type: FeedType;
  feed_source: FeedSource;
  weight_amount: string;
  num_bags: string;
  cost: string;
}

function newExpenseRow(): ExpenseRow {
  return {
    id: Math.random().toString(36).slice(2),
    category: "labor",
    amount: "",
    paid_to: "",
    payment_method: "cash",
  };
}

function newFeedRow(): FeedRow {
  return {
    id: Math.random().toString(36).slice(2),
    feed_type: "fish",
    feed_source: "local",
    weight_amount: "",
    num_bags: "",
    cost: "",
  };
}

// ── Warning Modal ──
function WarningModal({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
      <div
        className="w-full max-w-lg rounded-t-3xl p-6"
        style={{ backgroundColor: "#112240" }}
      >
        <div className="flex justify-center mb-4">
          <div className="rounded-full p-4" style={{ backgroundColor: "rgba(245,200,66,0.15)" }}>
            <AlertTriangle className="h-10 w-10" style={{ color: "#F5C842" }} />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white text-center mb-3">Important Notice</h2>
        <p className="text-center mb-6" style={{ color: "#94a3b8" }}>
          Records you submit cannot be edited or deleted. Please review all entries carefully before saving.
        </p>
        <button
          onClick={onContinue}
          className="w-full rounded-2xl py-4 text-lg font-bold"
          style={{ backgroundColor: "#11d469", color: "#0A1628" }}
        >
          I Understand, Continue
        </button>
      </div>
    </div>
  );
}

// ── Confirm Sheet ──
function ConfirmSheet({
  expenseRows,
  feedRows,
  totalExpenses,
  totalFeed,
  openingBalance,
  onConfirm,
  onBack,
  isSubmitting,
}: {
  expenseRows: ExpenseRow[];
  feedRows: FeedRow[];
  totalExpenses: number;
  totalFeed: number;
  openingBalance: number | null;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const totalSpent = totalExpenses + totalFeed;
  const closing = openingBalance !== null ? openingBalance - totalSpent : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
      <div
        className="w-full max-w-lg rounded-t-3xl p-6"
        style={{ backgroundColor: "#112240" }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Confirm Submission</h2>
        <div
          className="rounded-xl p-4 mb-4 space-y-2"
          style={{ backgroundColor: "#0A1628" }}
        >
          <div className="flex justify-between text-sm">
            <span style={{ color: "#94a3b8" }}>General Expenses ({expenseRows.filter(r => parseFloat(r.amount) > 0).length})</span>
            <span className="text-white font-semibold">{fmt(totalExpenses)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#94a3b8" }}>Feed Purchases ({feedRows.filter(r => parseFloat(r.cost) > 0).length})</span>
            <span className="text-white font-semibold">{fmt(totalFeed)}</span>
          </div>
          <div className="border-t pt-2" style={{ borderColor: "#1e3a5f" }}>
            <div className="flex justify-between font-bold">
              <span className="text-white">Total Spent</span>
              <span style={{ color: "#ef4444" }}>{fmt(totalSpent)}</span>
            </div>
            {closing !== null && (
              <div className="flex justify-between font-bold mt-1">
                <span className="text-white">Closing Balance</span>
                <span style={{ color: closing >= 0 ? "#11d469" : "#ef4444" }}>{closing < 0 ? "-" : ""}{fmt(closing)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full rounded-2xl py-4 text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: "#11d469", color: "#0A1628" }}
          >
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {isSubmitting ? "Submitting..." : "Confirm & Submit"}
          </button>
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="w-full rounded-2xl py-4 text-lg font-semibold"
            style={{ backgroundColor: "transparent", border: "1px solid #1e3a5f", color: "#94a3b8" }}
          >
            Go Back &amp; Review
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success Screen ──
function SuccessScreen({ onHome }: { onHome: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#0A1628" }}
    >
      <div className="rounded-full p-6 mb-6" style={{ backgroundColor: "rgba(17,212,105,0.15)" }}>
        <CheckCircle className="h-16 w-16" style={{ color: "#11d469" }} />
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">Saved!</h2>
      <p className="text-center mb-8" style={{ color: "#94a3b8" }}>
        All expenses recorded successfully.
      </p>
      <button
        onClick={onHome}
        className="w-full max-w-sm rounded-2xl py-4 text-lg font-bold"
        style={{ backgroundColor: "#11d469", color: "#0A1628" }}
      >
        Back to Home
      </button>
    </div>
  );
}

// ── Expense Row Card ──
function ExpenseRowCard({
  row,
  onUpdate,
  onDelete,
  canDelete,
  index,
}: {
  row: ExpenseRow;
  onUpdate: (id: string, u: Partial<ExpenseRow>) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  index: number;
}) {
  const cats: { value: ExpenseCategory; label: string }[] = [
    { value: "labor", label: "Labor" },
    { value: "transport", label: "Transport" },
    { value: "utilities", label: "Utilities" },
    { value: "veterinary", label: "Veterinary" },
    { value: "equipment", label: "Equipment" },
  ];

  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{ backgroundColor: "#112240", border: "1px solid #1e3a5f" }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold" style={{ color: "#94a3b8" }}>Expense {index + 1}</span>
        {canDelete && (
          <button onClick={() => onDelete(row.id)} className="p-2" style={{ color: "#ef4444" }} aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>Category</label>
        <div className="flex flex-wrap gap-1">
          {cats.map((c) => (
            <button
              key={c.value}
              onClick={() => onUpdate(row.id, { category: c.value })}
              className="rounded-xl px-3 py-2 text-xs font-semibold transition-all"
              style={
                row.category === c.value
                  ? { backgroundColor: "#F5C842", color: "#0A1628" }
                  : { backgroundColor: "#0A1628", color: "#94a3b8", border: "1px solid #1e3a5f" }
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>
          Amount (₦) <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={row.amount}
          onChange={(e) => onUpdate(row.id, { amount: e.target.value })}
          placeholder="0"
          className="w-full rounded-xl px-4 text-white placeholder-gray-500 outline-none"
          style={{ backgroundColor: "#0A1628", border: "1px solid #1e3a5f", height: "48px", fontSize: "18px" }}
        />
      </div>

      {/* Paid To */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>Paid To (optional)</label>
        <input
          type="text"
          value={row.paid_to}
          onChange={(e) => onUpdate(row.id, { paid_to: e.target.value })}
          placeholder="Name or vendor"
          className="w-full rounded-xl px-4 text-white placeholder-gray-500 outline-none"
          style={{ backgroundColor: "#0A1628", border: "1px solid #1e3a5f", height: "48px", fontSize: "16px" }}
        />
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>Payment Method</label>
        <div className="grid grid-cols-2 gap-2">
          {(["cash", "transfer"] as Payment[]).map((pm) => (
            <button
              key={pm}
              onClick={() => onUpdate(row.id, { payment_method: pm })}
              className="rounded-xl py-3 text-sm font-semibold transition-all"
              style={
                row.payment_method === pm
                  ? { backgroundColor: "#F5C842", color: "#0A1628" }
                  : { backgroundColor: "#0A1628", color: "#94a3b8", border: "1px solid #1e3a5f" }
              }
            >
              {pm === "cash" ? "Cash" : "Transfer"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Feed Row Card ──
function FeedRowCard({
  row,
  onUpdate,
  onDelete,
  canDelete,
  index,
}: {
  row: FeedRow;
  onUpdate: (id: string, u: Partial<FeedRow>) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  index: number;
}) {
  const weightUnit = row.feed_source === "local" ? "Tons" : "KG";

  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{ backgroundColor: "#112240", border: "1px solid #1e3a5f" }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold" style={{ color: "#94a3b8" }}>Feed {index + 1}</span>
        {canDelete && (
          <button onClick={() => onDelete(row.id)} className="p-2" style={{ color: "#ef4444" }} aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Feed Type */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>Feed Type</label>
        <div className="grid grid-cols-2 gap-2">
          {(["fish", "goat"] as FeedType[]).map((ft) => (
            <button
              key={ft}
              onClick={() => onUpdate(row.id, { feed_type: ft })}
              className="rounded-xl py-3 text-sm font-semibold capitalize transition-all"
              style={
                row.feed_type === ft
                  ? { backgroundColor: "#11d469", color: "#0A1628" }
                  : { backgroundColor: "#0A1628", color: "#94a3b8", border: "1px solid #1e3a5f" }
              }
            >
              {ft} Feed
            </button>
          ))}
        </div>
      </div>

      {/* Source */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>Source</label>
        <div className="grid grid-cols-2 gap-2">
          {(["local", "foreign"] as FeedSource[]).map((fs) => (
            <button
              key={fs}
              onClick={() => onUpdate(row.id, { feed_source: fs })}
              className="rounded-xl py-3 text-sm font-semibold capitalize transition-all"
              style={
                row.feed_source === fs
                  ? { backgroundColor: "#11d469", color: "#0A1628" }
                  : { backgroundColor: "#0A1628", color: "#94a3b8", border: "1px solid #1e3a5f" }
              }
            >
              {fs}
            </button>
          ))}
        </div>
      </div>

      {/* Weight unit badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: "#94a3b8" }}>Weight Unit:</span>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ backgroundColor: "rgba(17,212,105,0.15)", color: "#11d469" }}
        >
          {weightUnit}
        </span>
      </div>

      {/* Weight Amount */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>
          Weight ({weightUnit}) <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={row.weight_amount}
          onChange={(e) => onUpdate(row.id, { weight_amount: e.target.value })}
          placeholder="0"
          className="w-full rounded-xl px-4 text-white placeholder-gray-500 outline-none"
          style={{ backgroundColor: "#0A1628", border: "1px solid #1e3a5f", height: "48px", fontSize: "18px" }}
        />
      </div>

      {/* Num Bags */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>
          No. of Bags <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={row.num_bags}
          onChange={(e) => onUpdate(row.id, { num_bags: e.target.value })}
          placeholder="0"
          className="w-full rounded-xl px-4 text-white placeholder-gray-500 outline-none"
          style={{ backgroundColor: "#0A1628", border: "1px solid #1e3a5f", height: "48px", fontSize: "18px" }}
        />
      </div>

      {/* Cost */}
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>
          Cost (₦) <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={row.cost}
          onChange={(e) => onUpdate(row.id, { cost: e.target.value })}
          placeholder="0"
          className="w-full rounded-xl px-4 text-white placeholder-gray-500 outline-none"
          style={{ backgroundColor: "#0A1628", border: "1px solid #1e3a5f", height: "48px", fontSize: "18px" }}
        />
      </div>
    </div>
  );
}

export default function ExpensesDockerPage() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([newExpenseRow()]);
  const [feedRows, setFeedRows] = useState<FeedRow[]>([]);
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [balanceErr, setBalanceErr] = useState(false);
  const [savedExpenses, setSavedExpenses] = useState<{ id: string; category: string; amount: number; paid_to?: string; payment_method: string }[]>([]);
  const [savedFeed, setSavedFeed] = useState<{ id: string; feed_type: string; feed_source: string; weight_amount: number; num_bags: number; cost: number }[]>([]);
  const [showPast, setShowPast] = useState(false);

  const today = getTodayStr();

  useEffect(() => {
    if (!sessionStorage.getItem("expenses-warned")) {
      setShowWarning(true);
    }
  }, []);

  useEffect(() => {
    fetch(`/api/farm/balance?date=${today}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.opening_balance !== undefined) setOpeningBalance(d.opening_balance);
        else setBalanceErr(true);
      })
      .catch(() => setBalanceErr(true));

    // Load today's saved records
    Promise.all([
      fetch(`/api/farm/expenses?date=${today}&limit=50`).then((r) => r.json()),
      fetch(`/api/farm/feed-purchases?date=${today}&limit=50`).then((r) => r.json()),
    ]).then(([expData, feedData]) => {
      setSavedExpenses(expData.data || []);
      setSavedFeed(feedData.data || []);
    }).catch(() => {});
  }, [today]);

  const totalExpenses = expenseRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalFeed = feedRows.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0);
  const totalSpent = totalExpenses + totalFeed;
  const closingBalance = openingBalance !== null ? openingBalance - totalSpent : null;

  const updateExpense = useCallback((id: string, u: Partial<ExpenseRow>) => {
    setExpenseRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...u } : r)));
  }, []);
  const deleteExpense = useCallback((id: string) => {
    setExpenseRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);
  const updateFeed = useCallback((id: string, u: Partial<FeedRow>) => {
    setFeedRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...u } : r)));
  }, []);
  const deleteFeed = useCallback((id: string) => {
    setFeedRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const hasAnything =
    expenseRows.some((r) => parseFloat(r.amount) > 0) ||
    feedRows.some((r) => parseFloat(r.cost) > 0);

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const validExpenses = expenseRows.filter((r) => parseFloat(r.amount) > 0);
      const validFeed = feedRows.filter(
        (r) =>
          parseFloat(r.cost) > 0 &&
          parseFloat(r.weight_amount) > 0 &&
          parseInt(r.num_bags) > 0
      );

      const results: Promise<Response>[] = [];

      if (validExpenses.length > 0) {
        results.push(
          fetch("/api/farm/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              validExpenses.map((r) => ({
                category: r.category,
                amount: parseFloat(r.amount),
                paid_to: r.paid_to.trim() || null,
                payment_method: r.payment_method,
                date: today,
              }))
            ),
          })
        );
      }

      if (validFeed.length > 0) {
        results.push(
          fetch("/api/farm/feed-purchases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              validFeed.map((r) => ({
                feed_type: r.feed_type,
                feed_source: r.feed_source,
                weight_unit: r.feed_source === "local" ? "tons" : "kg",
                weight_amount: parseFloat(r.weight_amount),
                num_bags: parseInt(r.num_bags),
                cost: parseFloat(r.cost),
                date: today,
              }))
            ),
          })
        );
      }

      const responses = await Promise.all(results);
      const failed = responses.filter((r) => !r.ok);
      if (failed.length > 0) {
        throw new Error("Some records failed to save. Please retry.");
      }

      setShowConfirm(false);
      setShowSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save. Please try again.");
      setIsSubmitting(false);
    }
  }

  if (showSuccess) {
    return <SuccessScreen onHome={() => router.push("/")} />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1628" }}>
      {showWarning && (
        <WarningModal
          onContinue={() => {
            sessionStorage.setItem("expenses-warned", "1");
            setShowWarning(false);
          }}
        />
      )}

      {showConfirm && (
        <ConfirmSheet
          expenseRows={expenseRows}
          feedRows={feedRows}
          totalExpenses={totalExpenses}
          totalFeed={totalFeed}
          openingBalance={openingBalance}
          onConfirm={handleSubmit}
          onBack={() => setShowConfirm(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Balance Header */}
      <div
        className="sticky top-0 z-10 px-4 pt-4 pb-3"
        style={{ backgroundColor: "#0A1628", borderBottom: "1px solid #1e3a5f" }}
      >
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: "#112240" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#94a3b8" }}>
            Opening Balance
          </p>
          {balanceErr ? (
            <p style={{ color: "#94a3b8" }}>Balance unavailable</p>
          ) : openingBalance === null ? (
            <div className="h-8 w-32 rounded animate-pulse" style={{ backgroundColor: "#1e3a5f" }} />
          ) : openingBalance <= 0 ? (
            <div>
              <p className="text-2xl font-bold" style={{ color: "#ef4444" }}>{fmt(openingBalance)}</p>
              <p className="text-xs mt-1" style={{ color: "#ef4444" }}>No Funds Available</p>
            </div>
          ) : (
            <p className="text-2xl font-bold" style={{ color: "#11d469" }}>{fmt(openingBalance)}</p>
          )}
        </div>

        {/* Live deduction */}
        {openingBalance !== null && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: "#112240" }}>
              <p className="text-xs" style={{ color: "#94a3b8" }}>Total Spent</p>
              <p className="text-base font-bold" style={{ color: "#ef4444" }}>{fmt(totalSpent)}</p>
            </div>
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: "#112240" }}>
              <p className="text-xs" style={{ color: "#94a3b8" }}>Remaining</p>
              <p
                className="text-base font-bold"
                style={{ color: closingBalance !== null && closingBalance >= 0 ? "#11d469" : "#ef4444" }}
              >
                {closingBalance !== null ? (closingBalance < 0 ? "-" : "") + fmt(closingBalance) : "--"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-56">
        {/* Section A: General Expenses */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1" style={{ backgroundColor: "#1e3a5f" }} />
            <span
              className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ backgroundColor: "#F5C842", color: "#0A1628" }}
            >
              Section A — General Expenses
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: "#1e3a5f" }} />
          </div>

          {expenseRows.map((row, i) => (
            <ExpenseRowCard
              key={row.id}
              row={row}
              index={i}
              onUpdate={updateExpense}
              onDelete={deleteExpense}
              canDelete={expenseRows.length > 1}
            />
          ))}

          <button
            onClick={() => setExpenseRows((prev) => [...prev, newExpenseRow()])}
            className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold transition-all"
            style={{ border: "2px dashed #1e3a5f", color: "#94a3b8", backgroundColor: "transparent" }}
          >
            <Plus className="h-5 w-5" />
            Add General Expense
          </button>
        </div>

        {/* Section B: Feed Purchases */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1" style={{ backgroundColor: "#1e3a5f" }} />
            <span
              className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ backgroundColor: "#11d469", color: "#0A1628" }}
            >
              Section B — Feed Purchases
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: "#1e3a5f" }} />
          </div>

          {feedRows.map((row, i) => (
            <FeedRowCard
              key={row.id}
              row={row}
              index={i}
              onUpdate={updateFeed}
              onDelete={deleteFeed}
              canDelete={true}
            />
          ))}

          <button
            onClick={() => setFeedRows((prev) => [...prev, newFeedRow()])}
            className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-semibold transition-all"
            style={{ border: "2px dashed #1e3a5f", color: "#94a3b8", backgroundColor: "transparent" }}
          >
            <Plus className="h-5 w-5" />
            Add Feed Purchase
          </button>
        </div>

        {/* Previously saved today */}
        {(savedExpenses.length > 0 || savedFeed.length > 0) && (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#112240", border: "1px solid #1e3a5f" }}>
            <button
              onClick={() => setShowPast((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ color: "#94a3b8" }}
            >
              <span className="text-sm font-semibold">
                Previously saved today ({savedExpenses.length + savedFeed.length})
              </span>
              {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showPast && (
              <div className="px-4 pb-4 space-y-2">
                {savedExpenses.map((e) => (
                  <div key={e.id} className="rounded-xl p-3" style={{ backgroundColor: "#0A1628" }}>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium capitalize text-white">{e.category}</span>
                      <span className="text-sm font-bold" style={{ color: "#F5C842" }}>{fmt(e.amount)}</span>
                    </div>
                    {e.paid_to && (
                      <p className="text-xs" style={{ color: "#94a3b8" }}>To: {e.paid_to}</p>
                    )}
                  </div>
                ))}
                {savedFeed.map((f) => (
                  <div key={f.id} className="rounded-xl p-3" style={{ backgroundColor: "#0A1628" }}>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium capitalize text-white">{f.feed_type} Feed ({f.feed_source})</span>
                      <span className="text-sm font-bold" style={{ color: "#11d469" }}>{fmt(f.cost)}</span>
                    </div>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>
                      {f.weight_amount} · {f.num_bags} bags
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-4"
        style={{ backgroundColor: "#0A1628", borderTop: "1px solid #1e3a5f" }}
      >
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-sm">
            <span style={{ color: "#94a3b8" }}>General Expenses</span>
            <span className="text-white">{fmt(totalExpenses)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#94a3b8" }}>Feed Purchases</span>
            <span className="text-white">{fmt(totalFeed)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t" style={{ borderColor: "#1e3a5f" }}>
            <span className="text-white">Total Spent</span>
            <span style={{ color: "#ef4444" }}>{fmt(totalSpent)}</span>
          </div>
          {closingBalance !== null && (
            <div className="flex justify-between font-bold text-lg">
              <span className="text-white">Closing Balance</span>
              <span style={{ color: closingBalance >= 0 ? "#11d469" : "#ef4444" }}>
                {closingBalance < 0 ? "-" : ""}{fmt(closingBalance)}
              </span>
            </div>
          )}
        </div>
        <button
          disabled={!hasAnything}
          onClick={() => setShowConfirm(true)}
          className="w-full rounded-2xl py-4 text-lg font-bold disabled:opacity-40 transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#11d469", color: "#0A1628" }}
        >
          Save All Expenses
        </button>
      </div>
    </div>
  );
}
