"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Droplets, Check } from "lucide-react";

const FEED_TYPES = [
  { value: "fish", label: "Fish Feed" },
  { value: "goat", label: "Goat Feed" },
  { value: "chicken", label: "Chicken Feed" },
  { value: "other", label: "Other Feed" },
];

interface FeedRecord {
  id: string;
  date: string;
  feed_type: string;
  num_bags: number;
  notes?: string;
}

function fmtDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}

export default function DailyFeedPage() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [feedType, setFeedType] = useState("fish");
  const [numBags, setNumBags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  async function loadRecords() {
    setLoadingRecords(true);
    try {
      const res = await fetch("/api/farm/daily-feed?limit=20").then((r) => r.json());
      setRecords(res.data || []);
    } catch { /* silent */ }
    finally { setLoadingRecords(false); }
  }

  useEffect(() => { loadRecords(); }, []);

  async function handleSave() {
    if (!date) return toast.error("Select a date");
    if (!numBags || Number(numBags) <= 0) return toast.error("Enter number of bags");

    setSaving(true);
    try {
      const res = await fetch("/api/farm/daily-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, feed_type: feedType, num_bags: Number(numBags), notes: notes.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      setNumBags("");
      setNotes("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      toast.success("Feed usage recorded!");
      await loadRecords();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  const feedLabel = (type: string) => FEED_TYPES.find((f) => f.value === type)?.label ?? type;

  return (
    <div className="max-w-lg space-y-4">
      {/* Header */}
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ backgroundColor: "#e0f2fe", borderLeft: "4px solid #0284c7" }}>
        <Droplets className="h-6 w-6 text-blue-600 flex-shrink-0" />
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold text-blue-600">Daily Log</p>
          <p className="text-xl font-bold text-gray-900">Feed Usage</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date</label>
          <input type="date" max={today}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Type of Feed</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {FEED_TYPES.map((f) => (
              <button key={f.value} onClick={() => setFeedType(f.value)}
                className="rounded-xl py-2.5 text-xs font-semibold border transition-all"
                style={{
                  backgroundColor: feedType === f.value ? "#0284c7" : "transparent",
                  borderColor: feedType === f.value ? "#0284c7" : "#e5e7eb",
                  color: feedType === f.value ? "#fff" : "#6b7280",
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Number of Bags *</label>
          <input type="number" inputMode="numeric"
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            placeholder="0" value={numBags} onChange={(e) => setNumBags(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Notes <span className="font-normal normal-case text-gray-400">(optional)</span></label>
          <input className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            placeholder="Any notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60"
        style={{ backgroundColor: saving ? "#9ca3af" : "#0284c7" }}>
        {showSuccess ? <><Check className="h-5 w-5" />Saved!</> : saving ? "Saving..." : "Record Feed Usage"}
      </button>

      {/* Recent records */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Recent Feed Logs</p>
        {loadingRecords ? (
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No records yet</p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-3.5 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{feedLabel(r.feed_type)}</p>
                  <p className="text-xs text-gray-400">{fmtDate(r.date)}</p>
                </div>
                <p className="font-bold text-blue-600">{r.num_bags} bag{r.num_bags !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
