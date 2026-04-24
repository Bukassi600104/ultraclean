"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, AlertTriangle, Users, Package, Zap, HeartPulse, Truck, Wrench, Sprout } from "lucide-react";

// ─── Types / Config ───────────────────────────────────────────────────────────

type Category = "labor" | "feed" | "utilities" | "veterinary" | "transport" | "equipment" | "produce";

interface FormValues {
  date: string;
  amount: string;
  item_name: string;
  paid_to: string;
  payment_method: string;
  notes: string;
  // feed-specific
  feed_type: string;
  num_bags: string;
  cost_per_bag: string;
  // produce-specific
  produce_type: string;
  produce_quantity: string;
  produce_unit_price: string;
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
  produce: { label: "Farm Produce", color: "#16a34a", bgColor: "#f0fdf4", icon: Sprout, description: "Purchase of livestock, fingerlings, or farm stock" },
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
  { value: "pos", label: "POS" },
];

const FEED_TYPES = [
  { value: "fish", label: "Fish Feed" },
  { value: "goat", label: "Goat Feed" },
  { value: "chicken", label: "Chicken Feed" },
  { value: "pig", label: "Pig Feed" },
  { value: "turkey", label: "Turkey Feed" },
  { value: "other", label: "Other Feed" },
];

const PRODUCE_TYPES = [
  { value: "Catfish Fingerlings", label: "Catfish Fingerlings" },
  { value: "Day-Old Chicks", label: "Day-Old Chicks" },
  { value: "Goat Kids", label: "Goat Kids" },
  { value: "Piglets", label: "Piglets" },
  { value: "Poults (Turkey)", label: "Poults (Turkey)" },
  { value: "Other Produce", label: "Other Produce" },
];

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
  const [today, setToday] = useState("");

  const [form, setForm] = useState<FormValues>({
    date: "",
    amount: "",
    item_name: "",
    paid_to: "",
    payment_method: "cash",
    notes: "",
    feed_type: "fish",
    num_bags: "",
    cost_per_bag: "",
    produce_type: "Catfish Fingerlings",
    produce_quantity: "",
    produce_unit_price: "",
  });
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedItems, setSavedItems] = useState<{ label: string; amount: number }[]>([]);

  useEffect(() => {
    const t = getTodayStr();
    setToday(t);
    setForm((prev) => ({ ...prev, date: t }));
  }, []);

  useEffect(() => {
    if (!today) return;
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

  async function handleSave() {
    if (categoryKey === "feed") {
      if (!form.num_bags || Number(form.num_bags) <= 0) return toast.error("Enter number of bags");
      if (!form.cost_per_bag || Number(form.cost_per_bag) <= 0) return toast.error("Enter cost per bag");
    } else if (categoryKey === "produce") {
      if (!form.produce_quantity || Number(form.produce_quantity) <= 0) return toast.error("Enter quantity");
      if (!form.produce_unit_price || Number(form.produce_unit_price) <= 0) return toast.error("Enter unit price");
    } else {
      if (!form.amount || Number(form.amount) <= 0) return toast.error("Enter a valid amount");
    }
    if (categoryKey === "equipment" && !form.item_name.trim()) {
      return toast.error("Enter item name");
    }

    setSaving(true);
    try {
      let savedLabel: string;

      if (categoryKey === "feed") {
        const totalCost = Number(form.num_bags) * Number(form.cost_per_bag);
        // Feed goes to feed-purchases endpoint
        const payload = [{
          date: form.date,
          feed_type: form.feed_type,
          feed_source: "local",
          weight_unit: "tons",
          weight_amount: 1,
          num_bags: Number(form.num_bags),
          cost: totalCost,
          notes: form.notes.trim() || undefined,
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

        setSavedItems((prev) => [
          ...prev,
          { label: `Feed (${form.feed_type})`, amount: totalCost },
        ]);

        setForm((prev) => ({
          date: prev.date,
          amount: "",
          item_name: "",
          paid_to: "",
          payment_method: prev.payment_method,
          notes: "",
          feed_type: prev.feed_type,
          num_bags: "",
          cost_per_bag: "",
          produce_type: prev.produce_type,
          produce_quantity: "",
          produce_unit_price: "",
        }));

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        toast.success("Feed purchase recorded!");
        return;
      } else if (categoryKey === "produce") {
        const totalCost = Number(form.produce_quantity) * Number(form.produce_unit_price);
        const payload = [{
          date: form.date,
          category: "produce",
          amount: totalCost,
          item_name: form.produce_type,
          paid_to: form.paid_to.trim() || undefined,
          payment_method: form.payment_method,
          notes: `${form.produce_quantity} units @ ₦${Number(form.produce_unit_price).toLocaleString("en-NG")}${form.notes.trim() ? ` — ${form.notes.trim()}` : ""}`,
        }];

        const res = await fetch("/api/farm/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to save");
        }

        setSavedItems((prev) => [
          ...prev,
          { label: form.produce_type, amount: totalCost },
        ]);

        setForm((prev) => ({
          ...prev,
          produce_quantity: "",
          produce_unit_price: "",
          paid_to: "",
          notes: "",
        }));

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        toast.success("Produce purchase recorded!");
        return;
      } else {
        const payload: Record<string, unknown> = {
          date: form.date,
          category: categoryKey,
          amount: Number(form.amount),
          paid_to: form.paid_to.trim() || undefined,
          payment_method: form.payment_method,
          notes: form.notes.trim() || undefined,
        };

        if (categoryKey === "equipment") {
          payload.item_name = form.item_name.trim();
        }

        const res = await fetch("/api/farm/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([payload]),
        });

        if (!res.ok) throw new Error();

        savedLabel = config.label;
      }

      setSavedItems((prev) => [
        ...prev,
        { label: savedLabel, amount: Number(form.amount) },
      ]);

      setForm((prev) => ({
        date: prev.date,
        amount: "",
        item_name: "",
        paid_to: "",
        payment_method: prev.payment_method,
        notes: "",
        feed_type: prev.feed_type,
        num_bags: "",
        cost_per_bag: "",
        produce_type: prev.produce_type,
        produce_quantity: "",
        produce_unit_price: "",
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

        {/* Date field — always first */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date</label>
          <input
            type="date"
            max={today}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            value={form.date}
            onChange={(e) => updateField("date", e.target.value)}
          />
        </div>

        {/* Equipment: item name first */}
        {categoryKey === "equipment" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Item Name *</label>
            <input
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
              placeholder="e.g. Water pump, Generator..."
              value={form.item_name}
              onChange={(e) => updateField("item_name", e.target.value)}
            />
          </div>
        )}

        {/* Feed-specific fields */}
        {categoryKey === "feed" && (
          <>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Feed Type</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {FEED_TYPES.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => updateField("feed_type", f.value)}
                    className="rounded-xl py-2.5 text-xs font-semibold border transition-all"
                    style={{
                      backgroundColor: form.feed_type === f.value ? config.color : "transparent",
                      borderColor: form.feed_type === f.value ? config.color : "#e5e7eb",
                      color: form.feed_type === f.value ? "#fff" : "#6b7280",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">No. of Bags *</label>
              <input
                type="number"
                inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
                placeholder="0"
                value={form.num_bags}
                onChange={(e) => updateField("num_bags", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Cost per Bag (₦) *</label>
              <input
                type="number"
                inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
                placeholder="0"
                value={form.cost_per_bag}
                onChange={(e) => updateField("cost_per_bag", e.target.value)}
              />
            </div>
            {/* Auto-calculated total */}
            {Number(form.num_bags) > 0 && Number(form.cost_per_bag) > 0 && (
              <div
                className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: config.color + "15", border: `1px solid ${config.color}40` }}
              >
                <p className="text-sm font-semibold" style={{ color: config.color }}>
                  Total ({form.num_bags} bags × {fmt(Number(form.cost_per_bag))})
                </p>
                <p className="text-lg font-bold" style={{ color: config.color }}>
                  {fmt(Number(form.num_bags) * Number(form.cost_per_bag))}
                </p>
              </div>
            )}
          </>
        )}

        {/* Produce-specific fields */}
        {categoryKey === "produce" && (
          <>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Produce Type</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {PRODUCE_TYPES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => updateField("produce_type", p.value)}
                    className="rounded-xl py-2.5 text-xs font-semibold border transition-all"
                    style={{
                      backgroundColor: form.produce_type === p.value ? config.color : "transparent",
                      borderColor: form.produce_type === p.value ? config.color : "#e5e7eb",
                      color: form.produce_type === p.value ? "#fff" : "#6b7280",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Quantity *</label>
              <input
                type="number"
                inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
                placeholder="0"
                value={form.produce_quantity}
                onChange={(e) => updateField("produce_quantity", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Unit Price (₦) *</label>
              <input
                type="number"
                inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
                placeholder="0"
                value={form.produce_unit_price}
                onChange={(e) => updateField("produce_unit_price", e.target.value)}
              />
            </div>
            {Number(form.produce_quantity) > 0 && Number(form.produce_unit_price) > 0 && (
              <div
                className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: config.color + "15", border: `1px solid ${config.color}40` }}
              >
                <p className="text-sm font-semibold" style={{ color: config.color }}>
                  Total ({form.produce_quantity} units × {fmt(Number(form.produce_unit_price))})
                </p>
                <p className="text-lg font-bold" style={{ color: config.color }}>
                  {fmt(Number(form.produce_quantity) * Number(form.produce_unit_price))}
                </p>
              </div>
            )}
          </>
        )}

        {/* Amount — non-feed, non-produce categories only */}
        {categoryKey !== "feed" && categoryKey !== "produce" && (
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
        )}

        {/* Paid To — not for feed */}
        {categoryKey !== "feed" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Paid To</label>
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
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Notes <span className="font-normal normal-case text-gray-400">(optional)</span></label>
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
