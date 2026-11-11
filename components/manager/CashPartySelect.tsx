"use client";
import {useEffect} from "react";
import {useOperationsFeature} from "@/contexts/ManagerPeriodContext";
import {useAuth} from "@/contexts/AuthContext";
import {useOperationsFunds} from "@/hooks/useOperationsFunds";
import {cashReceiver,type CashReceiver} from "@/lib/operations-cash-validation";
import type {Business} from "@/lib/manager-period-types";
export function selectedCashReceiver(choice:string):CashReceiver|undefined{if(!choice)return undefined;return cashReceiver.parse(choice==="self"?{type:"self"}:choice.startsWith("manager:")?{type:"manager",period_id:choice.slice(8)}:choice.startsWith("ceo:")?{type:"ceo",profile_id:choice.slice(4)}:{type:"custodian",account_id:choice.slice(10)});}
export function CashReceiverSelect({business,value,onChange,disabled=false,keepExisting=false}:{business:Business;value:string;onChange:(value:string)=>void;disabled?:boolean;keepExisting?:boolean}){
 const {enabled}=useOperationsFeature();
 const {profile}=useAuth(),{data,error,loading,refresh}=useOperationsFunds(business);
 if(enabled!==true)return null;
 return <div className="space-y-2"><label className="block text-sm font-semibold">Who actually received the money?<select aria-label="Who actually received the money?" required={!keepExisting} disabled={disabled||loading||!!error} className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3 text-sm" value={value} onChange={e=>onChange(e.target.value)}><option value="">{keepExisting?"Keep the recorded recipient":"Choose the person who received payment"}</option><option value="self">I received the money</option>{profile?.role==="admin"&&(data?.manager_receivers||[]).map(p=><option key={p.period_id} value={"manager:"+p.period_id}>{p.name||"Manager"} received the money</option>)}{(data?.ceo_receivers||[]).map(p=><option key={p.id} value={"ceo:"+p.id}>{p.name||"CEO"} received the money</option>)}{(data?.sources||[]).filter(p=>p.holder_type==="custodian").filter((p,i,rows)=>rows.findIndex(other=>other.name===p.name)===i).map(p=><option key={p.id} value={"custodian:"+p.id}>{p.name} received the money</option>)}</select></label><p className="text-xs text-slate-600">Recording a sale is separate from holding its cash. Choose the actual recipient, including bank payments.</p>{error&&<p role="alert" className="text-sm text-red-900">{error}<button type="button" className="ml-2 min-h-11 underline" onClick={refresh}>Retry recipients</button></p>}</div>;
}
export function CashPayerSelect({business,currency,bucket,value,onChange,disabled=false,keepExisting=false,expenseDate,approvalStage,onVerified}:{business:Business;currency:string;bucket:"owner"|"sales";value:string;onChange:(value:string)=>void;disabled?:boolean;keepExisting?:boolean;expenseDate?:string;approvalStage?:"approve"|"confirm";onVerified?:(id:string)=>void}){
 const {enabled}=useOperationsFeature();
 const {profile}=useAuth(),{data,error,loading,refresh}=useOperationsFunds(business,expenseDate?"&from="+encodeURIComponent(expenseDate)+"&to="+encodeURIComponent(expenseDate):"");
 const payers=(Array.isArray(data?.sources)?data.sources:[]).filter(p=>p.currency===currency&&p.bucket===bucket&&(p.holder_type==="custodian"||profile?.role==="admin"));
 const listUnavailable=!!error||!!expenseDate&&(!Array.isArray(data?.sources)||data?.from!==expenseDate||data?.to!==expenseDate);
 const verified=enabled===true&&!loading&&!listUnavailable&&payers.some(p=>p.id===value)?value:"";
 useEffect(()=>{onVerified?.(verified);},[onVerified,verified]);
 if(enabled!==true)return null;
 if(approvalStage){
  const canDefer=approvalStage==="approve";
  return <div className="space-y-2 text-sm">
   {loading?<p role="status">Checking who could pay on the expense date…</p>:listUnavailable?<p role="alert">The payer list could not be loaded. <button type="button" className="min-h-11 underline" onClick={refresh}>Retry</button></p>
    :payers.length?<label className="block font-semibold">Who paid this expense?
     <select aria-label="Who paid this expense?" disabled={disabled} className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3 text-sm" value={verified} onChange={e=>onChange(e.target.value)}>
      <option value="">{canDefer?"Confirm who paid later":"Choose the actual payer"}</option>{payers.map(p=><option key={p.id} value={p.id}>{p.name} paid directly</option>)}
     </select></label>:<p>No payer is listed for this source on the expense date.</p>}
   {value&&!verified&&!loading&&<p role="status">The saved payer still needs verification. {canDefer&&<button type="button" className="min-h-11 font-semibold underline" onClick={()=>onChange("")}>Confirm who paid later</button>}</p>}
   {canDefer&&!value&&<p className="text-slate-700">You can approve now. The expense enters the totals when you confirm who paid.</p>}
  </div>;
 }
 return <div className="space-y-2"><label className="block text-sm font-semibold">Who paid this expense?<select aria-label="Who paid this expense?" disabled={disabled||loading||!!error} className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3 text-sm" value={value} onChange={e=>onChange(e.target.value)}><option value="">{keepExisting?"Keep the recorded payer":profile?.role==="admin"?"Choose the actual payer":"I paid from my confirmed funds"}</option>{payers.map(p=><option key={p.id} value={p.id}>{p.name} paid directly</option>)}{profile?.role!=="admin"&&<option value="review">Someone else paid, ask Bimbo to confirm</option>}</select></label>{error?<p role="alert" className="text-sm text-red-800">Payers could not be loaded. <button type="button" className="min-h-11 underline" onClick={refresh}>Retry</button></p>:loading?<p className="text-sm">Loading payers…</p>:profile?.role==="admin"&&!payers.length?<p className="text-sm text-amber-900">No payer is recorded for this source. Confirm the actual funding in Funds.</p>:<p className="text-xs text-slate-600">An expense enters the totals when its funding is confirmed.</p>}</div>;
}
