"use client";
import {useManagerFetch,useManagerStorageKey,useOperationsFeature} from "@/contexts/ManagerPeriodContext";


import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {useAuth} from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Droplets, Check } from "lucide-react";
import {sumMoney} from "@/lib/money";
import type {FeedActivity,FeedInventoryRow} from "@/lib/farm-feed-types";
import {feedSubmissionRejected} from "@/lib/feed-submission";
import {FeedRecordDialog,type FeedCountTarget} from "./FeedRecordDialog";

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

type SavedFeed={id:string;payload:Record<string,unknown>};
const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
const isId=(value:unknown)=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function isDate(value:unknown){if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(value+"T12:00:00Z");return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;}
function validPending(value:unknown):value is SavedFeed[]{
 if(!Array.isArray(value)||value.length>2)return false;
 return value.every(row=>{if(!isRecord(row)||!isId(row.id)||!isRecord(row.payload))return false;const p=row.payload;return isDate(p.date)&&FEED_TYPES.some(t=>t.value===p.feed_type)&&(p.feed_source===undefined||p.feed_source==="local"||p.feed_source==="foreign")&&typeof p.num_bags==="number"&&Number.isFinite(p.num_bags)&&p.num_bags>0
  &&(p.notes==null||typeof p.notes==="string")&&(p.bags_opened===undefined||typeof p.bags_opened==="number"&&Number.isInteger(p.bags_opened)&&p.bags_opened>=0&&p.bags_opened<=99999)&&(p.opening_activity_id===undefined||isId(p.opening_activity_id))
  &&!(p.opening_activity_id&&Number(p.bags_opened)>0);})&&new Set(value.map(row=>row.id)).size===value.length&&new Set(value.map(row=>row.payload.feed_source||"local")).size===value.length;
}
function validDraft(value:unknown):value is Record<string,string>{
 return isRecord(value)&&isDate(value.date)&&FEED_TYPES.some(t=>t.value===value.feedType)&&["notes","localBags","foreignBags"].every(key=>typeof value[key]==="string")&&["localOpened","foreignOpened","localOpening","foreignOpening"].every(key=>value[key]===undefined||typeof value[key]==="string");
}

