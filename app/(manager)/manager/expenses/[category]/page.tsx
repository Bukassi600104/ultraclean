"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, AlertTriangle, Users, Package, Zap, HeartPulse, Truck, Wrench, Wallet } from "lucide-react";

// ─── Types / Config ───────────────────────────────────────────────────────────

type Category = "labor" | "feed" | "utilities" | "veterinary" | "transport" | "equipment" | "from-sales";

interface FormValues {
  amount: string;
  paid_to: string;
  payment_method: string;
  notes: string;
  // feed-specific
  feed_type: string;
  feed_source: string;
  weight_unit: string;
  weight_amount: string;
  num_bags: string;
  // from-sales specific
  actual_category: string;
}

const CATEGORY_CONFIG: Record<Category, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
  description: string;
}> = {
  labor: { label: "Labour", color: "#6366f1", bgColor: "#eef2ff", icon: Users, description: "Record labour/worker payments" },
  feed: { label: "Feed Purchase", color: "#f59e0b", bgColor: "#fffbeb", icon: Package, description: "Record feed and supplies purchased" },
  utilities: { label: "Utilities", color: "#3b82f6", bgColor: "#eff6ff", icon: Zap, description: "Electricity, water, gas, etc." },
  veterinary: { label: "Veterinary", color: "#ef4444", bgColor: "#fef2f2", icon: HeartPulse, description: "Vet services and medications" },
  transport: { label: "Transport", color: "#10b981", bgColor: "#f0fdf4", icon: Truck, description: "Delivery and transport costs" },
  equipment: { label: "Equipment", color: "#8b5cf6", bgColor: "#f5f3ff", icon: Wrench, description: "Tools and equipment" },
  "from-sales": { label: "From Sales Cash", color: "#f97316", bgColor: "#fff7ed", icon: Wallet, description: "Expense paid from sales cash" },
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
  { value: "pos", label: "POS" },
];

const EXPENSE_CATEGORIES: Category[] = ["labor", "feed", "utilities", "veterinary", "transport", "equipment"];

