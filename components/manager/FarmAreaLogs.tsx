'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {farmManagerPrefix} from '@/lib/dashboard-navigation';
import {useEffect,useState} from 'react';
import {useManagerFetch,useQueueIdentity} from '@/contexts/ManagerPeriodContext';
import {getPendingItems} from '@/lib/offline-storage';
import {farmReportDraftKey} from '@/lib/farm-offline-workspace';
import {useFarmRecordRefresh} from '@/hooks/useFarmRecordRefresh';
import {applicableAreaFields,areaFields,areaTitle,batchReportArea,isAreaSections,reportArea,reportAreas,type AreaSections} from '@/lib/farm-report-areas';
import type {AssignedFarmBatch,FarmBatchRecord} from '@/lib/farm-batch-records';
import type {DailyReport} from '@/lib/farm-reports';

export function AreaLogFields({sections,disabled,onChange}:{sections:AreaSections;disabled:boolean;onChange:(value:AreaSections)=>void}){
  const area=reportArea(sections.area);
  if(!area)return <p role="alert">This farm area could not be identified.</p>;
  return <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
    <legend className="mb-3 text-sm text-slate-600">Enter what you observed. Leave unmeasured values blank.</legend>
    {applicableAreaFields(area).map(key=>{
      const isText=key==='water_quality'||key==='notes';
      const common={'aria-label':areaFields[key],className:'mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2',value:sections.observations[key]??''};
      function update(raw:string){
        const observations={...sections.observations};
        if(raw==='')delete observations[key];
        else if(key==='notes'||key==='water_quality')observations[key]=raw;
        else observations[key]=Number(raw);
        onChange({...sections,observations});
      }
      return <label key={key} className={'text-sm font-medium '+(isText?'sm:col-span-2':'')}>{areaFields[key]}
        {isText?<textarea {...common} rows={2} maxLength={2000} onChange={event=>update(event.target.value)}/>:<input {...common} type="number" inputMode={key.includes('kg')?'decimal':'numeric'} min={key==='sample_count'?1:0} step={key.includes('kg')?'any':1} onChange={event=>update(event.target.value)}/>}
      </label>;
    })}
  </fieldset>;
}

export function AreaMeasurements({sections}:{sections:AreaSections}){
  const area=reportArea(sections.area);if(!area)return null;
  return <dl className="flex flex-wrap gap-x-6 gap-y-2">{applicableAreaFields(area).map(key=>{
    const value=sections.observations[key];if(value===undefined||value==='')return null;
    return <div key={key} className={key==='notes'?'basis-full':''}><dt className="text-xs text-slate-600">{areaFields[key]}</dt><dd className="whitespace-pre-wrap break-words text-sm font-semibold text-slate-900">{value}</dd></div>;
  })}</dl>;
}