export default function DailyFeed({admin=false}: {admin?:boolean}) {
 const managerFetch=useManagerFetch(),{enabled}=useOperationsFeature();
  const {profile}=useAuth();
  const [localOpened,setLocalOpened]=useState("0"),[foreignOpened,setForeignOpened]=useState("0");
  const [localOpening,setLocalOpening]=useState(""),[foreignOpening,setForeignOpening]=useState(""),[openings,setOpenings]=useState<FeedActivity[]>([]);
  const [saveError,setSaveError]=useState("");
  const [uncertain,setUncertain]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [countFor,setCountFor]=useState<FeedCountTarget|null>(null);
  const countButton=useRef<HTMLButtonElement|null>(null);
  const lock=useRef(false);
  const pending=useRef<SavedFeed[]>([]);
  const [storageFault,setStorageFault]=useState(false),[restoredKey,setRestoredKey]=useState<string|null>(null);
  const storageKey=useManagerStorageKey(profile?`primefield-daily-feed-retry:${profile.id}`:null);
  useEffect(()=>{setRestoredKey(null);setStorageFault(false);pending.current=[];if(!storageKey)return;try{
    const rawPending=localStorage.getItem(storageKey),saved=JSON.parse(rawPending===null?"[]":rawPending);if(!validPending(saved))throw Error("Invalid saved feed submission");pending.current=saved;setUncertain(!!saved.length);
    if(saved.length){const first=saved[0].payload;setDate(String(first.date));setFeedType(String(first.feed_type));setNotes(String(first.notes??""));const local=saved.find(row=>(row.payload.feed_source||"local")==="local")?.payload,foreign=saved.find(row=>row.payload.feed_source==="foreign")?.payload;setLocalBags(local?String(local.num_bags):"");setForeignBags(foreign?String(foreign.num_bags):"");setLocalOpened(String(local?.bags_opened??0));setForeignOpened(String(foreign?.bags_opened??0));setLocalOpening(String(local?.opening_activity_id||""));setForeignOpening(String(foreign?.opening_activity_id||""));}
    else{const raw=localStorage.getItem(storageKey+":draft");if(raw!==null){const draft=JSON.parse(raw);if(!validDraft(draft))throw Error("Invalid saved feed draft");setDate(draft.date);setFeedType(draft.feedType);setNotes(draft.notes);setLocalBags(draft.localBags);setForeignBags(draft.foreignBags);setLocalOpened(draft.localOpened??"0");setForeignOpened(draft.foreignOpened??"0");setLocalOpening(draft.localOpening??"");setForeignOpening(draft.foreignOpening??"");}}
    setRestoredKey(storageKey);
   }catch{setStorageFault(true);setUncertain(true);setSaveError("Your saved feed entry could not be read. It remains on this device for recovery. Do not enter it again; ask for help recovering it.");}},[storageKey]);
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => {
    const t = new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    setToday(t);
    setDate(previous=>pending.current.length?String(pending.current[0].payload.date):previous||t);
  }, []);
  const [feedType, setFeedType] = useState("fish");
  const [localBags, setLocalBags] = useState("");
  const [foreignBags, setForeignBags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [stockRows,setStockRows]=useState<FeedInventoryRow[]>([]);
  const [stockError,setStockError]=useState("");
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  const loadRecords=useCallback(async()=>{
    setLoadingRecords(true);
    try {
      const response=await managerFetch("/api/farm/daily-feed?limit=30",{cache:"no-store"});const res=await response.json();if(!response.ok)throw Error(res.error||"Unable to load feed history");setRecords(res.data||[]);
      if(enabled!==true){setStockError("");setStockRows([]);setOpenings([]);return;}
      const stockResponse=await managerFetch("/api/farm/feed-stock",{cache:"no-store"});const stocks=await stockResponse.json();if(!stockResponse.ok)throw Error(stocks.error||"Unable to load available bags");setStockRows(stocks.data??[]);setStockError("");
      const openingResponse=await managerFetch("/api/farm/feed-stock?history=1&limit=500",{cache:"no-store"}),openingRows=await openingResponse.json();if(!openingResponse.ok)throw Error(openingRows.error||"Unable to load recorded openings");setOpenings((openingRows.data||[]).filter((row:FeedActivity)=>row.kind==="opened"&&!row.movement_type));
    } catch(error) {setRecords([]);setStockRows([]);setOpenings([]);setStockError(error instanceof Error?error.message:"Unable to load feed history and available bags");}
    finally { setLoadingRecords(false); }
  },[managerFetch,enabled]);

  useEffect(() => { loadRecords(); }, [loadRecords]);
  useEffect(()=>{if(!storageKey||restoredKey!==storageKey||storageFault||!date||uncertain)return;try{localStorage.setItem(storageKey+":draft",JSON.stringify({date,feedType,notes,localBags,foreignBags,localOpened,foreignOpened,localOpening,foreignOpening}));}catch{setSaveError("Draft could not be saved. Keep this page open and restore device storage.");}},[storageKey,restoredKey,storageFault,date,uncertain,feedType,notes,localBags,foreignBags,localOpened,foreignOpened,localOpening,foreignOpening]);

  function changeFeedType(value:string){
    if(pending.current.length)return;
    setFeedType(value);setLocalOpening("");setForeignOpening("");setDirty(true);
  }
  function changeDate(value:string){
    if(pending.current.length)return;
    setDate(value);
    const allowed=(id:string)=>openings.some(row=>row.id===id&&row.feed_type===feedType&&row.activity_date<=value);
    if(localOpening&&!allowed(localOpening))setLocalOpening("");
    if(foreignOpening&&!allowed(foreignOpening))setForeignOpening("");
  }
  async function handleSave() {
    if(lock.current||storageFault||restoredKey!==storageKey)return;
    setSaveError("");
    if(!storageKey)return toast.error("Sign in before recording feed activity");
    const hadPending=pending.current.length>0;
    if(!pending.current.length){
      if(!date)return toast.error("Select a date");
      if(enabled===true&&[{id:localOpening,source:"local"},{id:foreignOpening,source:"foreign"}].some(({id,source})=>id&&!openings.some(row=>row.id===id&&row.feed_type===feedType&&row.feed_source===source&&row.activity_date<=date)))return toast.error("Choose a recorded opening for this feed type and date, or select No opening selected.");
      const values=[{feed_source:"local",num_bags:Number(localBags),bags_opened:Number(localOpened),...(localOpening?{opening_activity_id:localOpening}:{})},{feed_source:"foreign",num_bags:Number(foreignBags),bags_opened:Number(foreignOpened),...(foreignOpening?{opening_activity_id:foreignOpening}:{})}];
      if(values.every(row=>row.num_bags<=0))return toast.error("Enter at least one feeding quantity");
      if(values.some(row=>!Number.isFinite(row.num_bags)||row.num_bags<0||!Number.isInteger(row.bags_opened)||row.bags_opened<0||(row.bags_opened>0&&(row.num_bags<=0||row.opening_activity_id))))return toast.error("New bags opened must be a whole nonnegative count. An opening already recorded uses zero new bags.");
      pending.current=values.filter(row=>row.num_bags>0).map(row=>({id:crypto.randomUUID(),payload:{date,feed_type:feedType,...(enabled===true?row:{feed_source:row.feed_source,num_bags:row.num_bags}),notes:notes.trim()||undefined}}));
    }
    lock.current=true;setSaving(true);
    function persist(){localStorage.setItem(storageKey!,JSON.stringify(pending.current));}
    try{persist();}catch{if(!hadPending)pending.current=[];lock.current=false;setSaving(false);setUncertain(hadPending);setSaveError("Device storage is unavailable. Feed entry was not sent.");return toast.error("Device storage is unavailable. Feed entry was not sent.");}
    setUncertain(true);
    try{
      while(pending.current.length){
        const saved=pending.current[0];
        const response=await managerFetch("/api/farm/daily-feed",{method:"POST",headers:{"Content-Type":"application/json","X-Request-ID":saved.id},body:JSON.stringify(saved.payload)});
        const result=await response.json();
        if(!response.ok){
          if(feedSubmissionRejected(response.status,result)){
            localStorage.setItem(storageKey+':rejected:'+saved.id,JSON.stringify({entries:pending.current,outcome:result}));
            const local=pending.current.find(row=>row.payload.feed_source==='local')?.payload,foreign=pending.current.find(row=>row.payload.feed_source==='foreign')?.payload;
            localStorage.setItem(storageKey+':draft',JSON.stringify({date,feedType,notes,localBags:local?String(local.num_bags):'',foreignBags:foreign?String(foreign.num_bags):'',localOpened:String(local?.bags_opened??0),foreignOpened:String(foreign?.bags_opened??0),localOpening:String(local?.opening_activity_id||''),foreignOpening:String(foreign?.opening_activity_id||'')}));
            localStorage.setItem(storageKey,'[]');pending.current=[];setUncertain(false);
            setLocalBags(local?String(local.num_bags):'');setForeignBags(foreign?String(foreign.num_bags):'');
            setLocalOpened(local?String(local.bags_opened??0):'0');setForeignOpened(foreign?String(foreign.bags_opened??0):'0');
          }
          throw Error(result.error||"Unable to confirm feed submission");
        }
        if(!isRecord(result?.data)||!isId(result.data.id))throw Error("The server has not confirmed this feed entry. Retry the saved entry.");
        const remaining=pending.current.slice(1);
        // Persist acknowledgement before releasing its original retry identifier.
        if(!remaining.length)localStorage.setItem(storageKey+":draft",JSON.stringify({date,feedType,notes:"",localBags:"",foreignBags:"",localOpened:"0",foreignOpened:"0",localOpening:"",foreignOpening:""}));
        localStorage.setItem(storageKey,JSON.stringify(remaining));pending.current=remaining;
      }
      setUncertain(false);setDirty(false);setLocalBags("");setForeignBags("");setLocalOpened("0");setForeignOpened("0");setLocalOpening("");setForeignOpening("");setNotes("");setShowSuccess(true);setTimeout(()=>setShowSuccess(false),2000);toast.success("Feed activity saved");await loadRecords();
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
    <div data-unsaved-changes={dirty||uncertain} onChangeCapture={() => setDirty(true)} className="mx-auto w-full max-w-lg space-y-4">
      {/* Header */}
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
        style={{ backgroundColor: "#e0f2fe", borderLeft: "4px solid #0284c7" }}>
        <Droplets className="h-6 w-6 text-blue-600 flex-shrink-0" />
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold text-blue-600">Daily Log</p>
          <p className="text-xl font-bold text-gray-900">Feed Usage</p>
        </div>
      </div>

      {enabled===true&&<>      <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Record feeding quantities separately from new bags opened. Opening a new bag deducts it immediately. Feeding from an already opened bag uses 0 new bags. <Link className="font-semibold underline" href={admin?"/dashboard/farm/feed-stock":"/feed-stock"}>View available feed and history</Link>.</p>
      {!stockError&&!loadingRecords&&<div className="grid grid-cols-2 gap-3">{["local","foreign"].map(source=>{
        const stock=stockRows.find(row=>row.feed_type===feedType&&row.feed_source===source);
        return <div key={source} className="rounded-xl border bg-white p-3 text-sm"><span className="font-semibold capitalize">{feedType} {source}</span>
          <p>{stock?.initialized_at&&stock.current_bags!==null?`${stock.current_bags} bags available`:"Starting count needed"}</p>
          {!admin&&!stock?.initialized_at&&<button type="button" aria-label={`Record starting count for ${feedType} ${source}`} className="min-h-11 text-left font-semibold text-emerald-900 underline" onClick={e=>{countButton.current=e.currentTarget;setCountFor({type:feedType,source,date:date||today});}}>Record starting count</button>}
        </div>;
      })}</div>}</>}
      {stockError&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{stockError}<button type="button" className="ml-2 min-h-11 underline" onClick={()=>void loadRecords()}>Retry feed history</button></p>}
      {saveError&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{saveError}</p>}
      {uncertain&&!storageFault&&<p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">A saved entry is awaiting confirmation. Retry it without changing its values. The original date and values are kept for a safe retry.</p>}
      {countFor&&<FeedRecordDialog open countFor={countFor} onOpenChange={v=>{if(!v)setCountFor(null);}} stocks={stockRows} onSaved={()=>void loadRecords()} returnFocus={()=>countButton.current?.focus()}/>}
      <fieldset disabled={saving||uncertain||storageFault||restoredKey!==storageKey} className="min-w-0 space-y-4">
      {/* Form */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        {/* Date */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date</label>
          <input type="date" max={today}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:outline-none focus:border-gray-400"
            value={date} onChange={(e) => changeDate(e.target.value)} />
        </div>

        {/* Feed type */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Type of Feed</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {FEED_TYPES.map((f) => (
              <button key={f.value} onClick={() => changeFeedType(f.value)}
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
                inputMode="decimal"
                step="any" min={0}
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
                inputMode="decimal"
                step="any" min={0}
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
                {sumMoney([localBags || "0",foreignBags || "0"])} bags
              </span>
            </p>
          )}
        </div>

        {enabled===true&&<>        <div className="grid grid-cols-2 gap-3">{[{label:"Local new bags opened",value:localOpened,set:setLocalOpened},{label:"Foreign new bags opened",value:foreignOpened,set:setForeignOpened}].map(field=><label key={field.label} className="text-sm font-semibold">{field.label}<input aria-label={field.label} type="number" min={0} step={1} inputMode="numeric" className="mt-2 w-full rounded-xl border p-3" value={field.value} onChange={event=>field.set(event.target.value)}/></label>)}</div>
        {[{source:"local",value:localOpening,set:setLocalOpening,opened:setLocalOpened},{source:"foreign",value:foreignOpening,set:setForeignOpening,opened:setForeignOpened}].map(field=><label key={field.source} className="block text-sm font-medium capitalize">{field.source} recorded opening (optional)<select className="mt-1 min-h-11 w-full rounded-xl border p-3 text-sm normal-case" value={field.value} onChange={e=>{field.set(e.target.value);if(e.target.value)field.opened("0");}}><option value="">No opening selected</option>{openings.filter(row=>row.feed_type===feedType&&row.feed_source===field.source&&row.activity_date<=date).map(row=><option key={row.id} value={row.id}>{row.activity_date} · {row.bags} bags opened</option>)}</select></label>)}</>}
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
      <button onClick={handleSave} disabled={saving||storageFault||restoredKey!==storageKey}
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
        ) : stockError ? null : records.length === 0 ? (
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
