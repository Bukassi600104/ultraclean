"use client";

import {useEffect} from "react";
import {useOperationsFunds} from "@/hooks/useOperationsFunds";
import type {Business} from "@/lib/manager-period-types";
import type {PendingExpense} from "@/lib/operations-cash-validation";
import {formatExactCurrency,subtractMoney} from "@/lib/money";

type Props={
 business:Business; expense:PendingExpense; payer:string; onChange:(id:string)=>void;
 bucket:PendingExpense["bucket"]; onBucketChange:(bucket:PendingExpense["bucket"])=>void;
 onVerified:(id:string)=>void; onRecordFunding:()=>void;
};
const action="inline-flex min-h-11 items-center text-left font-semibold text-emerald-800 underline";

export function FundingReviewPayer({business,expense,payer,bucket,onBucketChange,onChange,onVerified,onRecordFunding}:Props){
 const date=expense.activity_date;
 const {data,error,loading,refresh}=useOperationsFunds(business,"&"+new URLSearchParams({period_id:expense.period_id,from:date,to:date,limit:"1"}));
 const ready=!loading&&!error&&data?.business===business&&data.periodId===expense.period_id&&data.from===date&&data.to===date&&Array.isArray(data.sources);
 const managerAccounts=new Set(ready?data.accounts.filter(a=>a.holder_type==="manager"&&a.period_id===expense.period_id).map(a=>a.id):[]);
 const payers=ready?data.sources.filter(a=>a.currency===expense.currency&&a.bucket===bucket&&
  (a.holder_type==="ceo"||a.holder_type==="custodian"||managerAccounts.has(a.id))):[];
 const available=payers.filter(a=>!subtractMoney(a.available,expense.amount).startsWith("-"));
 const verified=available.some(a=>a.id===payer)?payer:"";
 useEffect(()=>{onVerified(verified);},[onVerified,verified]);

 if(loading)return <p role="status">Checking funds on the expense date…</p>;
 if(!ready)return <p role="alert">The payer list could not be checked. <button type="button" className={action} onClick={refresh}>Retry payer check</button></p>;
 const source=bucket==="owner"?"owner funds":"sales money";
 return <div className="space-y-2">
  {business==="farm"&&expense.kind==="expense"&&expense.writer==="farm_v2_write"&&!("purchase_id" in expense.payload)&&<label className="block font-medium">Which money actually paid this expense?
   <select aria-label="Actual funding source" value={bucket} onChange={e=>onBucketChange(e.target.value as PendingExpense["bucket"])} className="mt-1 min-h-11 w-full rounded-lg border bg-white p-3">
    <option value="owner">Owner funds</option><option value="sales">Sales money</option>
   </select>
  </label>}
  {available.length>0?<label className="block font-medium">Actual payer
   <select aria-label="Actual payer" className="mt-1 min-h-11 w-full rounded-lg border bg-white p-3" value={verified} onChange={e=>onChange(e.target.value)}>
    <option value="">Choose who actually paid</option>
    {available.map(a=><option key={a.id} value={a.id}>{a.name} · {formatExactCurrency(a.available,a.currency)} available</option>)}
   </select>
  </label>:<p role="status" className="rounded-lg bg-amber-50 p-3 text-amber-950">No one has enough confirmed {source} to cover {formatExactCurrency(expense.amount,expense.currency)} on {date}. This expense is still pending.</p>}
  {payers.length>available.length&&<details className="text-slate-700"><summary className="min-h-11 cursor-pointer py-3">People with less than the expense amount</summary>
   {payers.filter(a=>!available.includes(a)).map(a=><p key={a.id}>{a.name} · {formatExactCurrency(a.available,a.currency)} available</p>)}
  </details>}
  {bucket==="owner"?<details open={!available.length} className="rounded-lg border p-3">
   <summary className="cursor-pointer font-medium">Payer missing?</summary>
   <p className="mt-2">Check the transfer history first. For missing owner funding, choose who received it and enter the actual funding date. If you paid personally, choose “Me (MD/Owner)”. Supervisors confirm money they received in Funds.</p>
   <button type="button" className={action} onClick={onRecordFunding}>Record a missing transfer</button>
  </details>:<p className="text-slate-700">Check who received the customer payment on or before the expense date. Only confirmed sales money can cover this entry.</p>}
  <button type="button" className={action} onClick={refresh}>Refresh available funds</button>
 </div>;
}
