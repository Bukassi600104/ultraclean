"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, X } from "lucide-react";

type Product = "catfish" | "goat" | "chicken" | "crops";

const PRODUCT_CONFIG: Record<Product, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  catfish: { label: "Catfish", color: "#3b82f6", bgColor: "#eff6ff" },
  goat: { label: "Goat", color: "#f59e0b", bgColor: "#fffbeb" },
  chicken: { label: "Chicken", color: "#f97316", bgColor: "#fff7ed" },
  crops: { label: "Crops", color: "#10b981", bgColor: "#f0fdf4" },
};

interface FormValues {
  date: string;
  quantity: string;
  kg: string;              // catfish only
  amount_per_kg: string;   // catfish only
  unit_price: string;      // goat/chicken/crops
  crop_type: string;       // crops only
  payment_method: string;
  customer_name: string;
  notes: string;
}

function fmt(n: number) { return `₦${Math.round(n).toLocaleString("en-NG")}`; }
function getTodayStr() { return new Date().toISOString().split("T")[0]; }

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  config, summary, onConfirm, onCancel, saving,
}: {
  config: { label: string; color: string };
  summary: { label: string; value: string }[];
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-gray-900">Confirm Sale — {config.label}</p>
          <button onClick={onCancel} className="p-1.5 rounded-full bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="rounded-xl overflow-hidden border border-gray-100 mb-4">
          {summary.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center px-4 py-2.5 even:bg-gray-50">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-sm font-semibold text-gray-900">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-gray-200 text-gray-700">
            Edit
          </button>
          <button onClick={onConfirm} disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: config.color }}>
            {saving ? "Saving..." : "Confirm Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaleProductPage() {
  const { product } = useParams<{ product: string }>();
  const router = useRouter();
  const productKey: Product = (product as Product) in PRODUCT_CONFIG ? (product as Product) : "crops";
  const config = PRODUCT_CONFIG[productKey];
  const [today, setToday] = useState("");

  const [form, setForm] = useState<FormValues>({
    date: "",
    quantity: "",
    kg: "",
    amount_per_kg: "",
    unit_price: "",
    crop_type: "",
    payment_method: "cash",
    customer_name: "",
    notes: "",
  });
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedItems, setSavedItems] = useState<{ label: string; total: number }[]>([]);

  useEffect(() => {
    const t = getTodayStr();
    setToday(t);
    setForm((prev) => ({ ...prev, date: t }));
  }, []);

  useEffect(() => {
    if (!today) return;
    fetch(`/api/farm/daily-record?date=${today}`)
      .then((r) => r.json())
      .then((d) => { if (d.record?.status === "closed") setIsDayClosed(true); })
      .catch(() => {});
  }, [today]);

  function updateField(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Compute total
  const computedTotal = (() => {
    if (productKey === "catfish") {
      const kg = Number(form.kg);
      const rate = Number(form.amount_per_kg);
      return kg > 0 && rate > 0 ? kg * rate : 0;
    }
    const qty = Number(form.quantity);
    const price = Number(form.unit_price);
    return qty > 0 && price > 0 ? qty * price : 0;
  })();

  function validate(): string | null {
    if (!form.date) return "Select a date";
    if (productKey === "crops" && !form.crop_type.trim()) return "Enter crop type";
    if (productKey === "catfish") {
      if (!form.quantity || Number(form.quantity) <= 0) return "Enter number of fish";
      if (!form.kg || Number(form.kg) <= 0) return "Enter weight in kg";
      if (!form.amount_per_kg || Number(form.amount_per_kg) <= 0) return "Enter price per kg";
    } else {
      if (!form.quantity || Number(form.quantity) <= 0) return "Enter quantity";
      if (!form.unit_price || Number(form.unit_price) <= 0) return "Enter price";
    }
    return null;
  }

  function handleSavePress() {
    const err = validate();
    if (err) return toast.error(err);
    setShowConfirm(true);
  }

  // Build confirm summary
  const confirmSummary = (() => {
    const rows: { label: string; value: string }[] = [];
    rows.push({ label: "Date", value: form.date });
    if (productKey === "crops") rows.push({ label: "Crop Type", value: form.crop_type });
    if (productKey === "catfish") {
      rows.push({ label: "No. of Fish", value: form.quantity });
      rows.push({ label: "Weight (kg)", value: form.kg + " kg" });
      rows.push({ label: "Price per kg", value: fmt(Number(form.amount_per_kg)) });
    } else {
      const qtyLabel = productKey === "goat" ? "No. of Goats" : productKey === "chicken" ? "No. of Birds" : "Quantity";
      rows.push({ label: qtyLabel, value: form.quantity });
      rows.push({ label: "Price per unit", value: fmt(Number(form.unit_price)) });
    }
    rows.push({ label: "Total", value: fmt(computedTotal) });
    rows.push({ label: "Payment", value: form.payment_method.toUpperCase() });
    if (form.customer_name) rows.push({ label: "Customer", value: form.customer_name });
    return rows;
  })();

  async function handleConfirmedSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        date: form.date,
        product: productKey,
        payment_method: form.payment_method,
        notes: form.notes.trim() || undefined,
        customer_name: form.customer_name.trim() || undefined,
      };

      if (productKey === "catfish") {
        payload.quantity = Number(form.quantity);
        payload.unit_price = Number(form.amount_per_kg);
        payload.weight_kg = Number(form.kg);
      } else {
        payload.quantity = Number(form.quantity);
        payload.unit_price = Number(form.unit_price);
        if (productKey === "crops") payload.other_product_name = form.crop_type.trim();
      }

      const res = await fetch("/api/farm/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([payload]),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(JSON.stringify(err));
      }

      setSavedItems((prev) => [...prev, { label: config.label, total: computedTotal }]);
      setForm((prev) => ({
        date: prev.date,
        quantity: "", kg: "", amount_per_kg: "", unit_price: "",
        crop_type: "", payment_method: prev.payment_method,
        customer_name: "", notes: "",
      }));
      setShowConfirm(false);
      toast.success("Sale recorded!");
    } catch (e) {
      console.error(e);
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
        <p className="text-sm text-gray-500 mb-4">Records are locked for today.</p>
        <button onClick={() => router.push("/sales")} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: "#1b4332" }}>
          Back to Sales
        </button>
      </div>
    );
  }

  const sessionTotal = savedItems.reduce((s, i) => s + i.total, 0);

  return (
    <div className="max-w-lg space-y-4">
      {/* Header */}
      <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: config.bgColor, borderLeft: `4px solid ${config.color}` }}>
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: config.color }}>Recording Sale</p>
        <p className="text-xl font-bold text-gray-900">{config.label}</p>
      </div>

      {/* Session tracker */}
      {savedItems.length > 0 && (
        <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <p className="text-sm text-gray-600">{savedItems.length} sale{savedItems.length > 1 ? "s" : ""} recorded</p>
          <p className="font-bold text-green-700">{fmt(sessionTotal)}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        {/* 1. Date */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date</label>
          <input type="date" max={today}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            value={form.date} onChange={(e) => updateField("date", e.target.value)} />
        </div>

        {/* 2. Crops: crop type */}
        {productKey === "crops" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Crop Type *</label>
            <input className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
              placeholder="e.g. Maize, Cassava, Yam..." value={form.crop_type} onChange={(e) => updateField("crop_type", e.target.value)} />
          </div>
        )}

        {/* 3a. Catfish: quantity + kg + price per kg */}
        {productKey === "catfish" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">No. of Fish *</label>
                <input type="number" inputMode="numeric"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="0" value={form.quantity} onChange={(e) => updateField("quantity", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Weight (kg) *</label>
                <input type="number" inputMode="numeric"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="0.0" value={form.kg} onChange={(e) => updateField("kg", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Amount per kg (₦) *</label>
              <input type="number" inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
                placeholder="0" value={form.amount_per_kg} onChange={(e) => updateField("amount_per_kg", e.target.value)} />
            </div>
          </>
        )}

        {/* 3b. Goat/Chicken/Crops: quantity + unit price */}
        {productKey !== "catfish" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {productKey === "goat" ? "No. of Goats *" : productKey === "chicken" ? "No. of Birds *" : "Quantity *"}
              </label>
              <input type="number" inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
                placeholder="0" value={form.quantity} onChange={(e) => updateField("quantity", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {productKey === "goat" ? "Price per Goat (₦) *" : productKey === "chicken" ? "Price per Bird (₦) *" : "Price per Unit (₦) *"}
              </label>
              <input type="number" inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
                placeholder="0" value={form.unit_price} onChange={(e) => updateField("unit_price", e.target.value)} />
            </div>
          </div>
        )}

        {/* Live total */}
        {computedTotal > 0 && (
          <div className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: config.bgColor }}>
            <p className="text-xs font-semibold" style={{ color: config.color }}>Total Amount</p>
            <p className="text-lg font-bold" style={{ color: config.color }}>{fmt(computedTotal)}</p>
          </div>
        )}

        {/* 4. Payment method */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Payment Method</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {["cash", "transfer", "pos"].map((m) => (
              <button key={m} onClick={() => updateField("payment_method", m)}
                className="rounded-xl py-2.5 text-xs font-semibold border transition-all"
                style={{
                  backgroundColor: form.payment_method === m ? config.color : "transparent",
                  borderColor: form.payment_method === m ? config.color : "#e5e7eb",
                  color: form.payment_method === m ? "#fff" : "#6b7280",
                }}>
                {m === "pos" ? "POS" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Customer name — optional, at bottom */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Customer Name <span className="font-normal normal-case text-gray-400">(optional)</span></label>
          <input className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            placeholder="Enter customer name" value={form.customer_name} onChange={(e) => updateField("customer_name", e.target.value)} />
        </div>

        {/* 6. Notes — optional */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Notes <span className="font-normal normal-case text-gray-400">(optional)</span></label>
          <input className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            placeholder="Any extra info..." value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button onClick={handleSavePress}
          className="flex-1 rounded-2xl py-4 font-bold text-sm text-white transition-all active:scale-[0.98]"
          style={{ backgroundColor: config.color }}>
          Save Sale
        </button>
        <button onClick={() => router.push("/sales")}
          className="rounded-2xl px-5 py-4 font-semibold text-sm border border-gray-200 text-gray-600">
          Done
        </button>
      </div>

      {/* Recent */}
      {savedItems.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Just Recorded</p>
          <div className="space-y-1.5">
            {[...savedItems].reverse().slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-semibold text-gray-900">{fmt(item.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showConfirm && (
        <ConfirmDialog
          config={config}
          summary={confirmSummary}
          onConfirm={handleConfirmedSave}
          onCancel={() => setShowConfirm(false)}
          saving={saving}
        />
      )}
    </div>
  );
}
