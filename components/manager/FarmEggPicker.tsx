"use client";
import {useEffect,useState} from 'react';
import {useManagerFetch} from '@/contexts/ManagerPeriodContext';
import type {StoreAsset} from '@/lib/farm-stock-counts';

export function FarmEggPicker({value,onChange,eggsOnly=false,quantity=''}:{value:string;onChange:(id:string)=>void;eggsOnly?:boolean;quantity?:string}){
  const send=useManagerFetch(),[rows,setRows]=useState<StoreAsset[]>([]),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setError('');
    send('/api/farm/stores',{signal:controller.signal}).then(async response=>{
      const body=await response.json();
      if(!response.ok||!Array.isArray(body.assets))throw Error('Egg stock could not be loaded.');
      if(!controller.signal.aborted)setRows(body.assets.filter((a:StoreAsset)=>a.resource==='eggs'));
    }).catch(()=>{if(!controller.signal.aborted){setRows([]);setError('Egg stock could not be loaded.');}});
    return()=>controller.abort();
  },[send,refresh]);
  const asset=rows.find(row=>row.id===value),pack=asset?.pack_size,whole=Number(quantity);
  return <div><label className="block text-sm font-medium">Egg stock<select aria-label="Egg stock" required={eggsOnly} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3" value={value} onChange={e=>onChange(e.target.value)}>
    <option value="">{eggsOnly?'Choose a poultry group':'Another custom product'}</option>
    {value&&!asset&&<option value={value}>Selected egg group unavailable</option>}
    {rows.map(row=><option key={row.id} value={row.id}>{row.label}{row.opening_verified&&row.quantity!=null?' · '+row.quantity+' eggs in store':''}</option>)}
  </select></label>{eggsOnly&&!rows.length&&!error&&<p className="mt-1 text-sm text-slate-600">Choose an assigned poultry group with recorded eggs to sell.</p>}
  {asset&&<p className="mt-1 text-sm text-slate-600">Enter whole eggs and the price per egg.{pack&&pack>0&&Number.isSafeInteger(whole)&&whole>0?' '+Math.floor(whole/pack)+(Math.floor(whole/pack)===1?' full crate and ':' full crates and ')+(whole%pack)+(whole%pack===1?' loose egg (':' loose eggs (')+pack+' per crate).':''}</p>}
  {error&&<p role="alert" className="text-sm text-red-800">{error} <button type="button" className="min-h-11 underline" onClick={()=>setRefresh(n=>n+1)}>Retry</button></p>}</div>;
}
