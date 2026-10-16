"use client";
import { useEffect } from "react";
import { emptyClassification, livestockStages, livestockLabel, livestockSexLabel, type LivestockClassification } from "@/lib/farm-livestock-categories";
export function LivestockClassificationFields({product,value,onChange}:{product:string;value:LivestockClassification;onChange:(value:LivestockClassification)=>void}) {
  useEffect(()=>{onChange(emptyClassification());},[product,onChange]);
  const field="mt-1 block min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm";
  const sexField=<label className="block text-sm">Sex when known<select aria-label="Sex when known" className={field} value={value.sex} onChange={e=>onChange({...value,sex:e.target.value})}>{["unknown","male","female"].map(s=><option key={s} value={s}>{livestockSexLabel(product,s)}</option>)}</select></label>;
  return <div className="space-y-3 rounded-xl border border-gray-100 p-3">
    {product === "chicken" && <label className="block text-sm">Chicken type<select aria-label="Chicken type" className={field} value={value.chicken_type} onChange={e=>onChange({...value,chicken_type:e.target.value,growth_stage:""})}><option value="">Select type</option><option value="broiler">Broiler</option><option value="layer">Layer</option></select></label>}
    {product === "turkey" && sexField}
    <label className="block text-sm">Growth stage<select aria-label="Growth stage" className={field} value={value.growth_stage} onChange={e=>onChange({...value,growth_stage:e.target.value})}><option value="">Select stage</option>{livestockStages(product,value.chicken_type).map(s=><option key={s} value={s}>{livestockLabel(s)}</option>)}</select></label>
    {product !== "catfish" && product !== "turkey" && sexField}
  </div>;
}
