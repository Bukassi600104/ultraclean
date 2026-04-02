"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, AlertTriangle } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Product = "catfish" | "goat" | "chicken" | "other";

interface FormValues {
  customer_name: string;
  quantity: string;
  unit_price: string;
  payment_method: string;
  product_name: string; // for "other" product
  notes: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PRODUCT_CONFIG: Record<Product, {
  label: string;
  color: string;
  bgColor: string;
  unit: string;
  quantityLabel: string;
}> = {
  catfish: { label: "Catfish", color: "#3b82f6", bgColor: "#eff6ff", unit: "kg / fish", quantityLabel: "Quantity (fish or kg)" },
  goat: { label: "Goat", color: "#f59e0b", bgColor: "#fffbeb", unit: "head", quantityLabel: "Number of Goats" },
  chicken: { label: "Chicken", color: "#f97316", bgColor: "#fff7ed", unit: "bird", quantityLabel: "Number of Birds" },
  other: { label: "Other Product", color: "#8b5cf6", bgColor: "#f5f3ff", unit: "unit", quantityLabel: "Quantity" },
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Bank Transfer" },
  { value: "pos", label: "POS" },
];

function fmt(n: number) {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaleProductPage() {
  const { product } = useParams<{ product: string }>();
  const router = useRouter();
  const productKey = (product as Product) in PRODUCT_CONFIG ? (product as Product) : "other";
  const config = PRODUCT_CONFIG[productKey];
  const today = getTodayStr();

  const [form, setForm] = useState<FormValues>({
    customer_name: "",
    quantity: "",
    unit_price: "",
    payment_method: "cash",
    product_name: "",
    notes: "",
  });
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedItems, setSavedItems] = useState<{ customer: string; total: number }[]>([]);

  useEffect(() => {
    fetch(`/api/farm/daily-record?date=${today}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.record?.status === "closed") setIsDayClosed(true);
      })
      .catch(() => {});
  }, [today]);

  function updateField(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const computedTotal =
    form.quantity && form.unit_price
      ? Number(form.quantity) * Number(form.unit_price)
      : 0;

  async function handleSave() {
    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    if (!form.quantity || Number(form.quantity) <= 0) return toast.error("Enter a valid quantity");
    if (!form.unit_price || Number(form.unit_price) <= 0) return toast.error("Enter a valid unit price");

    setSaving(true);
    try {
      const payload = {
        date: today,
        customer_name: form.customer_name.trim(),
        product: productKey === "other" && form.product_name ? form.product_name.trim() : productKey,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        payment_method: form.payment_method,
        notes: form.notes.trim() || undefined,
      };

      const res = await fetch("/api/farm/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([payload]),
      });

      if (!res.ok) throw new Error();

      setSavedItems((prev) => [
        ...prev,
        { customer: form.customer_name, total: computedTotal },
      ]);

      // Reset form except payment method
      setForm((prev) => ({
        customer_name: "",
        quantity: "",
        unit_price: "",
        payment_method: prev.payment_method,
        product_name: "",
        notes: "",
      }));

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      toast.success("Sale recorded!");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (isDayClosed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>
        <p className="text-lg font-bold text-gray-900 mb-1">Day is Closed</p>
        <p className="text-sm text-gray-500 mb-4">Today&apos;s records have been locked and cannot be edited.</p>
        <button
          onClick={() => router.push("/sales")}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: "#1b4332" }}
        >
          Back to Overview
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      {/* Product header */}
      <div
        className="rounded-2xl px-5 py-4 flex items-center gap-3"
        style={{ backgroundColor: config.bgColor, borderLeft: `4px solid ${config.color}` }}
      >
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: config.color }}>
            Recording Sale
          </p>
          <p className="text-xl font-bold text-gray-900">{config.label}</p>
        </div>
      </div>

      {/* Session total */}
      {savedItems.length > 0 && (
        <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <p className="text-sm text-gray-600">
            {savedItems.length} sale{savedItems.length > 1 ? "s" : ""} recorded this session
          </p>
          <p className="font-bold text-green-700">
            {fmt(savedItems.reduce((s, i) => s + i.total, 0))}
          </p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        {productKey === "other" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Product Name *</label>
            <input
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
              placeholder="e.g. Snail, Tilapia..."
              value={form.product_name}
              onChange={(e) => updateField("product_name", e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Customer Name *</label>
          <input
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            placeholder="Enter customer name"
            value={form.customer_name}
            onChange={(e) => updateField("customer_name", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{config.quantityLabel} *</label>
            <input
              type="number"
              inputMode="numeric"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
              placeholder="0"
              value={form.quantity}
              onChange={(e) => updateField("quantity", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Unit Price (₦) *</label>
            <input
              type="number"
              inputMode="numeric"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
              placeholder="0"
              value={form.unit_price}
              onChange={(e) => updateField("unit_price", e.target.value)}
            />
          </div>
        </div>

        {/* Live total */}
        {computedTotal > 0 && (
          <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
            style={{ backgroundColor: config.bgColor }}>
            <p className="text-xs font-semibold" style={{ color: config.color }}>Total Amount</p>
            <p className="text-lg font-bold" style={{ color: config.color }}>{fmt(computedTotal)}</p>
          </div>
        )}

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Payment Method</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.value}
                onClick={() => updateField("payment_method", method.value)}
                className="rounded-xl py-2.5 text-xs font-semibold border transition-all"
                style={{
                  backgroundColor: form.payment_method === method.value ? config.color : "transparent",
                  borderColor: form.payment_method === method.value ? config.color : "#e5e7eb",
                  color: form.payment_method === method.value ? "#fff" : "#6b7280",
                }}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Notes (optional)</label>
          <input
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            placeholder="Any additional info..."
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
          />
        </div>
      </div>

      {/* Save button */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: saving ? "#9ca3af" : config.color, color: "#fff" }}
        >
          {showSuccess ? (
            <>
              <Check className="h-5 w-5" />
              Saved!
            </>
          ) : saving ? (
            "Saving..."
          ) : (
            "Save to Record"
          )}
        </button>
        <button
          onClick={() => router.push("/sales")}
          className="rounded-2xl px-5 py-4 font-semibold text-sm border border-gray-200 text-gray-600"
        >
          Done
        </button>
      </div>

      {/* Saved list */}
      {savedItems.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Just Recorded</p>
          <div className="space-y-1.5">
            {[...savedItems].reverse().slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.customer}</span>
                <span className="font-semibold text-gray-900">{fmt(item.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