function fmt(n: number) {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpenseCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const router = useRouter();
  const categoryKey = (category as Category) in CATEGORY_CONFIG ? (category as Category) : "labor";
  const config = CATEGORY_CONFIG[categoryKey];
  const today = getTodayStr();

  const [form, setForm] = useState<FormValues>({
    amount: "",
    paid_to: "",
    payment_method: "cash",
    notes: "",
    feed_type: "fish",
    feed_source: "local",
    weight_unit: "tons",
    weight_amount: "",
    num_bags: "",
    actual_category: "labor",
  });
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedItems, setSavedItems] = useState<{ label: string; amount: number }[]>([]);

  useEffect(() => {
    fetch(`/api/farm/daily-record?date=${today}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.record?.status === "closed") setIsDayClosed(true);
      })
      .catch(() => {});
  }, [today]);

  // Auto-set weight_unit based on feed_source
  useEffect(() => {
    if (categoryKey === "feed") {
      setForm((prev) => ({
        ...prev,
        weight_unit: prev.feed_source === "local" ? "tons" : "kg",
      }));
    }
  }, [form.feed_source, categoryKey]);

  function updateField(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Enter a valid amount");

    setSaving(true);
    try {
      let savedLabel: string;

      if (categoryKey === "feed") {
        // Feed goes to feed-purchases endpoint
        const payload = [{
          date: today,
          feed_type: form.feed_type as "fish" | "goat",
          feed_source: form.feed_source as "local" | "foreign",
          weight_unit: form.feed_source === "local" ? "tons" : "kg",
          weight_amount: form.weight_amount ? Number(form.weight_amount) : 1,
          num_bags: form.num_bags ? Number(form.num_bags) : 1,
          cost: Number(form.amount),
        }];

        const res = await fetch("/api/farm/feed-purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to save");
        }

        savedLabel = `Feed (${form.feed_type})`;
      } else {
        const expenseCategory = categoryKey === "from-sales" ? form.actual_category : categoryKey;
        const payload = [{
          date: today,
          category: expenseCategory,
          amount: Number(form.amount),
          paid_to: form.paid_to.trim() || undefined,
          payment_method: form.payment_method,
          expense_source: categoryKey === "from-sales" ? "sales_cash" : "bimbo_transfer",
          notes: form.notes.trim() || undefined,
        }];

        const res = await fetch("/api/farm/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error();

        savedLabel = categoryKey === "from-sales"
          ? `${CATEGORY_CONFIG[form.actual_category as Category]?.label ?? form.actual_category} (sales cash)`
          : config.label;
      }

      setSavedItems((prev) => [
        ...prev,
        { label: savedLabel, amount: Number(form.amount) },
      ]);

      setForm((prev) => ({
        amount: "",
        paid_to: "",
        payment_method: prev.payment_method,
        notes: "",
        feed_type: prev.feed_type,
        feed_source: prev.feed_source,
        weight_unit: prev.weight_unit,
        weight_amount: "",
        num_bags: "",
        actual_category: prev.actual_category,
      }));

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      toast.success("Expense recorded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save. Please try again.");
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
        <p className="text-sm text-gray-500 mb-4">Today&apos;s records have been locked.</p>
        <button
          onClick={() => router.push("/expenses")}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: "#1b4332" }}
        >
          Back to Overview
        </button>
      </div>
    );
  }

  const IconComponent = config.icon;

  return (
    <div className="max-w-lg space-y-4">
      {/* Product header */}
      <div
        className="rounded-2xl px-5 py-4"
        style={{ backgroundColor: config.bgColor, borderLeft: `4px solid ${config.color}` }}
      >
        <div className="flex items-center gap-3">
          <IconComponent className="h-6 w-6 flex-shrink-0" style={{ color: config.color }} />
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: config.color }}>
              Recording Expense
            </p>
            <p className="text-xl font-bold text-gray-900">{config.label}</p>
            <p className="text-xs text-gray-400">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Session total */}
      {savedItems.length > 0 && (
        <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a" }}>
          <p className="text-sm text-amber-700">
            {savedItems.length} expense{savedItems.length > 1 ? "s" : ""} recorded
          </p>
          <p className="font-bold text-amber-800">
            {fmt(savedItems.reduce((s, i) => s + i.amount, 0))}
          </p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        {/* From-sales: pick the actual category */}
        {categoryKey === "from-sales" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Expense Category *</label>
            <select
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
              value={form.actual_category}
              onChange={(e) => updateField("actual_category", e.target.value)}
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_CONFIG[cat]?.label ?? cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Feed-specific fields */}
        {categoryKey === "feed" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Feed Type</label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
                  value={form.feed_type}
                  onChange={(e) => updateField("feed_type", e.target.value)}
                >
                  <option value="fish">Fish Feed</option>
                  <option value="goat">Goat Feed</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Source</label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
                  value={form.feed_source}
                  onChange={(e) => updateField("feed_source", e.target.value)}
                >
                  <option value="local">Local (tons)</option>
                  <option value="foreign">Imported (kg)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Weight ({form.feed_source === "local" ? "tons" : "kg"})
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
                  placeholder="0"
                  value={form.weight_amount}
                  onChange={(e) => updateField("weight_amount", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">No. of Bags</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
                  placeholder="0"
                  value={form.num_bags}
                  onChange={(e) => updateField("num_bags", e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* Amount */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Amount (₦) *</label>
          <input
            type="number"
            inputMode="numeric"
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            placeholder="0"
            value={form.amount}
            onChange={(e) => updateField("amount", e.target.value)}
          />
          {Number(form.amount) > 0 && (
            <p className="mt-1 text-xs font-semibold" style={{ color: config.color }}>
              {fmt(Number(form.amount))}
            </p>
          )}
        </div>

        {/* Paid To */}
        {categoryKey !== "from-sales" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {categoryKey === "feed" ? "Supplier Name" : "Paid To"}
            </label>
            <input
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
              placeholder="Enter name"
              value={form.paid_to}
              onChange={(e) => updateField("paid_to", e.target.value)}
            />
          </div>
        )}

        {/* Payment method */}
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

        {/* Notes */}
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

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60 text-white"
          style={{ backgroundColor: saving ? "#9ca3af" : config.color }}
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
          onClick={() => router.push("/expenses")}
          className="rounded-2xl px-5 py-4 font-semibold text-sm border border-gray-200 text-gray-600"
        >
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
                <span className="text-gray-600 capitalize">{item.label}</span>
                <span className="font-semibold text-gray-900">{fmt(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

