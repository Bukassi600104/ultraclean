"use client";
import {useEffect,useState} from 'react';
import {useManagerFetch} from '@/contexts/ManagerPeriodContext';
import type {StoreAsset} from '@/lib/farm-stock-counts';
export function FarmEggPicker({value,onChange}:{value:string;onChange:(id:string)=>void}){
 const send=useManagerFetch(),[rows,setRows]=useState<StoreAsset[]>([]),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();send('/api/farm/stores',{signal:controller.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error||'Egg stock unavailable');if(!controller.signal.aborted)setRows(b.assets.filter((a:StoreAsset)=>a.resource==='eggs'));}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[send]);
 return <label className="block text-sm font-medium">Egg stock<select aria-label="Egg stock" className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3" value={value} onChange={e=>onChange(e.target.value)}><option value="">Another custom product</option>{value&&!rows.some(r=>r.id===value)&&<option value={value}>Selected egg batch unavailable</option>}{rows.map(r=><option key={r.id} value={r.id}>{r.label} ({r.quantity??'Unknown'} recorded eggs)</option>)}</select>{value&&<span className="mt-1 block text-xs text-slate-600">Enter whole eggs and the price per egg. Saving deducts these eggs once.</span>}{error&&<span role="alert" className="block text-sm text-red-800">{error}</span>}</label>;
}
