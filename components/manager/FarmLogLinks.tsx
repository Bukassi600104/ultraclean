"use client";
import {useEffect,useState} from 'react';
import {useManagerFetch} from '@/contexts/ManagerPeriodContext';
type Entry={id:string;action?:string;correction_of?:string|null;correction_role?:string|null;date:string;batch_id?:string;num_bags?:number;quantity?:number;feed_type?:string;feed_source?:string;created_at:string};
export function FarmLogLinks({date,batchId,feedId,feedBags,mortalityId,onChange}:{date:string;batchId:string;feedId:string;feedBags:string;mortalityId:string;onChange:(values:{daily_feed_id?:string;feed_bags?:string;mortality_id?:string})=>void}){
 const send=useManagerFetch(),[feed,setFeed]=useState<Entry[]>([]),[deaths,setDeaths]=useState<Entry[]>([]),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();setError('');Promise.all(['/api/farm/daily-feed','/api/farm/inventory/transaction'].map(path=>send(`${path}?all=1${path.endsWith('transaction')?'':'&date='+date}`,{signal:controller.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error||'Saved entries unavailable');return body.data as Entry[];}))).then(([feeding,mortality])=>{if(!controller.signal.aborted){setFeed(feeding.filter(r=>r.date===date));const reversed=new Set(mortality.filter(r=>r.correction_role==='reversal').map(r=>r.correction_of));setDeaths(mortality.filter(r=>r.date===date&&r.batch_id===batchId&&r.action==='mortality'&&!reversed.has(r.id)));}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[send,date,batchId]);
 const input='mt-1 min-h-11 w-full rounded-xl border bg-white px-3 text-sm';
 return <details className="rounded-xl border p-3 text-sm"><summary className="min-h-11 cursor-pointer font-medium">Link an entry already recorded</summary><p className="mb-3 text-xs text-slate-600">Choose a saved entry from this date. Linking it does not deduct feed or animals again.</p>
  <label className="mb-3 block">Feeding entry<select className={input} value={feedId} onChange={e=>onChange({daily_feed_id:e.target.value,...(!e.target.value?{feed_bags:''}:{})})}><option value="">No existing feeding entry</option>{feed.map(r=><option key={r.id} value={r.id}>{r.feed_type} · {r.feed_source} · {r.num_bags} bags · {new Date(r.created_at).toLocaleTimeString()}</option>)}</select></label>
  {feedId&&<label className="mb-3 block">Bags allocated to this batch<input className={input} type="number" min="0" step="any" inputMode="decimal" value={feedBags} onChange={e=>onChange({feed_bags:e.target.value})}/></label>}
  <label className="mb-3 block">Mortality entry<select className={input} value={mortalityId} onChange={e=>onChange({mortality_id:e.target.value})}><option value="">No existing mortality entry</option>{deaths.map(r=><option key={r.id} value={r.id}>{r.quantity} deaths · {new Date(r.created_at).toLocaleTimeString()}</option>)}</select></label>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 </details>;
}
