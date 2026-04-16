"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Droplets, Check } from "lucide-react";

const FEED_TYPES = [
  { value: "fish", label: "Fish Feed" },
  { value: "goat", label: "Goat Feed" },
  { value: "chicken", label: "Chicken Feed" },
  { value: "pig", label: "Pig Feed" },
  { value: "turkey", label: "Turkey Feed" },
  { value: "other", label: "Other Feed" },
];

interface FeedRecord {
  id: string;
  date: string;
  feed_type: string;
  feed_source: "local" | "foreign";
  num_bags: number;
  notes?: string;
}

function fmtDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-NG", {
    weekday: "short", day: "numeric", month: "short",
  });
}

export default function DailyFeedPage() {
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => {
    const t = new Date().toISOString().split("T")[0];
    setToday(t);
    setDate(t);
  }, []);
  const [feedType, setFeedType] = useState("fish");
  const [localBags, setLocalBags] = useState("");
  const [foreignBags, setForeignBags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  async function loadRecords() {
    setLoadingRecords(true);
    try {
      const res = await fetch("/api/farm/daily-feed?limit=30").then((r) => r.json());
      setRecords(res.data || []);
    } catch { /* silent */ }
    finally { setLoadingRecords(false); }
  }

  useEffect(() => { loadRecords(); }, []);

  async function handleSave() {
    if (!date) return toast.error("Select a date");
    const local = Number(localBags);
    const foreign = Number(foreignBags);
    if (local <= 0 && foreign <= 0) return toast.error("Enter at least one bag count (Local or Foreign)");

    setSaving(true);
    try {
      // Submit one or two records depending on what was filled
      const calls: Promise<Response>[] = [];

      if (local > 0) {
        calls.push(fetch("/api/farm/daily-feed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, feed_type: feedType, num_bags: local, feed_source: "local", notes: notes.trim() || undefined }),
        }));
      }
      if (foreign > 0) {
        calls.push(fetch("/api/farm/daily-feed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, feed_type: feedType, num_bags: foreign, feed_source: "foreign", notes: notes.trim() || undefined }),
        }));
      }

      const results = await Promise.all(calls);
      if (results.some((r) => !r.ok)) throw new Error();

      setLocalBags("");
      setForeignBags("");
      setNotes("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      toast.success("Feed usage recorded!");
      await loadRecords();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  const feedLabel = (type: string) => FEED_TYPES.find((f) => f.value === type)?.label ?? type;

  // Group records by date for display
  const grouped = records.reduce<Record<string, FeedRecord[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  return (
    <div className="max-w-lg space-y-4">
      {/* Header */}
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
        style={{ backgroundColor: "#e0f2fe", borderLeft: "4px solid #0284c7" }}>
        <Droplets className="h-6 w-6 text-blue-600 flex-shrink-0" />
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold text-blue-600">Daily Log</p>
          <p className="text-xl font-bold text-gray-900">Feed Usage</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        {/* Date */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date</label>
          <input type="date" max={today}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Feed type */}
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

        {/* Local / Foreign bags — side by side */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Number of Bags Used
          </label>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 p-3" style={{ backgroundColor: "#f0fdf4" }}>
              <p className="text-xs font-bold text-green-700 mb-1.5">Local</p>
              <input
                type="number"
                inputMode="numeric"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-center font-bold focus:outline-none focus:border-green-400 bg-white"
                placeholder="0"
                value={localBags}
                onChange={(e) => setLocalBags(e.target.value)}
              />
              <p className="text-xs text-center text-gray-400 mt-1">bags</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-3" style={{ backgroundColor: "#eff6ff" }}>
              <p className="text-xs font-bold text-blue-700 mb-1.5">Foreign</p>
              <input
                type="number"
                inputMode="numeric"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-center font-bold focus:outline-none focus:border-blue-400 bg-white"
                placeholder="0"
                value={foreignBags}
                onChange={(e) => setForeignBags(e.target.value)}
              />
              <p className="text-xs text-center text-gray-400 mt-1">bags</p>
            </div>
          </div>
          {/* Total */}
          {(Number(localBags) > 0 || Number(foreignBags) > 0) && (
            <p className="mt-2 text-xs text-center text-gray-500">
              Total: <span className="font-bold text-gray-800">
                {Number(localBags || 0) + Number(foreignBags || 0)} bag{(Number(localBags || 0) + Number(foreignBags || 0)) !== 1 ? "s" : ""}
              </span>
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Notes <span className="font-normal normal-case text-gray-400">(optional)</span>
          </label>
          <input
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            placeholder="Any notes..." value={notes}
            onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60"
        style={{ backgroundColor: saving ? "#9ca3af" : "#0284c7" }}>
        {showSuccess ? <><Check className="h-5 w-5" />Saved!</> : saving ? "Saving..." : "Record Feed Usage"}
      </button>

      {/* Recent records grouped by date */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Recent Feed Logs</p>
        {loadingRecords ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No records yet</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([d, items]) => (
              <div key={d}>
                <p className="text-xs font-semibold text-gray-400 mb-1.5">{fmtDate(d)}</p>
                <div className="space-y-1.5">
                  {items.map((r) => (
                    <div key={r.id} className="bg-white rounded-xl p-3.5 border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{feedLabel(r.feed_type)}</p>
                        <span
                          className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: r.feed_source === "foreign" ? "#eff6ff" : "#f0fdf4",
                            color: r.feed_source === "foreign" ? "#1d4ed8" : "#15803d",
                          }}>
                          {r.feed_source === "foreign" ? "Foreign" : "Local"}
                        </span>
                      </div>
                      <p className="font-bold text-blue-600">
                        {r.num_bags} bag{r.num_bags !== 1 ? "s" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
