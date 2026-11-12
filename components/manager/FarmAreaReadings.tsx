import Link from 'next/link';
import {useState} from 'react';
const dateFormat=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
import {areaTitle,reportArea,type PoultryObservation} from '@/lib/farm-report-areas';

export function FarmAreaReadings({rows,reportPath,kind='poultry',periodId}:{
  rows:PoultryObservation[];reportPath:string;kind?:'counts'|'eggs'|'poultry';periodId?:string|null;
}){
  const [limit,setLimit]=useState(8);
  const visible=rows.filter(r=>kind==='counts'?r.observations.animal_count!=null:reportArea(r.area)?.group==='Poultry'&&(kind!=='eggs'||r.observations.eggs!=null));
  if(!visible.length)return null;
  return <section className="space-y-3 rounded-xl border border-[#cbd5ca] bg-white p-4 sm:p-5">
    <div><h2 className="text-lg font-bold">{kind==='counts'?'Animals counted in daily logs':kind==='eggs'?'Eggs reported from pens':'Poultry pen logs'}</h2>
      <p className="text-sm text-slate-600">{kind==='counts'?'Each figure is a dated observation of that area.':'Daily logs show eggs collected. Egg stores show eggs available for sale.'}</p></div>
    <ul className="divide-y">{visible.slice(0,limit).map(row=>{
      const o=row.observations,area=reportArea(row.area),q=new URLSearchParams({report_id:row.id});
      if(periodId)q.set('period_id',periodId);
      return <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
        <div><strong>{area?areaTitle(area):'Recorded farm area'}</strong> · {dateFormat.format(new Date(row.date+'T12:00:00Z'))}
          {row.actor_name&&<span className="block text-xs text-slate-600">{row.actor_name}</span>}
        </div>
        <dl className="flex flex-1 flex-wrap justify-end gap-4">{([[area?.group==='Poultry'?'Birds counted':'Animals counted',o.animal_count],['Eggs collected',kind==='counts'?null:o.eggs],
          ...(kind==='poultry'?[['Deaths',o.deaths],['Feed (kg)',o.feed_kg]]:[])] as const).filter(([,v])=>v!=null).map(([label,value])=><div key={String(label)}><dt className="text-xs text-slate-600">{label}</dt><dd className="font-bold tabular-nums">{value}</dd></div>)}</dl>
        <Link href={reportPath+'?'+q} className="inline-flex min-h-11 items-center font-semibold text-emerald-900 underline">View log</Link>
      </li>;
    })}</ul>
    {visible.length>limit&&<button className="min-h-11 font-semibold text-emerald-900 underline" onClick={()=>setLimit(n=>n+12)}>Show more logs</button>}
  </section>;
}
