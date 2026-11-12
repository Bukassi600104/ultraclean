"use client";
import {useEffect,useState} from 'react';
import {useManagerFetch} from '@/contexts/ManagerPeriodContext';
import type {RequestDetails} from '@/lib/farm-purchases';

type Item=RequestDetails['items'][number];
const input='mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2';
const emptyItem=():Item=>({description:'',quantity:'',unit:'',destination:'other'});
export const blankRequestDetails=():RequestDetails=>({needed_on:'',why_needed:'',items:[]});
export function requestFieldsForSubmit(details:RequestDetails,description:string):RequestDetails {
 return {...details,items:details.items.map(item=>({...item,description:item.description.trim()||(details.items.length===1?description.trim():''),unit_price:item.unit_price?.trim()||undefined}))};
}
export function FarmRequestDetailsForm({value,onChange,requestDate}:{value:RequestDetails;onChange:(v:RequestDetails)=>void;requestDate:string}){
 const send=useManagerFetch(),[supplies,setSupplies]=useState<{id:string;item_name:string;unit:string}[]>([]),[batches,setBatches]=useState<{id:string;name:string;site_name?:string}[]>([]),[error,setError]=useState('');
 const needsSupply=value.items.some(l=>l.destination==='supply'),needsBatch=value.items.some(l=>l.destination==='livestock');
 useEffect(()=>{const controller=new AbortController();setError('');
  if(needsSupply||needsBatch)void Promise.all([needsSupply?send('/api/farm/supplies?all=1',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();const b=await r.json();setSupplies(Array.isArray(b)?b:b.data||[]);}):null,
   needsBatch?send('/api/farm/batch-records',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();setBatches((await r.json()).batches||[]);}):null]).catch(()=>{if(!controller.signal.aborted)setError('Assigned stock could not be loaded. Reopen this form to retry.');});
  return()=>controller.abort();
 },[send,needsSupply,needsBatch]);
 function edit(i:number,next:Partial<Item>){onChange({...value,items:value.items.map((l,n)=>n===i?{...l,...next}:l)});}
 return <div className="space-y-3 text-sm">
  <label className="block font-medium">When needed<input className={input} required type="date" min={requestDate} value={value.needed_on} onChange={e=>onChange({...value,needed_on:e.target.value})}/></label>
  <label className="block font-medium">Why needed<textarea className={input} required rows={2} maxLength={2000} value={value.why_needed} onChange={e=>onChange({...value,why_needed:e.target.value})}/></label>
  <label className="block font-medium">Does anything need to be purchased?<select className={input} value={value.purchase_category?'buy':'action'} onChange={e=>onChange({...value,purchase_category:e.target.value==='buy'?'other':undefined,items:e.target.value==='buy'?[emptyItem()]:[],supplier:undefined})}><option value="action">No, request an action</option><option value="buy">Yes, request a purchase</option></select></label>
  {value.purchase_category&&<><label className="block font-medium">Purchase category<select className={input} value={value.purchase_category} onChange={e=>onChange({...value,purchase_category:e.target.value as RequestDetails['purchase_category'],items:value.items.map(item=>e.target.value==='feed'?{...item,destination:'feed',unit:'bags',feed_type:'fish',feed_source:'local',item_id:undefined,batch_id:undefined}:item.destination==='feed'?{...emptyItem(),description:item.description,quantity:item.quantity,unit_price:item.unit_price}:item)})}>{['other','feed','equipment','veterinary','repair','maintenance'].map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select></label>
  <label className="block">Suggested supplier (optional)<input className={input} maxLength={200} value={value.supplier||''} onChange={e=>onChange({...value,supplier:e.target.value||undefined})}/></label>
  {value.items.map((item,i)=><fieldset key={i} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2"><legend className="px-1 font-semibold">Item {i+1}</legend>
   {value.items.length>1&&<label className="sm:col-span-2">Item description<input className={input} required maxLength={500} value={item.description} onChange={e=>edit(i,{description:e.target.value})}/></label>}
   <label>Quantity<input className={input} inputMode="decimal" required value={item.quantity} onChange={e=>edit(i,{quantity:e.target.value})}/></label>
   <label>Price per unit (NGN, optional)<input className={input} inputMode="decimal" value={item.unit_price??''} onChange={e=>edit(i,{unit_price:e.target.value||undefined})}/></label>
   {value.purchase_category!=='feed'&&<label>Record delivery in<select className={input} value={item.destination} onChange={e=>edit(i,{destination:e.target.value as Item['destination'],unit:'',item_id:undefined,batch_id:undefined})}><option value="other">Receipt only</option><option value="supply">Farm supplies</option><option value="livestock">Livestock batch</option></select></label>}
   {item.destination==='feed'?<><label>Feed type<select className={input} value={item.feed_type} onChange={e=>edit(i,{feed_type:e.target.value})}>{['fish','goat','pig','chicken','turkey','cattle','other'].map(k=><option key={k}>{k}</option>)}</select></label><label>Source<select className={input} value={item.feed_source} onChange={e=>edit(i,{feed_source:e.target.value as Item['feed_source']})}><option value="local">Local</option><option value="foreign">Imported</option></select></label></>:
   item.destination==='supply'?<label>Supply item<select required className={input} value={item.item_id||''} onChange={e=>{const s=supplies.find(s=>s.id===e.target.value);edit(i,{item_id:s?.id,unit:s?.unit||''});}}><option value="">Choose a supply</option>{supplies.map(s=><option key={s.id} value={s.id}>{s.item_name} · {s.unit}</option>)}</select></label>:
   item.destination==='livestock'?<label>Livestock batch<select required className={input} value={item.batch_id||''} onChange={e=>edit(i,{batch_id:e.target.value,unit:'head'})}><option value="">Choose a batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}{b.site_name?' · '+b.site_name:''}</option>)}</select></label>:
   <label>Unit<input required className={input} value={item.unit} maxLength={40} onChange={e=>edit(i,{unit:e.target.value})}/></label>}
   {value.items.length>1&&<button className="min-h-11 text-left underline" type="button" onClick={()=>onChange({...value,items:value.items.filter((_,n)=>n!==i)})}>Remove item</button>}
  </fieldset>)}
  {error&&<p role="alert">{error}</p>}<button className="min-h-11 font-semibold text-emerald-800 underline" type="button" disabled={value.items.length>=50} onClick={()=>onChange({...value,items:[...value.items,value.purchase_category==='feed'?{...emptyItem(),unit:'bags',destination:'feed',feed_type:'fish',feed_source:'local'}:emptyItem()]})}>Add another item</button>
 </>}</div>;
}