export function FarmAreaLogs({date,admin=false,batches,records,onBatch}:{date:string;admin?:boolean;batches:AssignedFarmBatch[];records:FarmBatchRecord[];onBatch:(batch:AssignedFarmBatch)=>void}){
  const reportPath=farmManagerPrefix(usePathname())+'/daily-report';
  const send=useManagerFetch(),identity=useQueueIdentity();
  const revision=useFarmRecordRefresh();
  const [rows,setRows]=useState<DailyReport[]|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setRows(null);setError('');
    void(async()=>{
      const found:DailyReport[]=[];
      for(let page=1;;page++){
        const r=await send(`/api/farm/daily-reports?date=${date}&page=${page}`,{headers:{'X-Farm-Report-Format':'3'},signal:controller.signal,cache:'no-store'}),body=await r.json();
        if(!r.ok||!Array.isArray(body.data)||!Number.isFinite(body.total))throw Error('Saved logs are unavailable. Your drafts can still be opened.');
        found.push(...body.data);
        if(!body.data.length||found.length>=body.total)break;
      }
      if(!controller.signal.aborted)setRows(found.filter(row=>row.report_date===date&&isAreaSections(row.sections)));
    })().catch(()=>{if(!controller.signal.aborted)setError('Saved logs are unavailable. Reconnect to check their status.');});
    return ()=>controller.abort();
  },[send,date,version,revision]);
  let pending:ReturnType<typeof getPendingItems>=[],storageAvailable=true;
  try{if(identity)pending=getPendingItems(identity);}catch{storageAvailable=false;}
  const period=typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('period_id');
  const detail=(id:string)=>`${admin?'/dashboard/farm/daily-reports':reportPath+'/history'}?report_id=${encodeURIComponent(id)}${admin&&period?'&period_id='+encodeURIComponent(period):''}`;
  return <section className="space-y-3" aria-label="Daily logs by location">
    <header className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-emerald-950">Farm areas</h2><Link className="inline-flex min-h-11 items-center font-semibold text-emerald-800 underline" href={admin?`/dashboard/farm/daily-reports${period?'?period_id='+encodeURIComponent(period):''}`:reportPath+'?whole=1'}>{admin?'All daily reports':'Whole farm report'}</Link></header>
    {error&&<p role="status" className="text-sm text-amber-900">{error} <button className="min-h-11 underline" onClick={()=>setVersion(n=>n+1)}>Retry</button></p>}
    {!admin&&!storageAvailable&&<p role="alert" className="text-sm text-amber-900">This browser cannot open saved work. Restore device storage to enter a log.</p>}
    <div className="grid items-start gap-3 sm:grid-cols-2">{(['Catfish','Poultry','Piggery','Other areas'] as const).map(group=>{
      const areas=reportAreas.filter(area=>area.group===group);
      const logged=areas.filter(area=>rows?.some(row=>row.status==='submitted'&&isAreaSections(row.sections)&&row.sections.area===area.key)||batches.some(batch=>batchReportArea(batch)?.key===area.key&&records.some(record=>record.batch_id===batch.id))).length;
      return <details key={group} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <summary className="min-h-11 cursor-pointer content-center font-bold text-emerald-950"><span>{group}</span>{rows&&<span className="ml-2 inline-block rounded-full bg-emerald-50 px-2 py-1 align-middle text-xs font-medium">{logged} of {areas.length} logged</span>}</summary>
      {Array.from(new Set(areas.map(area=>area.site))).map(site=><div key={site} className="mt-2 space-y-1">{site&&<h3 className="py-2 text-sm font-semibold">{site}</h3>}
        {areas.filter(area=>area.site===site).map(area=>{
          const logs=(rows||[]).filter(row=>isAreaSections(row.sections)&&row.sections.area===area.key&&row.status==='submitted');
          const named=batches.filter(batch=>batchReportArea(batch)?.key===area.key);
          const item=pending.find(item=>item.endpoint==='/api/farm/daily-reports/submit'&&item.data.report_date===date&&isAreaSections(item.data.sections)&&item.data.sections.area===area.key);
          let saved=false;
          if(!admin&&identity&&storageAvailable&&typeof window!=='undefined'){try{
            const draft=JSON.parse(localStorage.getItem(`${farmReportDraftKey(identity)}:area:${area.key}:${date}`)||'null');
            saved=!!(draft?.mediaIds?.length||Object.keys(draft?.form?.sections?.observations||{}).length);
          }catch{saved=true;}}
          return <div key={area.key} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-1">
            <span className="text-sm font-medium">{area.name}</span>
            {logs.map(row=><Link key={row.id} href={detail(row.id)} aria-label={`View ${areaTitle(area)}${row.manager?.name?' by '+row.manager.name:''}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-emerald-800 underline">{admin&&row.manager?.name?row.manager.name+' · ':''}{row.reviewed_at?'Reviewed':'Sent'}</Link>)}
            {named.map(batch=><button type="button" key={batch.id} onClick={()=>onBatch(batch)} className="min-h-11 rounded-lg bg-emerald-800 px-3 text-sm font-semibold text-white">{records.some(record=>record.batch_id===batch.id)?'View stock group log':admin?'View stock group':'Log stock group'}{named.length>1?' · '+batch.site_name:''}</button>)}
            {!logs.length&&(!named.length||item||saved)&&(
              admin||!storageAvailable?<span className="text-sm text-slate-600">{!storageAvailable?'Storage unavailable':rows?'No log received':error?'Status unavailable':'Checking…'}</span>:
                <Link href={`${reportPath}?area=${area.key}&date=${date}`} aria-label={`${item||saved?'Open saved':'Log'} ${areaTitle(area)}`} className="inline-flex min-h-11 items-center rounded-lg bg-emerald-800 px-3 text-sm font-semibold text-white">{item?.conflict?'Needs attention':item?'Waiting to send':saved?'Continue draft':'Log this area'}</Link>)}
          </div>;
        })}
      </div>)}
    </details>;})}</div>
  </section>;
}
