"use client";
import {useEffect,useRef,useState} from "react";
import {useManagerFetch,useManagerPeriod,useManagerStorageKey} from "@/contexts/ManagerPeriodContext";
import {useAuth} from "@/contexts/AuthContext";
import {farmDateToday} from "@/lib/farm-products";
import {FEED_TYPES,type FeedInventoryRow} from "@/lib/farm-feed-types";
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from "@/components/ui/dialog";
const input="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm";
const actions={starting:"Starting bag count",received:"Feed received",opened:"Bags opened for feeding",problem:"Report a count problem"};
type Action=keyof typeof actions;
type Form={operation:Action;type:string;source:string;date:string;bags:string;notes:string;review:boolean;included:string;inclusions:Record<string,string>};
type Saved={id:string;body:Record<string,unknown>};
export function FeedRecordDialog({open,onOpenChange,stocks,onSaved,returnFocus}:{open:boolean;onOpenChange:(value:boolean)=>void;stocks:FeedInventoryRow[];onSaved:()=>void;returnFocus:()=>void}){
 const send=useManagerFetch(),scope=useManagerPeriod(),{profile}=useAuth(),key=useManagerStorageKey(profile?"primefield-feed-record:"+profile.id:null),setup=scope?.status==="awaiting_handover";
 const [form,setForm]=useState<Form>({operation:setup?"starting":"opened",type:"fish",source:"local",date:farmDateToday(),bags:"",notes:"",review:false,included:"",inclusions:{}}),[pending,setPending]=useState<Saved|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[countRows,setCountRows]=useState(stocks),[countError,setCountError]=useState(""),[countLoading,setCountLoading]=useState(false);
 const lock=useRef(false),restored=useRef(false);
 useEffect(()=>{if(!key)return;try{const saved=JSON.parse(localStorage.getItem(key)||"null");if(saved?.form)setForm(saved.form);if(saved?.pending)setPending(saved.pending);restored.current=true;}catch{setError("Your saved feed entry could not be read. It remains on this device for review.");}},[key]);
 useEffect(()=>{if(!key||!restored.current)return;try{localStorage.setItem(key,JSON.stringify({form,pending}));}catch{setError("Device storage is unavailable. Your entry has not been sent.");}},[key,form,pending]);
 useEffect(()=>{if(!open)return;let current=true;setCountLoading(true);setCountError("");send("/api/farm/feed-stock?date="+encodeURIComponent(form.date)).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error||"Unable to check dated deliveries");if(current)setCountRows(b.data||[]);}).catch(e=>{if(current)setCountError(e.message);}).finally(()=>{if(current)setCountLoading(false);});return()=>{current=false;};},[open,form.date,send]);
 const selected=countRows.find(s=>s.feed_type===form.type&&s.feed_source===form.source),sameDay=(selected?.uncounted_receipts||[]).filter(r=>r.date===form.date);
 const update=<K extends keyof Form>(name:K,value:Form[K])=>setForm(old=>({...old,[name]:value}));
 async function save(){
  if(lock.current||!key)return;
  let saved=pending;
  if(!saved){
   if(form.operation==="starting"&&(countLoading||countError))return setError("Wait for the dated delivery check before saving this count.");
   if(!form.date||!/^\d+$/.test(form.bags)||Number(form.bags)>99999999||(["received","opened"].includes(form.operation)&&Number(form.bags)<1))return setError("Choose the actual date and enter a whole bag count.");
   if(form.operation==="problem"&&!form.notes.trim())return setError("Describe the count problem for Bimbo.");
   if(form.operation==="starting"&&sameDay.some(r=>!form.inclusions[r.id]))return setError("Confirm whether each delivery on the count date is included.");
   if(form.operation==="received"&&selected?.opening_date&&form.date<=selected.opening_date&&!form.included)return setError("Confirm whether these bags were included in the starting count.");
   saved={id:crypto.randomUUID(),body:{operation:form.operation,payload:{date:form.date,feed_type:form.type,feed_source:form.source,bags:Number(form.bags),...(form.notes.trim()?{notes:form.notes.trim()}:{}),...(form.review&&form.operation!=="problem"?{request_review:true}:{}),...(form.operation==="received"&&form.included?{included_in_starting_count:form.included==="yes"}:{}),...(form.operation==="starting"?{receipt_inclusions:sameDay.map(r=>({movement_id:r.id,included:form.inclusions[r.id]==="yes"}))}:{})}}};
  }
  lock.current=true;setBusy(true);setError("");
  try{
   localStorage.setItem(key,JSON.stringify({form,pending:saved}));setPending(saved);
   const response=await send("/api/farm/feed-stock",{method:"POST",headers:{"Content-Type":"application/json","X-Request-ID":saved.id},body:JSON.stringify(saved.body)}),body=await response.json();
   if(!response.ok)throw Error(body.error||"Unable to confirm this feed entry. Retry the saved entry.");
   localStorage.removeItem(key);setPending(null);setForm(old=>({...old,bags:"",notes:"",review:false,included:"",inclusions:{}}));onOpenChange(false);onSaved();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);lock.current=false;}
 }
 return <Dialog open={open} onOpenChange={value=>{if(!busy)onOpenChange(value);}}><DialogContent onCloseAutoFocus={e=>{e.preventDefault();returnFocus();}} className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg flex-col rounded-xl [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11">
  <DialogHeader className="shrink-0 pr-12"><DialogTitle>Add feed record</DialogTitle><DialogDescription>Enter what actually happened. Bimbo sees the record automatically.</DialogDescription></DialogHeader>
  <div className="min-h-0 space-y-4 overflow-y-auto pr-1 text-slate-900">
   {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}{pending&&<p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">This entry is awaiting confirmation. Its date and values are kept for a safe retry. A closed date needs Bimbo&apos;s review.</p>}
   <fieldset disabled={busy||!!pending} className="min-w-0 space-y-4 text-sm">
    <label className="block font-medium">Activity<select aria-label="Activity" className={input} value={form.operation} onChange={e=>update("operation",e.target.value as Action)}>{Object.entries(actions).filter(([action])=>!setup||action==="starting").map(([action,label])=><option key={action} value={action}>{label}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-3"><label className="min-w-0 font-medium">Feed type<select aria-label="Feed type" className={input} value={form.type} onChange={e=>update("type",e.target.value)}>{FEED_TYPES.map(type=><option key={type} value={type}>{type[0].toUpperCase()+type.slice(1)}</option>)}</select></label><label className="min-w-0 font-medium">Source<select aria-label="Source" className={input} value={form.source} onChange={e=>update("source",e.target.value)}><option value="local">Local</option><option value="foreign">Foreign</option></select></label></div>
    <label className="block font-medium">Activity date<input type="date" max={farmDateToday()} className={input} value={form.date} onChange={e=>update("date",e.target.value)}/></label>
    <label className="block font-medium">{form.operation==="problem"||form.operation==="starting"?"Actual unopened bags counted":"Number of whole bags"}<input type="number" inputMode="numeric" step={1} min={form.operation==="received"||form.operation==="opened"?1:0} max={99999999} className={input} value={form.bags} onChange={e=>update("bags",e.target.value)}/></label>
    {form.operation==="starting"&&<><p className="text-slate-600">Count the whole unopened bags physically present on this date. This starting count is recorded once.</p>{countError?<p role="alert" className="text-red-900">{countError}</p>:sameDay.map(r=><label key={r.id} className="block rounded-lg border p-3">Were the {r.bags} bags received on {r.date} included in this count?<select className={input} value={form.inclusions[r.id]||""} onChange={e=>update("inclusions",{...form.inclusions,[r.id]:e.target.value})}><option value="">Choose</option><option value="yes">Yes, already included</option><option value="no">No, received after this count</option></select></label>)}</>}
    {form.operation==="received"&&selected?.opening_date&&form.date<=selected.opening_date&&<label className="block">Were these bags already included in the starting count on {selected.opening_date}?<select className={input} value={form.included} onChange={e=>update("included",e.target.value)}><option value="">Choose</option><option value="yes">Yes, already included</option><option value="no">No</option></select></label>}
    {form.operation==="opened"&&<p className="text-slate-600">This removes unopened bags once. Record the quantity fed separately in Daily Feed, using zero new bags for an opening already recorded here.</p>}
    {form.operation==="problem"&&<p className="text-slate-600">Bimbo can approve or decline this proposed count after reviewing it. The current count stays unchanged until then.</p>}
    <label className="block font-medium">{form.operation==="problem"?"Explain the count problem":"Notes (optional)"}<textarea aria-label={form.operation==="problem"?"Explain the count problem":"Notes (optional)"} className={input} rows={2} maxLength={2000} value={form.notes} onChange={e=>update("notes",e.target.value)}/></label>
    {form.operation!=="problem"&&<label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5 shrink-0" checked={form.review} onChange={e=>update("review",e.target.checked)}/>Ask Bimbo to review this record (optional)</label>}
   </fieldset>
  </div><DialogFooter className="shrink-0 gap-2"><button className="min-h-11 rounded-lg border px-4 text-sm" disabled={busy} onClick={()=>onOpenChange(false)}>Close</button><button className="min-h-11 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={busy||(!pending&&form.operation==="starting"&&(!!countError||countLoading))} onClick={()=>void save()}>{busy?"Saving…":pending?"Retry saved entry":"Save feed record"}</button></DialogFooter>
 </DialogContent></Dialog>;
}
