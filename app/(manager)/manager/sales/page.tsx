"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

function fmt(n: number): string {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type Product = "catfish" | "goat" | "chicken" | "other";
type Payment = "cash" | "transfer";

interface SaleRow {
  id: string;
  product: Product;
  quantity: string;
  unit_price: string;
  weight_kg: string;
  gender: "male" | "female" | "";
  other_product_name: string;
  customer_name: string;
  payment_method: Payment;
}

interface SavedSale {
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

function newRow(): SaleRow {
  return {
    id: Math.random().toString(36).slice(2),
    product: "catfish",
    quantity: "",
    unit_price: "",
    weight_kg: "",
    gender: "",
    other_product_name: "",
    customer_name: "",
    payment_method: "cash",
  };
}

function rowTotal(row: SaleRow): number {
  const q = parseFloat(row.quantity) || 0;
  const p = parseFloat(row.unit_price) || 0;
  return q * p;
}

function isRowComplete(row: SaleRow): boolean {
  const q = parseFloat(row.quantity);
  const p = parseFloat(row.unit_price);
  if (!q || !p || q <= 0 || p <= 0) return false;
  if (row.product === "other" && !row.other_product_name.trim()) return false;
  return true;
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
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "28px 28px 0 0",
        }}
      >
        <div className="flex justify-center mb-4">
          <div
            className="rounded-full p-4"
            style={{ backgroundColor: "rgba(245,200,66,0.15)" }}
          >
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
          style={{
            backgroundColor: "#11d469",
            color: "#012d1d",
            height: "56px",
          }}
        >
          I Understand, Continue
        </button>
      </div>
    </div>
  );
}

