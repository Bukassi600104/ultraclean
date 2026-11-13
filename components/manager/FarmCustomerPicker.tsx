"use client";
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {CreditForm} from './FarmCredit';
import {useManagerFetch} from '@/contexts/ManagerPeriodContext';
import {useFarmRecordRefresh} from '@/hooks/useFarmRecordRefresh';
import type {CreditData} from '@/lib/farm-credit';
type Props={
 value:string;credit:boolean;onChange:(id:string,name:string)=>void;onCredit:(value:boolean)=>void;
 onTerms:(terms:{customerId:string;days:number|null})=>void;
 onRequest:()=>void;requestBusy:boolean;requestId?:string;draftSaved:boolean;
};
export function FarmCustomerPicker({value,credit,onChange,onCredit,onTerms,onRequest,requestBusy,requestId,draftSaved}:Props){
 const send=useManagerFetch(),revision=useFarmRecordRefresh();
 const [data,setData]=useState<CreditData|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0),[adding,setAdding]=useState(false);
 const [decision,setDecision]=useState<{id:string;status:string;note:string|null}|null>(null);
 useEffect(()=>{
  const c=new AbortController();
  send('/api/farm/credit',{signal:c.signal}).then(async r=>{
   const b=await r.json();if(!r.ok||!Array.isArray(b.customers))throw Error('Customers unavailable.');
   if(!c.signal.aborted){setData(b);setError('');}
  }).catch(()=>{if(!c.signal.aborted){setData(null);setError('Customer payment terms could not be checked.');}});
  return()=>c.abort();
 },[send,version,revision]);
 const customer=data?.customers.find(c=>c.id===value),days=customer?.credit_days??null;
 useEffect(()=>{onTerms({customerId:customer?.id||'',days});},[customer?.id,days,onTerms]);
 useEffect(()=>{
  if(!requestId||!credit||days)return;
  const c=new AbortController();
  send('/api/farm/operational-requests?id='+encodeURIComponent(requestId),{signal:c.signal}).then(async r=>{
   const b=await r.json(),row=b.data?.find((entry:{id:string})=>entry.id===requestId);
   if(!r.ok||!row)throw Error();
   if(!c.signal.aborted)setDecision({id:row.id,status:row.status,note:row.ceo_response});
  }).catch(()=>{if(!c.signal.aborted)setDecision({id:requestId,status:'unknown',note:null});});
  return()=>c.abort();
 },[send,requestId,credit,days,revision,version]);
 const matching=decision?.id===requestId?decision:null;
 return <div className="space-y-3"><label className="block text-sm font-semibold">Customer<select required className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3" value={value} onChange={e=>{
  const id=e.target.value;onChange(id,data?.customers.find(c=>c.id===id)?.name||'');
 }}><option value="">Choose the actual customer</option>{data?.customers.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?' · '+c.phone:''}</option>)}</select></label>
 <button type="button" className="inline-flex min-h-11 items-center text-sm text-emerald-900 underline" onClick={()=>setAdding(true)}>Add customer</button>
 <Dialog open={adding} onOpenChange={setAdding}><DialogContent><DialogTitle>Add the actual customer</DialogTitle><DialogDescription>Your sale remains on this page while the customer is added.</DialogDescription>{data&&<CreditForm operation="customer" data={data} onSaved={()=>{setAdding(false);setVersion(v=>v+1);}}/>}</DialogContent></Dialog>
 {customer&&<fieldset className="space-y-2"><legend className="text-sm font-semibold">How is the customer paying?</legend>
 <div className="grid gap-2 sm:grid-cols-2">{[{value:false,label:'Paying the full sale amount'},{value:true,label:'On credit or part paid'}].map(option=><label key={option.label} className={'flex min-h-12 items-center gap-2 rounded-lg border px-3 text-sm font-semibold '+(credit===option.value?'border-emerald-800 bg-emerald-50':'bg-white')}>
  <input type="radio" name="farm-sale-credit" checked={credit===option.value} onChange={()=>onCredit(option.value)}/>{option.label}</label>)}</div>
 {credit&&(days?<p className="text-sm text-emerald-900">Approved payment terms: {days} days.</p>:<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
  <p role="status">{requestId?(matching?.status==='declined'?'The MD/Owner declined this credit request.':matching?.status==='cancelled'?'This credit request was cancelled.':matching?.status==='unknown'?'The request was sent. Its latest status is unavailable.':matching?.status==='approved'?'Credit request approved. Check the current payment terms before saving.':'Awaiting the MD/Owner’s approval of payment terms.'):'This customer needs approved payment terms before you can save a credit sale.'}</p>
  {matching?.note&&<p className="mt-1 break-words">{matching.note}</p>}
  {draftSaved&&<p className="mt-1">Your sale is saved on this device. No sale or payment has been posted.</p>}
  <button type="button" className="mt-1 min-h-11 font-semibold text-emerald-900 underline" disabled={requestBusy} onClick={requestId?()=>setVersion(v=>v+1):onRequest}>{requestId?'Check approval':requestBusy?'Sending…':'Request credit terms'}</button>
 </div>)}</fieldset>}
 {value&&data&&!customer&&<p role="alert" className="text-sm text-amber-800">This customer is no longer available to your account. Choose an assigned customer to continue.</p>}
 {error&&<p role="alert">{error}<button type="button" className="ml-2 min-h-11 underline" onClick={()=>setVersion(v=>v+1)}>Retry</button></p>}
 </div>;
}
