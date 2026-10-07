"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {useAuth} from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Droplets, Check } from "lucide-react";

const FEED_TYPES = [
  { value: "fish", label: "Fish Feed" },
  { value: "goat", label: "Goat Feed" },
  { value: "chicken", label: "Chicken Feed" },
  { value: "pig", label: "Pig Feed" },
  { value: "turkey", label: "Turkey Feed" },
  { value: "cattle", label: "Cattle Feed" },
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

export default function DailyFeed({admin=false}: {admin?:boolean}) {
  const {profile}=useAuth();
  const [localOpened,setLocalOpened]=useState("0"),[foreignOpened,setForeignOpened]=useState("0");
  const [saveError,setSaveError]=useState("");
  const [uncertain,setUncertain]=useState(false);
  const lock=useRef(false);
  const pending=useRef<{id:string;payload:Record<string,unknown>}[]>([]);
  const storageKey=profile?`primefield-daily-feed-retry:${profile.id}`:null;
  useEffect(()=>{if(!storageKey)return;try{pending.current=JSON.parse(localStorage.getItem(storageKey)||"[]");setUncertain(!!pending.current.length);if(pending.current.length){const first=pending.current[0].payload;setDate(String(first.date));setFeedType(String(first.feed_type));setNotes(String(first.notes??""));const local=pending.current.find(row=>row.payload.feed_source==="local")?.payload;const foreign=pending.current.find(row=>row.payload.feed_source==="foreign")?.payload;setLocalBags(local?String(local.num_bags):"");setForeignBags(foreign?String(foreign.num_bags):"");setLocalOpened(local?String(local.bags_opened):"0");setForeignOpened(foreign?String(foreign.bags_opened):"0");}}catch{toast.error("Cannot read saved feed submission; check history before retrying.");setUncertain(true);}},[storageKey]);
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => {
    const t = new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    setToday(t);
    setDate(pending.current.length?String(pending.current[0].payload.date):t);
  }, []);
  const [feedType, setFeedType] = useState("fish");
  const [localBags, setLocalBags] = useState("");
  const [foreignBags, setForeignBags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stockRows,setStockRows]=useState<{feed_type:string;feed_source:string;current_bags:number|null;initialized_at:string|null}[]>([]);
  const [stockError,setStockError]=useState("");
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  async function loadRecords() {
    setLoadingRecords(true);
    try {
      const response=await fetch("/api/farm/daily-feed?limit=30",{cache:"no-store"});const res=await response.json();if(!response.ok)throw Error(res.error||"Unable to load feed history");setRecords(res.data||[]);
      const stockResponse=await fetch("/api/farm/feed-stock",{cache:"no-store"});const stocks=await stockResponse.json();if(!stockResponse.ok)throw Error(stocks.error||"Unable to load available bags");setStockRows(stocks.data??[]);setStockError("");
    } catch(error) {setStockError(error instanceof Error?error.message:"Unable to load feed history and available bags");}
    finally { setLoadingRecords(false); }
  }

  useEffect(() => { loadRecords(); }, []);

  async function handleSave() {
    if(lock.current)return;
    setSaveError("");
    if(!storageKey)return toast.error("Sign in before recording feed activity");
    const hadPending=pending.current.length>0;
    if(!pending.current.length){
      if(!date)return toast.error("Select a date");
      const values=[{feed_source:"local",num_bags:Number(localBags),bags_opened:Number(localOpened)},{feed_source:"foreign",num_bags:Number(foreignBags),bags_opened:Number(foreignOpened)}];
      if(values.every(row=>row.num_bags<=0))return toast.error("Enter at least one feeding quantity");
      if(values.some(row=>!Number.isFinite(row.num_bags)||row.num_bags<0||!Number.isInteger(row.bags_opened)||row.bags_opened<0||(row.bags_opened>0&&row.num_bags<=0)))return toast.error("New bags opened must be a whole nonnegative count with a feeding entry");
      pending.current=values.filter(row=>row.num_bags>0).map(row=>({id:crypto.randomUUID(),payload:{date,feed_type:feedType,...row,notes:notes.trim()||undefined}}));
    }
    lock.current=true;setSaving(true);
    function persist(){localStorage.setItem(storageKey!,JSON.stringify(pending.current));}
    try{persist();}catch{if(!hadPending)pending.current=[];lock.current=false;setSaving(false);setUncertain(hadPending);setSaveError("Device storage is unavailable. Feed entry was not sent.");return toast.error("Device storage is unavailable. Feed entry was not sent.");}
    setUncertain(true);
    try{
      while(pending.current.length){
        const saved=pending.current[0];
        const response=await fetch("/api/farm/daily-feed",{method:"POST",headers:{"Content-Type":"application/json","X-Request-ID":saved.id},body:JSON.stringify(saved.payload)});
        const result=await response.json();
        if(!response.ok)throw Error(result.error||"Unable to confirm feed submission");
        pending.current.shift();persist();
      }
      setUncertain(false);setLocalBags("");setForeignBags("");setLocalOpened("0");setForeignOpened("0");setNotes("");setShowSuccess(true);setTimeout(()=>setShowSuccess(false),2000);toast.success("Feed activity and stock movement saved");await loadRecords();
    }catch(error){const message=error instanceof Error?error.message:"Unconfirmed submission. Retry the saved entry; its bag count stays locked.";setSaveError(message);toast.error(message);}finally{lock.current=false;setSaving(false);}
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

      <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Record feeding quantities separately from new bags opened. Opening a new bag deducts it immediately. Feeding from an already opened bag uses 0 new bags. <Link className="font-semibold underline" href={admin?"/dashboard/farm/feed-stock":"/feed-stock"}>View available feed and history</Link>.</p>
      {stockError?<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{stockError}</p>:<div className="grid grid-cols-2 gap-3">{["local","foreign"].map(source=>{const stock=stockRows.find(row=>row.feed_type===feedType&&row.feed_source===source);return <p key={source} className="rounded-xl border bg-white p-3 text-sm"><span className="font-semibold capitalize">{feedType} {source}</span><br/>{stock?.initialized_at&&stock.current_bags!==null?`${stock.current_bags} bags available`:"Awaiting physical opening count"}</p>;})}</div>}
      {saveError&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{saveError}</p>}
      {uncertain&&<p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">A saved entry is awaiting confirmation. Retry it without changing its values. Confirmed entries are not sent again.</p>}
      <fieldset disabled={saving||uncertain} className="min-w-0 space-y-4">
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
            Feeding quantity (bag equivalents)
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

        <div className="grid grid-cols-2 gap-3">{[{label:"Local new bags opened",value:localOpened,set:setLocalOpened},{label:"Foreign new bags opened",value:foreignOpened,set:setForeignOpened}].map(field=><label key={field.label} className="text-sm font-semibold">{field.label}<input aria-label={field.label} type="number" min={0} step={1} inputMode="numeric" className="mt-2 w-full rounded-xl border p-3" value={field.value} onChange={event=>field.set(event.target.value)}/></label>)}</div>
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

      </fieldset>
      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60"
        style={{ backgroundColor: saving ? "#9ca3af" : "#0284c7" }}>
        {showSuccess ? <><Check className="h-5 w-5" />Saved!</> : saving ? "Saving..." : uncertain ? "Retry saved feed entry" : "Record Feed Usage"}
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
