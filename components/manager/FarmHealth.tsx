"use client";
import {farmTimestamp} from "@/lib/farm-products";
import {Table} from '@/components/ui/table';
import {useEffect,useState} from 'react';import Link from 'next/link';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useManagerFetch,useQueueIdentity} from '@/contexts/ManagerPeriodContext';import {useOfflineSync} from '@/hooks/useOfflineSync';import {queueIdentityKey,getPendingItems} from '@/lib/offline-storage';
import {useFarmRecordRefresh} from '@/hooks/useFarmRecordRefresh';
import {farmDateToday} from '@/lib/farm-products';import {healthSchema,healthLocalCompletionSchema,healthValidationMessage,type HealthData,type HealthTask} from '@/lib/farm-health';import {FarmPhotoPicker} from './FarmPhotoPicker';import {FarmRecordThread} from './FarmRecordThread';
const field='mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm',button='inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50';
const healthTable='table-fixed text-left text-sm [&_tr]:align-top [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:py-2.5 [&_td]:py-2.5 sm:[&_th]:px-3 sm:[&_td]:px-3 [&_thead]:text-xs [&_thead]:font-semibold [&_thead]:text-slate-600 [&_tbody_tr]:border-t [&_tbody_th]:break-words [&_td]:break-words';
function HealthForm({operation,id,task,data,onSaved,onCancel,admin}:{admin:boolean;onCancel:()=>void;operation:string;id?:string;task?:HealthTask;data:HealthData;onSaved:()=>void}){
 const identity=useQueueIdentity(),{submitOrQueue,isSyncing}=useOfflineSync(),key=identity?`farm-health-draft:${queueIdentityKey(identity)}:${operation}:${id||''}`:'';
 const [draft,setDraft]=useState(()=>{try{const saved=key&&localStorage.getItem(key);if(saved)return JSON.parse(saved) as {date:string;due_date:string;title:string;instructions:string;notes:string;area?:string;follow_up?:string;reason:string;batch_id:string;period_id:string;mediaIds:string[];request_id:string};}catch{}return {date:farmDateToday(),due_date:task?.due_date||'',title:task?.title||'',instructions:task?.instructions||'',notes:'',area:'',follow_up:'',reason:'',batch_id:task?.batch_id||'',period_id:task?.period_id||'',mediaIds:[],request_id:crypto.randomUUID()};}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false);
 useEffect(()=>{if(key)try{localStorage.setItem(key,JSON.stringify(draft));}catch{setError('Draft could not be saved on this phone. Keep this page open.');}},[key,draft]);
 const update=(name:string,value:unknown)=>setDraft(d=>({...d,[name]:value}));
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{
 const schedule={title:draft.title,instructions:draft.instructions,due_date:draft.due_date};
 const payload=operation==='note'?{date:draft.date,title:draft.title,details:draft.notes,...(draft.area?.trim()?{area:draft.area.trim()}:{}),...(draft.follow_up?{follow_up:draft.follow_up}:{}),...(admin&&draft.period_id?{period_id:draft.period_id}:{})}:operation==='schedule'?{...schedule,batch_id:draft.batch_id,period_id:draft.period_id}:operation==='amend'?{...schedule,expected_revision:task?.revision,reason:draft.reason}:operation==='cancel'?{expected_revision:task?.revision,reason:draft.reason}:operation==='complete'?{date:draft.date,notes:draft.notes,evidence_ids:draft.mediaIds}:{reason:draft.reason};
 const parsed=(operation==='complete'?healthLocalCompletionSchema:healthSchema).safeParse({operation,payload,...(id?{id}:{}),request_id:draft.request_id});if(!parsed.success)throw Error(healthValidationMessage(parsed.error));
 const result=await submitOrQueue('/api/farm/health',parsed.data,{mediaIds:draft.mediaIds});if(!result.success)throw Error(result.error);if(key)localStorage.removeItem(key);onSaved();
 }catch(e){setError(e instanceof Error?e.message:'Entry retained. Please retry.');}finally{setBusy(false);}}
 return <form onSubmit={submit}><fieldset disabled={busy||isSyncing||photoBusy} className="space-y-4">
 {operation==='note'&&<>
  <label className="block text-sm font-medium">Date<input type="date" required max={farmDateToday()} className={field} value={draft.date} onChange={e=>update('date',e.target.value)}/></label>
  {admin&&!task&&<label className="block text-sm font-medium">Farm supervisor<select required className={field} value={draft.period_id} onChange={e=>update('period_id',e.target.value)}><option value="">Choose the supervisor</option>{data.managers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
  <label className="block text-sm font-medium">Task name<input required className={field} maxLength={200} placeholder="e.g. Morning health check" value={draft.title} onChange={e=>update('title',e.target.value)}/></label>
  <label className="block text-sm font-medium">Animal or area (optional)<input className={field} maxLength={200} placeholder="e.g. Pen A" value={draft.area||''} onChange={e=>update('area',e.target.value)}/></label>
  <label className="block text-sm font-medium">What was observed or done?<textarea required rows={3} className={field} maxLength={4000} value={draft.notes} onChange={e=>update('notes',e.target.value)}/></label>
  <label className="block text-sm font-medium">Follow-up date (optional)<input type="date" className={field} min={draft.date} value={draft.follow_up||''} onChange={e=>update('follow_up',e.target.value)}/></label>
 </>}
 {operation==='schedule'&&<><label className="block text-sm font-medium">Named batch<select aria-label="Named batch" required className={field} value={draft.batch_id} onChange={e=>{update('batch_id',e.target.value);update('period_id','');}}><option value="">Choose the batch</option>{data.batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="block text-sm font-medium">Responsible manager<select aria-label="Responsible manager" required className={field} value={draft.period_id} onChange={e=>update('period_id',e.target.value)}><option value="">Choose an assigned manager</option>{data.managers.filter(m=>m.batch_ids.includes(draft.batch_id)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label></>}
 {['schedule','amend'].includes(operation)&&<><label className="block text-sm font-medium">Task title<input required maxLength={200} className={field} value={draft.title} onChange={e=>update('title',e.target.value)}/></label><label className="block text-sm font-medium">Approved instructions<textarea required maxLength={4000} className={field} value={draft.instructions} onChange={e=>update('instructions',e.target.value)}/></label><label className="block text-sm font-medium">Due date<input type="date" required className={field} value={draft.due_date} onChange={e=>update('due_date',e.target.value)}/></label><p className="text-xs text-slate-600">Use the actual owner or veterinary schedule. The app does not prescribe a product or dose.</p></>}
 {operation==='complete'&&<><p className="text-sm font-medium">{task?.batch_name} · Due {task?.due_date&&displayDate(task.due_date)}</p><p className="text-sm">{task?.instructions}</p><label className="block text-sm font-medium">Actual completion date<input type="date" required max={farmDateToday()} className={field} value={draft.date} onChange={e=>update('date',e.target.value)}/></label><label className="block text-sm font-medium">Completion notes<textarea className={field} value={draft.notes} onChange={e=>update('notes',e.target.value)}/></label><p className="text-sm font-semibold">Photo of the treatment or product label</p><FarmPhotoPicker date={draft.date} batchId={task?.batch_id} resource="farm_health_completions" value={draft.mediaIds} onChange={v=>update('mediaIds',v)} onBusyChange={setPhotoBusy}/></>}
 {['amend','cancel','retract'].includes(operation)&&<label className="block text-sm font-medium">Reason<textarea required maxLength={2000} className={field} value={draft.reason} onChange={e=>update('reason',e.target.value)}/></label>}{error&&<p role="alert" className="text-sm text-red-800">{error}</p>}<div className="flex justify-end gap-2"><button type="button" className={button} onClick={onCancel}>Cancel</button><button type="submit" className={button+' bg-emerald-900 text-white'}>{busy?'Saving…':operation==='complete'?'Confirm done':'Save entry'}</button></div>
 </fieldset></form>;
}
function displayDate(date:string){
 return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
}
export function FarmHealth({admin=false}:{admin?:boolean}){

 const refresh=useFarmRecordRefresh();
 const send=useManagerFetch(),identity=useQueueIdentity(),[data,setData]=useState<HealthData|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0),[filter,setFilter]=useState('all'),[action,setAction]=useState<{operation:string;id?:string;task?:HealthTask}|null>(null);
 useEffect(()=>{const refresh=()=>setVersion(v=>v+1);window.addEventListener('farm-records-synced',refresh);window.addEventListener('farm-pending-changed',refresh);return()=>{window.removeEventListener('farm-records-synced',refresh);window.removeEventListener('farm-pending-changed',refresh);};},[]);
 useEffect(()=>{const c=new AbortController();setError('');send('/api/farm/health',{signal:c.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error||'Health tasks unavailable');setData(b);}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[send,version,refresh]);
 const pending=identity?getPendingItems(identity).filter(i=>i.endpoint==='/api/farm/health'):[],labels:Record<string,string>={note:'Record health details',schedule:'Schedule health task',amend:'Correct health schedule',cancel:'Cancel health schedule',complete:'Record completed task',retract:'Retract incorrect completion',details:'Task details',task_notes:'Task discussion',proof:'Completion proof'};
 const tasks=data?.tasks.filter(t=>filter==='all'||t.status===filter)||[];
 const today=farmDateToday();
 function badge(t:HealthTask){
  const days=Math.round((Date.parse(t.due_date)-Date.parse(today))/86400000);
  const label=t.status==='completed'?'Done':t.status==='cancelled'?'Cancelled':days<0?'Overdue '+Math.abs(days)+'d':days===0?'Due today':'In '+days+'d';
  const color=t.status==='completed'?'bg-emerald-100 text-emerald-950':t.status==='cancelled'?'bg-slate-100 text-slate-700':days<0?'bg-red-100 text-red-900':days<=3?'bg-amber-100 text-amber-950':'bg-slate-100 text-slate-800';
  const done=data?.completions.find(c=>c.id===t.completion_id&&c.state==='completed');
  return <><span className={'inline-block rounded-full px-2 py-1 text-xs font-bold '+color}>{label}</span>{done&&<span className="mt-1 block text-xs">{displayDate(done.date)}</span>}</>;
 }
 function taskActions(t:HealthTask){
  return <>
   {!admin&&!['cancelled','completed'].includes(t.status)&&<button type="button" className="min-h-11 rounded-lg bg-emerald-900 px-2 text-sm font-semibold text-white sm:px-4" onClick={()=>setAction({operation:'complete',id:t.id,task:t})}>Mark done</button>}
   {t.completion_id&&<button type="button" className="block min-h-11 text-sm font-semibold text-emerald-900 underline" onClick={()=>setAction({operation:'proof',id:t.completion_id!})}>{t.status==='completed'?'View proof':'View entry'}</button>}
  </>;
 }
 function taskDetails(t:HealthTask){
  return <>
   <dl className="grid grid-cols-2 gap-3 text-sm">
    <div><dt className="text-slate-600">Batch</dt><dd className="break-words font-semibold">{t.batch_name}</dd></div>
    <div><dt className="text-slate-600">Supervisor</dt><dd className="break-words">{t.manager_name}</dd></div>
    <div><dt className="text-slate-600">Due</dt><dd>{displayDate(t.due_date)}</dd></div>
    <div><dt className="text-slate-600">Status</dt><dd>{badge(t)}</dd></div>
   </dl>
   <p className="whitespace-pre-wrap break-words text-sm">{t.instructions}</p>
   {(data?.recommendations||[]).filter(r=>r.task_id===t.id).map(r=><p key={r.id} className="whitespace-pre-wrap break-words text-sm">Vet recommendation · {r.body} · {r.actor_name} · {farmTimestamp(r.created_at)}</p>)}
   <div className="flex flex-wrap gap-2">
    <button type="button" className={button} onClick={()=>setAction({operation:'note',id:t.id,task:t})}>Add details to task</button>
    {admin&&t.status!=='cancelled'&&<>
     <button type="button" className={button} onClick={()=>setAction({operation:'amend',id:t.id,task:t})}>Correct schedule</button>
     <button type="button" className={button} onClick={()=>setAction({operation:'cancel',id:t.id,task:t})}>Cancel schedule</button>
    </>}
    <button type="button" className={button} onClick={()=>setAction({operation:'task_notes',id:t.id,task:t})}>Questions &amp; replies</button>
   </div>
  </>;
 }
 return <div className="mx-auto max-w-6xl space-y-4 rounded-2xl bg-[#edf2ec] p-3 text-[#18271f] sm:p-5">
 <header className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-sm">Scheduled vaccines, treatments and checkups. Each completed task has a date and photo.</p>
 <div className="flex flex-wrap gap-2"><button className={button+' bg-emerald-900 text-white'} onClick={()=>setAction({operation:'note'})}>Record health details</button>{admin&&<button className={button+' bg-white'} onClick={()=>setAction({operation:'schedule'})}>Add to schedule</button>}</div></header>
 {pending.map(i=><p key={i.id} role="status" className="rounded-xl bg-amber-50 p-3 text-sm">{i.conflict||'Saved on this device. Waiting to send.'}</p>)}
 {error?<p role="alert">{error} <button className={button} onClick={()=>setVersion(v=>v+1)}>Retry</button></p>:!data?<p role="status">Loading schedules…</p>:<>
 <section className="rounded-xl border border-[#cbd5ca] bg-white p-3 sm:p-4">
 {data.tasks.length>0&&<label className="mb-3 flex flex-wrap items-center gap-3 text-sm font-semibold">Show<select aria-label="Show health tasks" value={filter} onChange={e=>setFilter(e.target.value)} className="min-h-11 rounded-lg border bg-white px-3">{[['all','All tasks'],['overdue','Overdue'],['due_today','Due today'],['scheduled','Upcoming'],['completed','Completed'],['cancelled','Cancelled']].map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>}
 {!tasks.length&&<p className="py-3">{data.tasks.length?'No tasks match this status.':'No health tasks scheduled yet.'}</p>}
 {!data.tasks.length&&admin&&<div className="flex flex-wrap gap-3 text-sm"><Link className="inline-flex min-h-11 items-center text-emerald-900 underline" href="/dashboard/farm/batches">Check farm groups</Link><Link className="inline-flex min-h-11 items-center text-emerald-900 underline" href="/dashboard/managers">Check manager assignments</Link></div>}
 {tasks.length>0&&<Table className={healthTable}>
  <caption className="sr-only">Farm health schedule</caption>
  <thead><tr>
   <th scope="col">Task<span className="sm:hidden"> / batch</span></th>
   <th scope="col" className="hidden w-[22%] sm:table-cell">Batch</th>
   <th scope="col" className="w-[23%] sm:w-[15%]">Due</th>
   <th scope="col" className="w-[31%] sm:w-[17%]">Status{!admin&&<span className="sm:hidden"> / action</span>}</th>
   {!admin&&<th scope="col" className="hidden w-[19%] sm:table-cell">Action</th>}
  </tr></thead>
  <tbody>{tasks.map(t=><tr key={t.id}>
   <th scope="row" className="font-normal"><h2 className="font-bold">{t.title}</h2><span className="block text-xs text-slate-600 sm:hidden">{t.batch_name}</span>
    <button type="button" className="min-h-11 text-sm font-medium text-emerald-900 underline" onClick={()=>setAction({operation:'details',id:t.id,task:t})}>Task details</button>
   </th>
   <td className="hidden sm:table-cell">{t.batch_name}<span className="block text-xs text-slate-600">{t.manager_name}</span></td>
   <td><time dateTime={t.due_date}>{displayDate(t.due_date)}</time></td>
   <td>{badge(t)}<div className={admin?'mt-1':'mt-1 sm:hidden'}>{taskActions(t)}</div></td>
   {!admin&&<td className="hidden sm:table-cell">{taskActions(t)}</td>}
  </tr>)}</tbody>
 </Table>}</section>
 {Boolean(data.notes?.length)&&<section className="rounded-xl border bg-white p-3 sm:p-4"><h2 className="mb-2 text-lg font-bold">Recorded health details</h2>
  <Table className={healthTable}><caption className="sr-only">Recorded health details</caption>
   <thead><tr><th scope="col" className="w-[24%] sm:w-[16%]">Date</th><th scope="col" className="w-[32%] sm:w-[24%]">Task / area</th><th scope="col">Observation</th><th scope="col" className="hidden w-[17%] sm:table-cell">Recorded by</th><th scope="col" className="hidden w-[15%] sm:table-cell">Follow up</th></tr></thead>
   <tbody>{data.notes?.map(note=><tr key={note.id}>
    <td><time dateTime={note.date}>{displayDate(note.date)}</time></td>
    <th scope="row" className="font-normal"><strong>{note.title}</strong>{note.area&&<span className="block text-xs text-slate-600">{note.area}</span>}</th>
    <td><p className="whitespace-pre-wrap">{note.details}</p>
     <p className="mt-1 text-xs text-slate-600 sm:hidden">{note.actor_name}{admin&&note.manager_name!==note.actor_name&&<span className="block">For {note.manager_name}</span>}</p>
     {note.follow_up&&<p className="mt-1 text-xs font-semibold sm:hidden">Follow up {displayDate(note.follow_up)}</p>}
    </td>
    <td className="hidden sm:table-cell">{note.actor_name}{admin&&note.manager_name!==note.actor_name&&<span className="block text-xs text-slate-600">For {note.manager_name}</span>}</td>
    <td className="hidden sm:table-cell">{note.follow_up&&<time dateTime={note.follow_up}>{displayDate(note.follow_up)}</time>}</td>
   </tr>)}</tbody>
  </Table>
 </section>}
 <details className="rounded-xl border bg-white p-3 sm:p-4"><summary className="min-h-11 cursor-pointer font-semibold">Completion history</summary>
  {!data.completions.length?<p className="text-sm">No completed work recorded.</p>:<Table className={healthTable}><caption className="sr-only">Completion history</caption>
   <thead><tr><th scope="col">Task / batch</th><th scope="col" className="w-[23%] sm:w-[16%]">Date</th><th scope="col" className="hidden w-[21%] sm:table-cell">Recorded by</th><th scope="col" className="w-[29%] sm:w-[16%]">Status</th></tr></thead>
   <tbody>{data.completions.map(x=>{
    const task=data.tasks.find(t=>t.id===x.task_id);
    const recordedBy=x.actor_name||'Name not recorded';
    return <tr key={x.id}>
     <th scope="row" className="font-normal"><strong>{task?.title||'Recorded task'}</strong>{task?.batch_name&&<span className="block text-xs text-slate-600">{task.batch_name}</span>}
      <details className="mt-1"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-emerald-900 underline">Entry details</summary>
       <p className="text-xs text-slate-600">Entered {farmTimestamp(x.created_at)}</p>
       {(x.notes||x.reason)&&<p className="mt-1 whitespace-pre-wrap">{x.notes||x.reason}</p>}
       {admin&&x.state==='completed'&&!data.completions.some(n=>n.supersedes_id===x.id)&&<button type="button" className="mt-1 min-h-11 text-left text-sm font-semibold text-emerald-900 underline" onClick={()=>setAction({operation:'retract',id:x.id})}>Retract incorrect completion</button>}
      </details>
     </th>
     <td><time dateTime={x.date}>{displayDate(x.date)}</time><span className="mt-1 block text-xs text-slate-600 sm:hidden">{recordedBy}</span></td>
     <td className="hidden sm:table-cell">{recordedBy}</td>
     <td><span className="font-medium">{x.state==='completed'?'Completed':'Retracted'}</span>
      {x.state==='completed'&&<button type="button" className="block min-h-11 text-left text-sm font-semibold text-emerald-900 underline" onClick={()=>setAction({operation:'proof',id:x.id})}>View proof</button>}
     </td>
    </tr>;
   })}</tbody>
  </Table>}
 </details></>}
 <Dialog open={!!action} onOpenChange={open=>{if(!open)setAction(null);}}><DialogContent><DialogTitle className="pr-10">{action?.operation==='details'?action.task?.title:action?.operation==='proof'&&data?.completions.find(c=>c.id===action.id)?.state==='retracted'?'Completion entry':action?.operation==="complete"?"Mark done · "+action.task?.title:action&&labels[action.operation]}</DialogTitle><DialogDescription>{action?.operation==='complete'?'Record when the work was done.':'Farm health schedule'}</DialogDescription>{action?.operation==='details'&&action.task?taskDetails(action.task):action?.id&&['proof','task_notes'].includes(action.operation)?<FarmRecordThread resource={action.operation==='proof'?'farm_health_completions':'farm_health_tasks'} recordId={action.id}/>:action?.operation==='schedule'&&data&&!data.batches.some(b=>data.managers.some(m=>m.batch_ids.includes(b.id)))?<div className="space-y-3"><p>Choose a real farm group and assign its supervisor before scheduling work.</p><Link className={button} href="/dashboard/farm/batches">Set up farm groups</Link> <Link className={button} href="/dashboard/managers">Assign a supervisor</Link></div>:action&&data&&<HealthForm key={action.operation+action.id} {...action} admin={admin} data={data} onCancel={()=>setAction(null)} onSaved={()=>{setAction(null);setVersion(v=>v+1);}}/>}</DialogContent></Dialog></div>;
}
