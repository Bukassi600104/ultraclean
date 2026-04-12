"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Skull, Check } from "lucide-react";

const ANIMALS = [
  { value: "catfish", label: "Catfish" },
  { value: "goat", label: "Goat" },
  { value: "chicken", label: "Chicken" },
];

export default function MortalityPage() {
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => {
    const t = new Date().toISOString().split("T")[0];
    setToday(t);
    setDate(t);
  }, []);
  const [product, setProduct] = useState("catfish");
  const [quantity, setQuantity] = useState("");
  const [cause, setCause] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleSave() {
    if (!quantity || Number(quantity) <= 0) return toast.error("Enter number of deaths");

    setSaving(true);
    try {
      const res = await fetch("/api/farm/inventory/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, action: "mortality", quantity: Number(quantity), date, reason: cause.trim() || "Unknown", notes: notes.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      setQuantity(""); setCause(""); setNotes("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      toast.success("Mortality recorded.");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ backgroundColor: "#fee2e2", borderLeft: "4px solid #dc2626" }}>
        <Skull className="h-6 w-6 text-red-600 flex-shrink-0" />
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold text-red-600">Inventory</p>
          <p className="text-xl font-bold text-gray-900">Record Mortality</p>
          <p className="text-xs text-gray-500 mt-0.5">This will reduce your livestock count</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date of Death</label>
          <input type="date" max={today}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
            value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Animal Type</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {ANIMALS.map((a) => (
              <button key={a.value} onClick={() => setProduct(a.value)}
                className="rounded-xl py-2.5 text-xs font-semibold border transition-all"
                style={{
                  backgroundColor: product === a.value ? "#dc2626" : "transparent",
                  borderColor: product === a.value ? "#dc2626" : "#e5e7eb",
                  color: product === a.value ? "#fff" : "#6b7280",
                }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Number of Deaths *</label>
          <input type="number" inputMode="numeric"
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
            placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Cause of Death</label>
          <input className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
            placeholder="e.g. Disease, Injury, Unknown" value={cause} onChange={(e) => setCause(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Notes <span className="font-normal normal-case text-gray-400">(optional)</span></label>
          <input className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm"
            placeholder="Any extra info..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-sm text-white disabled:opacity-60"
        style={{ backgroundColor: saving ? "#9ca3af" : "#dc2626" }}>
        {showSuccess ? <><Check className="h-5 w-5" />Recorded!</> : saving ? "Saving..." : "Record Mortality"}
      </button>
    </div>
  );
}
