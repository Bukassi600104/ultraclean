"use client";
import {useCallback,useEffect,useRef,useState,type ReactNode} from "react";
import Link from "next/link";
import {useManagerFetch,useManagerPeriod,useManagerStorageKey} from "@/contexts/ManagerPeriodContext";
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {farmProductLabel} from "@/lib/farm-products";
import {livestockGroupLabel,type LivestockGroup} from "@/lib/farm-livestock-categories";
import type {HandoverState,HandoverItem,HandoverDecision} from "@/lib/manager-handover-types";
const button="inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50";
export function ManagerHandoverGate({children}:{children:ReactNode}){const scope=useManagerPeriod();return scope?.status==="awaiting_handover"?<ManagerHandover/>:children;}
export function ManagerHandover({onComplete=()=>window.location.assign("/manager")}:{onComplete?:()=>void}){
 const send=useManagerFetch(),scope=useManagerPeriod(),storageKey=useManagerStorageKey(scope?"primefield-handover-retry:"+scope.actorId:null);
 const [state,setState]=useState<HandoverState|null>(null),[step,setStep]=useState(0),[error,setError]=useState(""),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[retry,setRetry]=useState<HandoverDecision|null>(null);
 const lock=useRef(false),finishButton=useRef<HTMLButtonElement|null>(null);
 const load=useCallback(async()=>{setError("");try{const response=await send("/api/operations/handover",{cache:"no-store"}),body=await response.json();if(!response.ok)throw Error(body.error||"Unable to load your handover");setState(body);}catch(e){setError((e as Error).message);}},[send]);
 useEffect(()=>{void load();if(storageKey){try{const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved)setRetry(saved);}catch{setError("Saved confirmation could not be read. It remains on this device for review.");}}},[load,storageKey]);
 async function write(operation:"save"|"finalize",items:HandoverDecision["items"]){
  if(lock.current||!state?.sessionId||!storageKey)return;
  if(!navigator.onLine){setError("Connect to the internet to verify and save these confirmations.");return;}
  lock.current=true;setBusy(true);setError("");
  const body=retry||{operation,items,sessionId:state.sessionId,requestId:crypto.randomUUID()};
  try{
   localStorage.setItem(storageKey,JSON.stringify(body));setRetry(body);
   const response=await send("/api/operations/handover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),result=await response.json();
   if(!response.ok&&!result.steps)throw Error(result.error||"Confirmation could not be saved. Retry the same confirmation.");
   setState(result);localStorage.removeItem(storageKey);setRetry(null);
   if(result.conflict){setConfirm(false);setError(result.conflict==="inventory_changed"?"Inventory changed while you were checking. Please confirm the changed items again.":"Confirm every recorded item before continuing.");return;}
   if(operation==="finalize"||body.operation==="finalize"){setConfirm(false);onComplete();}
  }catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 const items=state?.steps.flatMap(s=>s.items)||[],confirmed=items.filter(i=>i.status==="confirmed").length,current=state?.steps[Math.min(step,state.steps.length-1)],complete=!!state&&items.every(i=>i.status==="confirmed"&&i.quantity!==null);
 function decide(item:HandoverItem,status:"confirmed"|"cannot_confirm"){void write("save",[{itemId:item.itemId,version:item.version,status}]);}
 return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:py-10"><section className="mx-auto max-w-2xl space-y-5">
  <header><p className="text-sm font-semibold text-emerald-800">Primefield Farm</p><h1 className="mt-2 text-2xl font-bold">Confirm your farm handover</h1><p className="mt-2 text-sm text-slate-600">Check what is on the farm, then tick what you have confirmed. These quantities stay in the business records. Your own money and activity start separately.</p></header>
  {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}<button className={button+" ml-2"} disabled={busy} onClick={()=>retry?void write(retry.operation,retry.items):void load()}>{retry?"Retry saved confirmation":"Refresh inventory"}</button></div>}
  {!state?(!error&&<p role="status">Loading the recorded inventory…</p>):state.status==="active"?<div className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Your workspace is ready</h2><p className="mt-2 text-sm text-slate-600">Your handover is complete. Existing quantities and earlier records have been preserved.</p><Link className={button+" mt-4 bg-emerald-800 text-white"} href="/manager">Continue to dashboard</Link></div>:<>
   <div className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><span>Step {state.steps.length?Math.min(step+1,state.steps.length):1} of {state.steps.length||1}</span><span>{confirmed} of {items.length} confirmed</span></div><progress className="mt-3 h-2 w-full accent-emerald-700" aria-label="Handover progress" max={Math.max(items.length,1)} value={confirmed}/><p className="mt-2 text-xs text-slate-600">Inventory checked at {new Date(state.asOf).toLocaleString()}</p></div>
   {current?<div className="space-y-3"><h2 className="text-lg font-semibold">{current.title}</h2>{current.items.map(item=><article key={item.itemId} className="rounded-xl border bg-white p-4"><div className="flex items-start gap-3"><input id={item.itemId} type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-emerald-800" checked={item.status==="confirmed"} disabled={busy||!!retry||item.quantity===null} onChange={()=>decide(item,item.status==="confirmed"?"cannot_confirm":"confirmed")}/><label className="min-w-0 flex-1 cursor-pointer break-words py-1" htmlFor={item.itemId}><span className="block font-semibold">{item.resource==="farm_inventory"?farmProductLabel(item.label):item.label}</span><span className="mt-1 block text-sm text-slate-600">{item.quantity===null?"Starting count has not been recorded":item.quantity+" "+item.unit}</span></label></div>
    {item.details?.length>0&&<ul className="mt-3 space-y-1 pl-9 text-xs text-slate-600">{item.details.map((detail,index)=><li key={detail.id||"unclassified:"+index}>{livestockGroupLabel(detail as unknown as LivestockGroup)}: {detail.quantity}</li>)}</ul>}
    {item.quantity===null&&<p className="mt-3 text-sm text-amber-900">The manager records the actual starting bag count in <Link className="inline-flex min-h-11 items-center font-semibold underline" href="/manager/feed-stock">Feed Inventory</Link>. Bimbo does not need to enter it again.</p>}
    <div className="mt-3 flex flex-wrap items-center gap-3"><button disabled={busy||!!retry} className={button+" text-amber-900"} onClick={()=>decide(item,"cannot_confirm")}>Cannot confirm</button><span role="status" className="text-xs text-slate-600">{item.status==="confirmed"?"Confirmed":item.status==="cannot_confirm"?"Flagged for Bimbo to review":"Awaiting your check"}</span></div>
   </article>)}</div>:<p className="rounded-xl border bg-white p-5 text-sm text-slate-600">There are no recorded inventory items to hand over. No quantities will be added.</p>}
   {state.issues.length>0&&<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Items you cannot confirm remain visible to Bimbo. A missing starting feed count can be recorded by the manager. Once an item is checked or corrected, refresh and confirm it.</p>}
   <nav aria-label="Handover steps" className="flex flex-wrap justify-between gap-3"><button className={button} disabled={step===0||busy||!!retry} onClick={()=>setStep(s=>s-1)}>Back</button>{step<state.steps.length-1?<button className={button+" bg-emerald-800 text-white"} disabled={busy||!!retry} onClick={()=>setStep(s=>s+1)}>Next step</button>:<button ref={finishButton} className={button+" bg-emerald-800 text-white"} disabled={!complete||busy||!!retry} onClick={()=>setConfirm(true)}>Finish handover</button>}</nav>
  </>}
  {busy&&<p role="status" className="text-sm text-slate-600">Saving your confirmation…</p>}
  <Dialog open={confirm} onOpenChange={open=>{if(!busy)setConfirm(open);}}><DialogContent onCloseAutoFocus={event=>{event.preventDefault();finishButton.current?.focus();}} className="[&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl"><DialogHeader className="pr-12"><DialogTitle>Have you checked everything?</DialogTitle><DialogDescription>Confirm that you have physically checked the listed inventory. The app will verify the latest quantities before opening your dashboard.</DialogDescription></DialogHeader><DialogFooter className="gap-2"><button className={button} disabled={busy} onClick={()=>setConfirm(false)}>Go back</button><button className={button+" bg-emerald-800 text-white"} disabled={busy||!complete} onClick={()=>void write("finalize",items.map(item=>({itemId:item.itemId,version:item.version,status:"confirmed"})))}>{busy?"Verifying…":"Yes, I have checked everything"}</button></DialogFooter></DialogContent></Dialog>
 </section></main>;
}
