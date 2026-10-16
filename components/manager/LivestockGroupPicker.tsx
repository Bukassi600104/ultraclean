"use client";
import { useEffect,useState,useRef } from "react";
import { livestockGroupLabel, type LivestockGroup } from "@/lib/farm-livestock-categories";
export function LivestockGroupPicker({product,value,onChange,refreshKey}:{product:string;value:string;onChange:(id:string)=>void;refreshKey?:string|null}) {
  const [rows,setRows]=useState<LivestockGroup[]>([]),[error,setError]=useState("");
  const previousProduct=useRef(product),change=useRef(onChange);change.current=onChange;
  useEffect(()=>{if(previousProduct.current!==product)change.current("");previousProduct.current=product;setRows([]);setError("");const controller=new AbortController();fetch("/api/farm/livestock/groups",{signal:controller.signal,cache:"no-store"}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.error||"Category stock unavailable");setRows(body.data.filter((g:LivestockGroup)=>g.product===product));}).catch(e=>{if(e.name!=="AbortError")setError("Unable to load category quantities. Saving will still be checked against live stock.");});return()=>controller.abort();},[product,refreshKey]);
  if(!["catfish","goat","chicken","pig","turkey","cattle"].includes(product))return null;
  return <label className="block text-sm font-medium">Stock category<select aria-label="Stock category" className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 text-sm" value={value} onChange={e=>onChange(e.target.value)}><option value="">Unclassified / legacy stock{rows.find(r=>r.id===null)?` (${rows.find(r=>r.id===null)?.quantity} available)`:""}</option>{rows.filter(r=>r.id).map(g=><option key={g.id} value={g.id!}>{livestockGroupLabel(g)} ({g.quantity} available)</option>)}</select>{error&&<span role="alert" className="block mt-1 text-xs text-amber-800">{error}</span>}</label>;
}