// ── Confirm Sheet ──
function ConfirmSheet({
  rows,
  grandTotal,
  onConfirm,
  onBack,
  isSubmitting,
}: {
  rows: SaleRow[];
  grandTotal: number;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const completeRows = rows.filter(isRowComplete);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(1,45,29,0.9)" }}
    >
      <div
        className="w-full max-w-lg p-6"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "28px 28px 0 0",
        }}
      >
        <h2 className="text-xl font-bold mb-2" style={{ color: "#161d1b" }}>
          Confirm Submission
        </h2>
        <p className="mb-4" style={{ color: "#6b7280" }}>
          You are about to save{" "}
          <strong style={{ color: "#161d1b" }}>{completeRows.length}</strong> sale
          record{completeRows.length !== 1 ? "s" : ""}.
        </p>
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ backgroundColor: "#eef5f2" }}
        >
          <div className="flex justify-between font-bold text-xl">
            <span style={{ color: "#161d1b" }}>Grand Total</span>
            <span style={{ color: "#11d469" }}>{fmt(grandTotal)}</span>
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
            style={{
              backgroundColor: "#eef5f2",
              color: "#6b7280",
              height: "56px",
            }}
          >
            Go Back &amp; Review
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success Screen ──
function SuccessScreen({
  count,
  total,
  onHome,
}: {
  count: number;
  total: number;
  onHome: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#f4fbf8" }}
    >
      <div
        className="rounded-full p-6 mb-6"
        style={{ backgroundColor: "rgba(17,212,105,0.15)" }}
      >
        <CheckCircle className="h-16 w-16" style={{ color: "#11d469" }} />
      </div>
      <h2 className="text-3xl font-bold mb-2" style={{ color: "#161d1b" }}>
        Saved!
      </h2>
      <p className="text-center mb-2" style={{ color: "#6b7280" }}>
        {count} record{count !== 1 ? "s" : ""} saved successfully.
      </p>
      <p className="text-2xl font-bold mb-8" style={{ color: "#11d469" }}>
        {fmt(total)}
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

// ── Row Card ──
function SaleRowCard({
  row,
  index,
  onUpdate,
  onDelete,
  canDelete,
}: {
  row: SaleRow;
  index: number;
  onUpdate: (id: string, updates: Partial<SaleRow>) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const total = rowTotal(row);

  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 12px rgba(27,67,50,0.06)",
      }}
    >
      {/* Row header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "#6b7280" }}
        >
          Item {index + 1}
        </span>
        {canDelete && (
          <button
            onClick={() => onDelete(row.id)}
            className="rounded-xl p-2 transition-all active:scale-90"
            style={{ color: "#ba1a1a" }}
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Product */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-2" style={{ color: "#6b7280" }}>
          Product
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {(["catfish", "goat", "chicken", "other"] as Product[]).map((p) => (
            <button
              key={p}
              onClick={() => onUpdate(row.id, { product: p })}
              className="rounded-xl py-2 text-xs font-semibold capitalize transition-all active:scale-95"
              style={
                row.product === p
                  ? { backgroundColor: "#11d469", color: "#012d1d" }
                  : { backgroundColor: "#eef5f2", color: "#6b7280" }
              }
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Other product name */}
      {row.product === "other" && (
        <div className="mb-3">
          <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
            Product Name <span style={{ color: "#ba1a1a" }}>*</span>
          </label>
          <input
            type="text"
            value={row.other_product_name}
            onChange={(e) => onUpdate(row.id, { other_product_name: e.target.value })}
            placeholder="Enter product name"
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
      )}

      {/* Quantity + Weight (catfish) */}
      <div className={`grid gap-3 mb-3 ${row.product === "catfish" ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
            Quantity <span style={{ color: "#ba1a1a" }}>*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={row.quantity}
            onChange={(e) => onUpdate(row.id, { quantity: e.target.value })}
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
        {row.product === "catfish" && (
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
              Weight (kg)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={row.weight_kg}
              onChange={(e) => onUpdate(row.id, { weight_kg: e.target.value })}
              placeholder="0.0"
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
        )}
      </div>

      {/* Gender (goat) */}
      {row.product === "goat" && (
        <div className="mb-3">
          <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
            Gender
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["male", "female"] as const).map((g) => (
              <button
                key={g}
                onClick={() => onUpdate(row.id, { gender: g })}
                className="rounded-xl py-3 text-sm font-semibold capitalize transition-all active:scale-95"
                style={
                  row.gender === g
                    ? { backgroundColor: "#11d469", color: "#012d1d" }
                    : { backgroundColor: "#eef5f2", color: "#6b7280" }
                }
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unit Price */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
          Unit Price (₦) <span style={{ color: "#ba1a1a" }}>*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={row.unit_price}
          onChange={(e) => onUpdate(row.id, { unit_price: e.target.value })}
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

      {/* Total (locked) */}
      <div
        className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between"
        style={{ backgroundColor: "rgba(17,212,105,0.08)" }}
      >
        <span className="text-xs font-semibold" style={{ color: "#6b7280" }}>
          Row Total
        </span>
        <span className="text-xl font-bold" style={{ color: "#11d469" }}>
          {fmt(total)}
        </span>
      </div>

      {/* Customer Name */}
      <div className="mb-3">
        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
          Customer Name (optional)
        </label>
        <input
          type="text"
          value={row.customer_name}
          onChange={(e) => onUpdate(row.id, { customer_name: e.target.value })}
          placeholder="Enter customer name"
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
              className="rounded-xl py-3 text-sm font-semibold capitalize transition-all active:scale-95"
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

export default function SalesDockerPage() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rows, setRows] = useState<SaleRow[]>([newRow()]);
  const [savedToday, setSavedToday] = useState<SavedSale[]>([]);
  const [showPastRecords, setShowPastRecords] = useState(false);
  const [successData, setSuccessData] = useState({ count: 0, total: 0 });

  const today = getTodayStr();

  // Show warning modal on mount (once per session)
  useEffect(() => {
    if (!sessionStorage.getItem("sales-warned")) {
      setShowWarning(true);
    }
  }, []);

  // Load today's already-saved records
  useEffect(() => {
    fetch(`/api/farm/sales?date=${today}&limit=50`)
      .then((r) => r.json())
      .then((d) => setSavedToday(d.data || []))
      .catch(() => {});
  }, [today]);

  const grandTotal = rows.reduce((sum, r) => sum + rowTotal(r), 0);
  const hasCompleteRow = rows.some(isRowComplete);

  const updateRow = useCallback((id: string, updates: Partial<SaleRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const deleteRow = useCallback((id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  async function handleSubmit() {
    setIsSubmitting(true);

    const completeRows = rows.filter(isRowComplete);
    const payload = completeRows.map((r) => ({
      product: r.product,
      quantity: parseFloat(r.quantity),
      unit_price: parseFloat(r.unit_price),
      weight_kg: r.weight_kg ? parseFloat(r.weight_kg) : null,
      gender: r.gender || null,
      other_product_name: r.product === "other" ? r.other_product_name.trim() : null,
      customer_name: r.customer_name.trim() || null,
      payment_method: r.payment_method,
      date: today,
    }));

    try {
      const res = await fetch("/api/farm/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }

      const total = completeRows.reduce((s, r) => s + rowTotal(r), 0);
      setSuccessData({ count: completeRows.length, total });
      setShowConfirm(false);
      setShowSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save. Please try again.");
      setIsSubmitting(false);
    }
  }

  if (showSuccess) {
    return (
      <SuccessScreen
        count={successData.count}
        total={successData.total}
        onHome={() => router.push("/")}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {showWarning && (
        <WarningModal
          onContinue={() => {
            sessionStorage.setItem("sales-warned", "1");
            setShowWarning(false);
          }}
        />
      )}

      {showConfirm && (
        <ConfirmSheet
          rows={rows}
          grandTotal={grandTotal}
          onConfirm={handleSubmit}
          onBack={() => setShowConfirm(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Date + Running Total */}
      <div
        className="mb-4 rounded-2xl px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: "#fff", border: "1px solid rgba(27,67,50,0.08)" }}
      >
        <p className="text-sm font-medium" style={{ color: "#6b7280" }}>
          {formatDateDisplay(today)}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: "#9ca3af" }}>Total</span>
          <span className="text-xl font-bold" style={{ color: "#11d469" }}>{fmt(grandTotal)}</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="pb-32">
        {rows.map((row, i) => (
          <SaleRowCard
            key={row.id}
            row={row}
            index={i}
            onUpdate={updateRow}
            onDelete={deleteRow}
            canDelete={rows.length > 1}
          />
        ))}

        {/* Add row button */}
        <button
          onClick={() => setRows((prev) => [...prev, newRow()])}
          className="w-full rounded-2xl flex items-center justify-center gap-2 font-semibold mb-6 transition-all active:scale-[0.98]"
          style={{
            backgroundColor: "transparent",
            border: "2px dashed rgba(45,106,79,0.3)",
            color: "#2d6a4f",
            height: "56px",
          }}
        >
          <Plus className="h-5 w-5" />
          Add Another Item
        </button>

        {/* Previously saved today */}
        {savedToday.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "#ffffff",
              boxShadow: "0 4px 12px rgba(27,67,50,0.06)",
            }}
          >
            <button
              onClick={() => setShowPastRecords((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{ color: "#6b7280" }}
            >
              <span className="text-sm font-semibold">
                Previously saved today ({savedToday.length})
              </span>
              {showPastRecords ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showPastRecords && (
              <div className="px-4 pb-4 space-y-2">
                {savedToday.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl p-3"
                    style={{ backgroundColor: "#eef5f2" }}
                  >
                    <div className="flex justify-between">
                      <span className="text-sm font-medium capitalize" style={{ color: "#161d1b" }}>
                        {s.other_product_name || s.product}
                      </span>
                      <span className="text-sm font-bold" style={{ color: "#11d469" }}>
                        {fmt(s.total_amount)}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                      Qty: {s.quantity} × {fmt(s.unit_price)}
                      {s.weight_kg ? ` · ${s.weight_kg}kg` : ""}
                      {s.gender ? ` · ${s.gender}` : ""}
                      {s.customer_name ? ` · ${s.customer_name}` : ""}
                      {" · "}{s.payment_method}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div
        className="fixed bottom-0 left-0 lg:left-64 right-0 px-5 py-4"
        style={{
          backgroundColor: "rgba(27,67,50,0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
            Grand Total
          </span>
          <span className="text-2xl font-bold" style={{ color: "#11d469" }}>
            {fmt(grandTotal)}
          </span>
        </div>
        <button
          disabled={!hasCompleteRow}
          onClick={() => setShowConfirm(true)}
          className="w-full rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
          style={{
            backgroundColor: "#11d469",
            color: "#012d1d",
            height: "56px",
            opacity: hasCompleteRow ? 1 : 0.3,
          }}
        >
          Save All Records
        </button>
      </div>
    </div>
  );
}
