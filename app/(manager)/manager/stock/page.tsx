"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LIVESTOCK_PRODUCTS, farmDateToday } from "@/lib/farm-products";
import { InventoryActivity } from "@/components/manager/InventoryActivity";
import { FarmCorrectionRequest } from "@/components/manager/FarmCorrectionRequest";
import { PlusSquare, Check } from "lucide-react";

const ANIMALS = LIVESTOCK_PRODUCTS.map((product) => ({ value: product.key, label: product.label }));

export default function StockPage() {
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => {
    const t = farmDateToday();
    setToday(t);
    setDate(t);
  }, []);
  const [product, setProduct] = useState("catfish");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  async function handleSave() {
    if (!quantity || Number(quantity) <= 0) return toast.error("Enter a valid quantity");

    setSaving(true);
    try {
      const res = await fetch("/api/farm/inventory/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, product, action: "add", quantity: Number(quantity), date, reason: reason.trim() || "New batch arrived", notes: notes.trim() || undefined }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save");
      setSavedId(result.id || result.data?.id || null);
      setRequestId(crypto.randomUUID());
      setQuantity(""); setReason(""); setNotes("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      toast.success("Stock added!");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ backgroundColor: "#dcfce7", borderLeft: "4px solid #16a34a" }}>
        <PlusSquare className="h-6 w-6 text-green-700 flex-shrink-0" />
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold text-green-700">Inventory</p>
          <p className="text-xl font-bold text-gray-900">Add New Stock</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date</label>
          <input type="date" max={today}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
            value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Animal Type</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-3">
            {ANIMALS.map((a) => (
              <button key={a.value} onClick={() => setProduct(a.value)}
                className="rounded-xl py-2.5 text-xs font-semibold border transition-all"
                style={{
                  backgroundColor: product === a.value ? "#16a34a" : "transparent",
                  borderColor: product === a.value ? "#16a34a" : "#e5e7eb",
                  color: product === a.value ? "#fff" : "#6b7280",
                }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Quantity *</label>
          <input type="number" inputMode="numeric"
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
            placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Reason / Source</label>
          <input className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
            placeholder="e.g. New batch from supplier" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Notes <span className="font-normal normal-case text-gray-400">(optional)</span></label>
          <input className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
            placeholder="Any extra info..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {savedId && <FarmCorrectionRequest recordType="inventory_transaction" recordId={savedId} label="Request correction to saved record" />}
      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-sm text-white disabled:opacity-60"
        style={{ backgroundColor: saving ? "#9ca3af" : "#16a34a" }}>
        {showSuccess ? <><Check className="h-5 w-5" />Stock Added!</> : saving ? "Saving..." : "Add Stock"}
      </button>
      <InventoryActivity action="add" refreshKey={savedId} />
    </div>
  );
}
