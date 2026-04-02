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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(1,45,29,0.9)" }}
    >
      <div
        className="w-full max-w-lg p-6"
        style={{ backgroundColor: "#ffffff", borderRadius: "28px 28px 0 0" }}
      >
        <div className="flex justify-center mb-4">
          <div className="rounded-full p-4" style={{ backgroundColor: "rgba(245,200,66,0.15)" }}>
            <AlertTriangle className="h-10 w-10" style={{ color: "#F5C842" }} />
          </div>
        </div>
        <h2 className="text-xl font-bold text-center mb-3" style={{ color: "#161d1b" }}>
          Important Notice
        </h2>
        <p className="text-center mb-6" style={{ color: "#6b7280" }}>
          Records you submit cannot be edited or deleted. Please review all entries carefully before saving.
        </p>
        <button
          onClick={onContinue}
          className="w-full rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#11d469", color: "#012d1d", height: "56px" }}
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(1,45,29,0.9)" }}
    >
      <div
        className="w-full max-w-lg p-6"
        style={{ backgroundColor: "#ffffff", borderRadius: "28px 28px 0 0" }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: "#161d1b" }}>
          Confirm Submission
        </h2>
        <div
          className="rounded-2xl p-4 mb-4 space-y-2"
          style={{ backgroundColor: "#eef5f2" }}
        >
          <div className="flex justify-between text-sm">
            <span style={{ color: "#6b7280" }}>
              General Expenses ({expenseRows.filter((r) => parseFloat(r.amount) > 0).length})
            </span>
            <span className="font-semibold" style={{ color: "#161d1b" }}>
              {fmt(totalExpenses)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#6b7280" }}>
              Feed Purchases ({feedRows.filter((r) => parseFloat(r.cost) > 0).length})
            </span>
            <span className="font-semibold" style={{ color: "#161d1b" }}>
              {fmt(totalFeed)}
            </span>
          </div>
          <div
            className="border-t pt-2"
            style={{ borderColor: "rgba(27,67,50,0.1)" }}
          >
            <div className="flex justify-between font-bold">
              <span style={{ color: "#161d1b" }}>Total Spent</span>
              <span style={{ color: "#ba1a1a" }}>{fmt(totalSpent)}</span>
            </div>
            {closing !== null && (
              <div className="flex justify-between font-bold mt-1">
                <span style={{ color: "#161d1b" }}>Closing Balance</span>
                <span style={{ color: closing >= 0 ? "#11d469" : "#ba1a1a" }}>
                  {closing < 0 ? "-" : ""}
                  {fmt(closing)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              backgroundColor: "#11d469",
              color: "#012d1d",
              height: "56px",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {isSubmitting ? "Submitting..." : "Confirm & Submit"}
          </button>
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="w-full rounded-2xl font-semibold text-base transition-all"
            style={{ backgroundColor: "#eef5f2", color: "#6b7280", height: "56px" }}
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
      style={{ backgroundColor: "#f4fbf8" }}
    >
      <div className="rounded-full p-6 mb-6" style={{ backgroundColor: "rgba(17,212,105,0.15)" }}>
        <CheckCircle className="h-16 w-16" style={{ color: "#11d469" }} />
      </div>
      <h2 className="text-3xl font-bold mb-2" style={{ color: "#161d1b" }}>
        Saved!
      </h2>
      <p className="text-center mb-8" style={{ color: "#6b7280" }}>
        All expenses recorded successfully.
      </p>
      <button
        onClick={onHome}
        className="w-full max-w-sm rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
        style={{ backgroundColor: "#11d469", color: "#012d1d", height: "56px" }}
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
      style={{
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 12px rgba(27,67,50,0.06)",
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
          Expense {index + 1}
        </span>
        {canDelete && (
          <button
            onClick={() => onDelete(row.id)}
            className="p-2 rounded-xl transition-all active:scale-90"
            style={{ color: "#ba1a1a" }}
            aria-label="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-2" style={{ color: "#6b7280" }}>
          Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c.value}
              onClick={() => onUpdate(row.id, { category: c.value })}
              className="rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95"
              style={
                row.category === c.value
                  ? { backgroundColor: "#F5C842", color: "#012d1d" }
                  : { backgroundColor: "#eef5f2", color: "#6b7280" }
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
          Amount (₦) <span style={{ color: "#ba1a1a" }}>*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={row.amount}
          onChange={(e) => onUpdate(row.id, { amount: e.target.value })}
          placeholder="0"
          className="w-full rounded-xl px-4 outline-none transition-all"
          style={{
            backgroundColor: "#eef5f2",
            height: "52px",
            fontSize: "18px",
            color: "#161d1b",
            border: "none",
          }}
        />
      </div>

      {/* Paid To */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
          Paid To (optional)
        </label>
        <input
          type="text"
          value={row.paid_to}
          onChange={(e) => onUpdate(row.id, { paid_to: e.target.value })}
          placeholder="Name or vendor"
          className="w-full rounded-xl px-4 outline-none transition-all"
          style={{
            backgroundColor: "#eef5f2",
            height: "52px",
            fontSize: "16px",
            color: "#161d1b",
            border: "none",
          }}
        />
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
          Payment Method
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["cash", "transfer"] as Payment[]).map((pm) => (
            <button
              key={pm}
              onClick={() => onUpdate(row.id, { payment_method: pm })}
              className="rounded-xl py-3 text-sm font-semibold transition-all active:scale-95"
              style={
                row.payment_method === pm
                  ? pm === "cash"
                    ? { backgroundColor: "#F5C842", color: "#012d1d" }
                    : { backgroundColor: "#1b4332", color: "#ffffff" }
                  : { backgroundColor: "#eef5f2", color: "#6b7280" }
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
      style={{
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 12px rgba(27,67,50,0.06)",
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
          Feed {index + 1}
        </span>
        {canDelete && (
          <button
            onClick={() => onDelete(row.id)}
            className="p-2 rounded-xl transition-all active:scale-90"
            style={{ color: "#ba1a1a" }}
            aria-label="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Feed Type */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
          Feed Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["fish", "goat"] as FeedType[]).map((ft) => (
            <button
              key={ft}
              onClick={() => onUpdate(row.id, { feed_type: ft })}
              className="rounded-xl py-3 text-sm font-semibold capitalize transition-all active:scale-95"
              style={
                row.feed_type === ft
                  ? { backgroundColor: "#11d469", color: "#012d1d" }
                  : { backgroundColor: "#eef5f2", color: "#6b7280" }
              }
            >
              {ft} Feed
            </button>
          ))}
        </div>
      </div>

      {/* Source */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
          Source
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["local", "foreign"] as FeedSource[]).map((fs) => (
            <button
              key={fs}
              onClick={() => onUpdate(row.id, { feed_source: fs })}
              className="rounded-xl py-3 text-sm font-semibold capitalize transition-all active:scale-95"
              style={
                row.feed_source === fs
                  ? fs === "local"
                    ? { backgroundColor: "#1b4332", color: "#ffffff" }
                    : { backgroundColor: "#F5C842", color: "#012d1d" }
                  : { backgroundColor: "#eef5f2", color: "#6b7280" }
              }
            >
              {fs}
            </button>
          ))}
        </div>
      </div>

      {/* Weight unit badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: "#6b7280" }}>
          Weight Unit:
        </span>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ backgroundColor: "#eef5f2", color: "#2d6a4f" }}
        >
          {weightUnit}
        </span>
      </div>

      {/* Weight Amount */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
          Weight ({weightUnit}) <span style={{ color: "#ba1a1a" }}>*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={row.weight_amount}
          onChange={(e) => onUpdate(row.id, { weight_amount: e.target.value })}
          placeholder="0"
          className="w-full rounded-xl px-4 outline-none transition-all"
          style={{
            backgroundColor: "#eef5f2",
            height: "52px",
            fontSize: "18px",
            color: "#161d1b",
            border: "none",
          }}
        />
      </div>

      {/* Num Bags */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
          No. of Bags <span style={{ color: "#ba1a1a" }}>*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={row.num_bags}
          onChange={(e) => onUpdate(row.id, { num_bags: e.target.value })}
          placeholder="0"
          className="w-full rounded-xl px-4 outline-none transition-all"
          style={{
            backgroundColor: "#eef5f2",
            height: "52px",
            fontSize: "18px",
            color: "#161d1b",
            border: "none",
          }}
        />
      </div>

      {/* Cost */}
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
          Cost (₦) <span style={{ color: "#ba1a1a" }}>*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={row.cost}
          onChange={(e) => onUpdate(row.id, { cost: e.target.value })}
          placeholder="0"
          className="w-full rounded-xl px-4 outline-none transition-all"
          style={{
            backgroundColor: "#eef5f2",
            height: "52px",
            fontSize: "18px",
            color: "#161d1b",
            border: "none",
          }}
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
  const [summaryExpanded, setSummaryExpanded] = useState(false);

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
    ])
      .then(([expData, feedData]) => {
        setSavedExpenses(expData.data || []);
        setSavedFeed(feedData.data || []);
      })
      .catch(() => {});
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
    <div className="max-w-2xl mx-auto">
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

      {/* Balance summary card */}
      <div
        className="mb-4 rounded-2xl p-4"
        style={{ backgroundColor: "#fff", border: "1px solid rgba(27,67,50,0.08)" }}
      >
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>
          Opening Balance
        </p>
        {balanceErr ? (
          <p className="text-sm" style={{ color: "#6b7280" }}>Balance unavailable</p>
        ) : openingBalance === null ? (
          <div className="h-8 w-32 rounded-lg animate-pulse" style={{ backgroundColor: "#e8efec" }} />
        ) : openingBalance <= 0 ? (
          <p className="text-2xl font-bold" style={{ color: "#ef4444" }}>{fmt(openingBalance)}</p>
        ) : (
          <p className="text-2xl font-bold" style={{ color: "#1b4332" }}>{fmt(openingBalance)}</p>
        )}
        {openingBalance !== null && (
          <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid #f0f0f0" }}>
            <span className="text-sm" style={{ color: "#6b7280" }}>Spent: {fmt(totalSpent)}</span>
            <span
              className="text-sm font-bold"
              style={{ color: closingBalance !== null && closingBalance >= 0 ? "#16a34a" : "#ef4444" }}
            >
              Remaining: {closingBalance !== null ? (closingBalance < 0 ? "-" : "") + fmt(closingBalance) : "--"}
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="pb-36">
        {/* Section A: General Expenses */}
        <div className="mb-6">
          <div className="flex items-center justify-start mb-3">
            <span
              className="rounded-full px-4 py-1.5 text-[11px] uppercase font-bold tracking-wide"
              style={{ backgroundColor: "#eef5f2", color: "#2d6a4f" }}
            >
              General Expenses
            </span>
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
            className="w-full rounded-2xl flex items-center justify-center gap-2 font-semibold transition-all active:scale-[0.98]"
            style={{
              border: "2px dashed rgba(45,106,79,0.3)",
              color: "#2d6a4f",
              backgroundColor: "transparent",
              height: "56px",
            }}
          >
            <Plus className="h-5 w-5" />
            Add General Expense
          </button>
        </div>

        {/* Section B: Feed Purchases */}
        <div className="mb-6">
          <div className="flex items-center justify-start mb-3">
            <span
              className="rounded-full px-4 py-1.5 text-[11px] uppercase font-bold tracking-wide"
              style={{ backgroundColor: "#fffbeb", color: "#715800" }}
            >
              Feed Purchases
            </span>
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
            className="w-full rounded-2xl flex items-center justify-center gap-2 font-semibold transition-all active:scale-[0.98]"
            style={{
              border: "2px dashed rgba(45,106,79,0.3)",
              color: "#2d6a4f",
              backgroundColor: "transparent",
              height: "56px",
            }}
          >
            <Plus className="h-5 w-5" />
            Add Feed Purchase
          </button>
        </div>

        {/* Previously saved today */}
        {(savedExpenses.length > 0 || savedFeed.length > 0) && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "#ffffff",
              boxShadow: "0 4px 12px rgba(27,67,50,0.06)",
            }}
          >
            <button
              onClick={() => setShowPast((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ color: "#6b7280" }}
            >
              <span className="text-sm font-semibold">
                Previously saved today ({savedExpenses.length + savedFeed.length})
              </span>
              {showPast ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showPast && (
              <div className="px-4 pb-4 space-y-2">
                {savedExpenses.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-xl p-3"
                    style={{ backgroundColor: "#eef5f2" }}
                  >
                    <div className="flex justify-between">
                      <span className="text-sm font-medium capitalize" style={{ color: "#161d1b" }}>
                        {e.category}
                      </span>
                      <span className="text-sm font-bold" style={{ color: "#F5C842" }}>
                        {fmt(e.amount)}
                      </span>
                    </div>
                    {e.paid_to && (
                      <p className="text-xs" style={{ color: "#6b7280" }}>
                        To: {e.paid_to}
                      </p>
                    )}
                  </div>
                ))}
                {savedFeed.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-xl p-3"
                    style={{ backgroundColor: "#eef5f2" }}
                  >
                    <div className="flex justify-between">
                      <span className="text-sm font-medium capitalize" style={{ color: "#161d1b" }}>
                        {f.feed_type} Feed ({f.feed_source})
                      </span>
                      <span className="text-sm font-bold" style={{ color: "#11d469" }}>
                        {fmt(f.cost)}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "#6b7280" }}>
                      {f.weight_amount} · {f.num_bags} bags
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collapsible Summary Bar */}
      <div
        className="fixed bottom-0 left-0 lg:left-64 right-0"
        style={{
          backgroundColor: "rgba(1,45,29,0.97)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "20px 20px 0 0",
        }}
      >
        {/* Pull handle — tapping toggles expanded/collapsed */}
        <button
          onClick={() => setSummaryExpanded((v) => !v)}
          className="w-full flex flex-col items-center pt-2 pb-1"
          aria-label={summaryExpanded ? "Collapse summary" : "Expand summary"}
        >
          <div
            className="rounded-full"
            style={{ width: "36px", height: "4px", backgroundColor: "rgba(255,255,255,0.25)" }}
          />
        </button>

        {/* EXPANDED — full breakdown */}
        {summaryExpanded && (
          <div className="px-5 pt-1 pb-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span style={{ color: "rgba(255,255,255,0.55)" }}>General Expenses</span>
              <span className="text-white font-medium">{fmt(totalExpenses)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "rgba(255,255,255,0.55)" }}>Feed Purchases</span>
              <span className="text-white font-medium">{fmt(totalFeed)}</span>
            </div>
            <div
              className="flex justify-between font-bold pt-2 border-t"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
            >
              <span className="text-white">Total Spent</span>
              <span style={{ color: totalSpent > 0 ? "#ef4444" : "rgba(255,255,255,0.6)" }}>
                {fmt(totalSpent)}
              </span>
            </div>
            {closingBalance !== null && (
              <div className="flex justify-between font-bold">
                <span className="text-white">Closing Balance</span>
                <span
                  className="text-xl font-bold"
                  style={{ color: closingBalance >= 0 ? "#11d469" : "#ef4444" }}
                >
                  {closingBalance < 0 ? "-" : ""}
                  {fmt(closingBalance)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* COLLAPSED — single summary line */}
        {!summaryExpanded && (
          <button
            onClick={() => setSummaryExpanded(true)}
            className="w-full flex items-center justify-between px-5 py-2"
          >
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              Spent{" "}
              <span className="font-bold text-white">{fmt(totalSpent)}</span>
              {closingBalance !== null && (
                <>
                  {" · "}Closing{" "}
                  <span
                    className="font-bold"
                    style={{ color: closingBalance >= 0 ? "#11d469" : "#ef4444" }}
                  >
                    {closingBalance < 0 ? "-" : ""}
                    {fmt(closingBalance)}
                  </span>
                </>
              )}
            </span>
            <ChevronUp className="h-4 w-4 ml-2 flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
          </button>
        )}

        {/* Bottom row — always visible: full Save button (expanded) or compact Save (collapsed) */}
        <div className="px-5 pb-6 pt-1">
          {summaryExpanded ? (
            <button
              disabled={!hasAnything}
              onClick={() => setShowConfirm(true)}
              className="w-full rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
              style={{
                backgroundColor: "#11d469",
                color: "#012d1d",
                height: "56px",
                opacity: hasAnything ? 1 : 0.3,
              }}
            >
              Save All Expenses
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSummaryExpanded(true)}
                className="flex-1 rounded-2xl font-medium text-sm transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.7)",
                  height: "48px",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                View Breakdown
              </button>
              <button
                disabled={!hasAnything}
                onClick={() => setShowConfirm(true)}
                className="rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: "#11d469",
                  color: "#012d1d",
                  height: "48px",
                  paddingLeft: "24px",
                  paddingRight: "24px",
                  opacity: hasAnything ? 1 : 0.3,
                  flexShrink: 0,
                }}
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
