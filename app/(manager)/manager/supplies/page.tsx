"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  Package,
  ChevronRight,
  X,
  Loader2,
  History,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SupplyItem {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  current_quantity: number;
  restock_threshold: number | null;
  notes: string | null;
  updated_at: string;
}

interface HistoryEntry {
  id: string;
  action: "purchase" | "use" | "adjustment";
  quantity_change: number;
  notes: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  feed: "Feed",
  medication: "Medication",
  fuel: "Fuel",
  equipment: "Equipment",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  feed: { bg: "#dcfce7", text: "#166534" },
  medication: { bg: "#dbeafe", text: "#1e40af" },
  fuel: { bg: "#fef9c3", text: "#854d0e" },
  equipment: { bg: "#f3e8ff", text: "#6b21a8" },
  other: { bg: "#f3f4f6", text: "#374151" },
};

function fmt(n: number) {
  return Math.round(n * 100) / 100;
}

function isLow(item: SupplyItem) {
  return (
    item.restock_threshold !== null &&
    item.current_quantity <= item.restock_threshold
  );
}

function isOut(item: SupplyItem) {
  return item.current_quantity <= 0;
}

function relativeDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

// ─── Action Sheet ─────────────────────────────────────────────────────────────

function ActionSheet({
  item,
  onClose,
  onRefresh,
}: {
  item: SupplyItem;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [view, setView] = useState<"menu" | "use" | "purchase" | "history">("menu");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/farm/supplies/history?item_id=${item.id}&limit=20`);
      const d = await res.json();
      setHistory(d.data || []);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSubmit(action: "use" | "purchase") {
    const quantity = parseFloat(qty);
    if (!quantity || quantity <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/farm/supplies/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, action, quantity, notes }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      toast.success(action === "use" ? "Usage recorded" : "Purchase recorded");
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const low = isLow(item);
  const out = isOut(item);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(1,45,29,0.85)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg pb-safe"
        style={{ backgroundColor: "#fff", borderRadius: "28px 28px 0 0", maxHeight: "85vh", overflowY: "auto" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "#d1d5db" }} />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between">
          {view !== "menu" ? (
            <button onClick={() => setView("menu")} className="p-1" style={{ color: "#6b7280" }}>
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="w-7" />
          )}
          <div className="text-center flex-1">
            <p className="font-bold text-base" style={{ color: "#161d1b" }}>{item.item_name}</p>
            <p className="text-xs" style={{ color: "#6b7280" }}>
              {fmt(item.current_quantity)} {item.unit} remaining
            </p>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: "#6b7280" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Low stock banner */}
        {(low || out) && (
          <div
            className="mx-5 mb-3 rounded-xl px-4 py-2 flex items-center gap-2"
            style={{ backgroundColor: out ? "#fef2f2" : "#fffbeb", border: `1px solid ${out ? "#fecaca" : "#fde68a"}` }}
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: out ? "#dc2626" : "#d97706" }} />
            <p className="text-sm font-medium" style={{ color: out ? "#dc2626" : "#92400e" }}>
              {out ? "Out of stock — restock needed!" : `Low stock — restock at ${item.restock_threshold} ${item.unit}`}
            </p>
          </div>
        )}

        {/* ── MENU ── */}
        {view === "menu" && (
          <div className="px-5 pb-8 space-y-3">
            <button
              onClick={() => setView("use")}
              disabled={out}
              className="w-full rounded-2xl flex items-center justify-between px-5 transition-all active:scale-[0.98]"
              style={{
                backgroundColor: out ? "#f3f4f6" : "#fef9c3",
                border: `1.5px solid ${out ? "#e5e7eb" : "#fde68a"}`,
                height: "64px",
                opacity: out ? 0.5 : 1,
              }}
            >
              <span className="font-bold text-base" style={{ color: out ? "#9ca3af" : "#92400e" }}>
                Record Usage
              </span>
              <ChevronRight className="h-5 w-5" style={{ color: out ? "#9ca3af" : "#d97706" }} />
            </button>

            <button
              onClick={() => setView("purchase")}
              className="w-full rounded-2xl flex items-center justify-between px-5 transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #bbf7d0", height: "64px" }}
            >
              <span className="font-bold text-base" style={{ color: "#166534" }}>
                Record Purchase
              </span>
              <ChevronRight className="h-5 w-5" style={{ color: "#16a34a" }} />
            </button>

            <button
              onClick={() => { setView("history"); loadHistory(); }}
              className="w-full rounded-2xl flex items-center justify-between px-5 transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f8fafc", border: "1.5px solid #e2e8f0", height: "64px" }}
            >
              <span className="font-bold text-base" style={{ color: "#374151" }}>
                View History
              </span>
              <History className="h-5 w-5" style={{ color: "#6b7280" }} />
            </button>
          </div>
        )}

        {/* ── USE / PURCHASE FORM ── */}
        {(view === "use" || view === "purchase") && (
          <div className="px-5 pb-8 space-y-4">
            <p className="text-sm" style={{ color: "#6b7280" }}>
              {view === "use"
                ? `How many ${item.unit} were used?`
                : `How many ${item.unit} were purchased/received?`}
            </p>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
                Quantity ({item.unit}) <span style={{ color: "#ba1a1a" }}>*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-full rounded-xl px-4 outline-none"
                style={{
                  backgroundColor: "#eef5f2",
                  height: "56px",
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#161d1b",
                  border: "none",
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={view === "use" ? "e.g. Morning feeding" : "e.g. Bought from Alhaji store"}
                className="w-full rounded-xl px-4 outline-none"
                style={{ backgroundColor: "#eef5f2", height: "52px", fontSize: "16px", color: "#161d1b", border: "none" }}
              />
            </div>

            <button
              onClick={() => handleSubmit(view)}
              disabled={isSubmitting || !qty}
              className="w-full rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                backgroundColor: view === "use" ? "#F5C842" : "#11d469",
                color: "#012d1d",
                height: "56px",
                opacity: isSubmitting || !qty ? 0.5 : 1,
              }}
            >
              {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
              {isSubmitting ? "Saving..." : view === "use" ? "Record Usage" : "Record Purchase"}
            </button>
          </div>
        )}

        {/* ── HISTORY ── */}
        {view === "history" && (
          <div className="px-5 pb-8">
            {historyLoading ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ backgroundColor: "#eef5f2" }} />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: "#6b7280" }}>No history yet</p>
            ) : (
              <div className="space-y-2 py-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-2xl px-4 py-3"
                    style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: h.action === "purchase" ? "#11d469" : h.action === "use" ? "#f59e0b" : "#6b7280" }}
                        />
                        <span className="text-sm font-semibold capitalize" style={{ color: "#161d1b" }}>
                          {h.action}
                        </span>
                      </div>
                      <span
                        className="text-sm font-bold"
                        style={{ color: h.quantity_change > 0 ? "#16a34a" : "#dc2626" }}
                      >
                        {h.quantity_change > 0 ? "+" : ""}{fmt(h.quantity_change)} {item.unit}
                      </span>
                    </div>
                    {h.notes && (
                      <p className="text-xs mt-0.5 ml-4" style={{ color: "#6b7280" }}>{h.notes}</p>
                    )}
                    <p className="text-xs mt-0.5 ml-4" style={{ color: "#9ca3af" }}>
                      {new Date(h.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}
                      {new Date(h.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Item Sheet ────────────────────────────────────────────────────────────

const CATEGORIES = ["feed", "medication", "fuel", "equipment", "other"];
const COMMON_UNITS = ["bags", "bottles", "litres", "kg", "units", "packs", "crates", "cartons"];

function AddItemSheet({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    item_name: "",
    category: "other",
    unit: "",
    current_quantity: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd() {
    if (!form.item_name.trim()) { toast.error("Item name is required"); return; }
    if (!form.unit.trim()) { toast.error("Unit is required"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/farm/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      toast.success("Item added");
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(1,45,29,0.85)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg pb-safe"
        style={{ backgroundColor: "#fff", borderRadius: "28px 28px 0 0", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "#d1d5db" }} />
        </div>

        <div className="px-5 py-3 flex items-center justify-between">
          <div className="w-7" />
          <p className="font-bold text-base" style={{ color: "#161d1b" }}>Add Supply Item</p>
          <button onClick={onClose}><X className="h-5 w-5" style={{ color: "#6b7280" }} /></button>
        </div>

        <div className="px-5 pb-8 space-y-4">
          {/* Item name */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
              Item Name <span style={{ color: "#ba1a1a" }}>*</span>
            </label>
            <input
              type="text"
              value={form.item_name}
              onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
              placeholder="e.g. Fish Feed, Ivermectin"
              className="w-full rounded-xl px-4 outline-none"
              style={{ backgroundColor: "#eef5f2", height: "52px", fontSize: "16px", color: "#161d1b", border: "none" }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "#6b7280" }}>Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setForm((f) => ({ ...f, category: cat }))}
                  className="rounded-xl px-3 py-2 text-sm font-semibold capitalize transition-all"
                  style={
                    form.category === cat
                      ? { backgroundColor: "#1b4332", color: "#fff" }
                      : { backgroundColor: "#eef5f2", color: "#6b7280" }
                  }
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
              Unit <span style={{ color: "#ba1a1a" }}>*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_UNITS.map((u) => (
                <button
                  key={u}
                  onClick={() => setForm((f) => ({ ...f, unit: u }))}
                  className="rounded-xl px-3 py-2 text-sm font-semibold capitalize transition-all"
                  style={
                    form.unit === u
                      ? { backgroundColor: "#11d469", color: "#012d1d" }
                      : { backgroundColor: "#eef5f2", color: "#6b7280" }
                  }
                >
                  {u}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              placeholder="Or type custom unit..."
              className="w-full rounded-xl px-4 outline-none"
              style={{ backgroundColor: "#eef5f2", height: "48px", fontSize: "15px", color: "#161d1b", border: "none" }}
            />
          </div>

          {/* Initial quantity */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>
              Current Quantity (optional)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={form.current_quantity}
              onChange={(e) => setForm((f) => ({ ...f, current_quantity: e.target.value }))}
              placeholder="0"
              className="w-full rounded-xl px-4 outline-none"
              style={{ backgroundColor: "#eef5f2", height: "52px", fontSize: "18px", fontWeight: "700", color: "#161d1b", border: "none" }}
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={isSubmitting}
            className="w-full rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#11d469", color: "#012d1d", height: "56px", opacity: isSubmitting ? 0.6 : 1 }}
          >
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {isSubmitting ? "Adding..." : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuppliesPage() {
  const router = useRouter();
  const [items, setItems] = useState<SupplyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SupplyItem | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/farm/supplies");
      const d = await res.json();
      setItems(Array.isArray(d) ? d : []);
    } catch {
      toast.error("Failed to load supplies");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lowCount = items.filter(isLow).length;
  const outCount = items.filter(isOut).length;

  const filtered = search.trim()
    ? items.filter((i) => i.item_name.toLowerCase().includes(search.toLowerCase()))
    : items;

  // Group by category
  const grouped = filtered.reduce<Record<string, SupplyItem[]>>((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f4fbf8" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-5 pt-10 pb-5"
        style={{ background: "linear-gradient(160deg, #1b4332 0%, #012d1d 100%)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/")}
            className="rounded-xl p-2 transition-all active:scale-90"
            style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-white">Farm Supplies</h1>
          <div className="w-9" />
        </div>

        {/* Alert pills */}
        {(outCount > 0 || lowCount > 0) && (
          <div className="flex gap-2 mb-3">
            {outCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: "rgba(220,38,38,0.2)" }}>
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs font-semibold text-red-300">{outCount} out of stock</span>
              </div>
            )}
            {lowCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: "rgba(245,158,11,0.2)" }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#fbbf24" }} />
                <span className="text-xs font-semibold" style={{ color: "#fcd34d" }}>{lowCount} low stock</span>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search supplies..."
          className="w-full rounded-xl px-4 outline-none"
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            height: "44px",
            fontSize: "14px",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        />
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-32" style={{ backgroundColor: "#f4fbf8", borderRadius: "28px 28px 0 0", marginTop: "-12px" }}>
        {isLoading ? (
          <div className="space-y-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: "#e8efec" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: "#6b7280" }}>
            <Package className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-base font-semibold">No supplies found</p>
            <p className="text-sm mt-1">Tap + to add your first item</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} className="mb-5">
              {/* Category label */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <span
                  className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: CATEGORY_COLORS[cat]?.bg || "#f3f4f6",
                    color: CATEGORY_COLORS[cat]?.text || "#374151",
                  }}
                >
                  {CATEGORY_LABELS[cat] || cat}
                </span>
              </div>

              {catItems.map((item) => {
                const low = isLow(item);
                const out = isOut(item);
                const pct =
                  item.restock_threshold && item.restock_threshold > 0
                    ? Math.min(100, (item.current_quantity / (item.restock_threshold * 3)) * 100)
                    : null;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="w-full rounded-2xl p-4 mb-2 text-left transition-all active:scale-[0.98]"
                    style={{ backgroundColor: "#fff", boxShadow: "0 4px 12px rgba(27,67,50,0.06)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Status dot */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: out ? "#ef4444" : low ? "#f59e0b" : "#11d469" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate" style={{ color: "#161d1b" }}>
                            {item.item_name}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                            Updated {relativeDate(item.updated_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p
                            className="font-bold text-lg leading-none"
                            style={{ color: out ? "#ef4444" : low ? "#d97706" : "#161d1b" }}
                          >
                            {fmt(item.current_quantity)}
                          </p>
                          <p className="text-xs" style={{ color: "#9ca3af" }}>{item.unit}</p>
                        </div>
                        {(out || low) && (
                          <AlertTriangle
                            className="h-4 w-4 flex-shrink-0"
                            style={{ color: out ? "#ef4444" : "#f59e0b" }}
                          />
                        )}
                        <ChevronRight className="h-4 w-4" style={{ color: "#d1d5db" }} />
                      </div>
                    </div>

                    {/* Progress bar — only if threshold set */}
                    {pct !== null && (
                      <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#eef5f2" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: out ? "#ef4444" : low ? "#f59e0b" : "#11d469",
                          }}
                        />
                      </div>
                    )}

                    {/* Restock warning text */}
                    {low && !out && item.restock_threshold !== null && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "#d97706" }}>
                        Below restock level ({item.restock_threshold} {item.unit})
                      </p>
                    )}
                    {out && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "#dc2626" }}>
                        Out of stock — restock needed
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* FAB — Add item */}
      <button
        onClick={() => setShowAddItem(true)}
        className="fixed bottom-6 right-5 flex items-center gap-2 rounded-2xl px-5 font-bold text-sm shadow-lg transition-all active:scale-95"
        style={{ backgroundColor: "#11d469", color: "#012d1d", height: "52px", zIndex: 40 }}
      >
        <Plus className="h-5 w-5" />
        Add Item
      </button>

      {/* Sheets */}
      {selectedItem && (
        <ActionSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRefresh={load}
        />
      )}
      {showAddItem && (
        <AddItemSheet
          onClose={() => setShowAddItem(false)}
          onAdded={load}
        />
      )}
    </div>
  );
}
