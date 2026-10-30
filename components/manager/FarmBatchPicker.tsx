"use client";
import {useEffect,useRef,useState} from 'react';
import {useManagerFetch} from '@/contexts/ManagerPeriodContext';
import type {AssignedFarmBatch} from '@/lib/farm-batch-records';
export function FarmBatchPicker({product,value,onChange,refreshKey}:{product:string;value:string;onChange:(id:string)=>void;refreshKey?:string|null}){
 const send=useManagerFetch(),[rows,setRows]=useState<AssignedFarmBatch[]>([]),[error,setError]=useState(''),previous=useRef(product),change=useRef(onChange);change.current=onChange;
 useEffect(()=>{if(previous.current!==product)change.current('');previous.current=product;const controller=new AbortController();setRows([]);setError('');send('/api/farm/batch-records',{signal:controller.signal}).then(async response=>{const body=await response.json();if(!response.ok||!Array.isArray(body.batches))throw Error(body.error||'Batch stock unavailable');if(!controller.signal.aborted)setRows(body.batches.filter((b:AssignedFarmBatch)=>b.product===product));}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[send,product,refreshKey]);
 if(!['catfish','goat','chicken','pig','turkey','cattle'].includes(product))return null;
 return <label className="block text-sm font-medium">Named batch<select aria-label="Named batch" className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 text-sm" value={value} onChange={e=>onChange(e.target.value)}><option value="">Stock not assigned to a named batch</option>{value&&!rows.some(b=>b.id===value)&&<option value={value}>Selected batch unavailable</option>}{rows.map(b=><option key={b.id} value={b.id}>{b.name} · {b.site_name} ({b.quantity_exact} animals)</option>)}</select>{error&&<span role="alert" className="mt-1 block text-xs text-amber-800">{error}. Your existing selection has been retained.</span>}</label>;
}
