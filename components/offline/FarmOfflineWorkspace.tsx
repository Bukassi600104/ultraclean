'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
import {ReportFields} from '@/components/manager/FarmOperations';
import type {ReportSections} from '@/lib/farm-reports';
import {createClient} from '@/lib/supabase/client';
import {FARM_WORKSPACE_POINTER,matchingWorkspace,farmReportDraftKey,preparedWorkspace,sameWorkspace,type PreparedFarmWorkspace} from '@/lib/farm-offline-workspace';
import {getPendingItems,savePending} from '@/lib/offline-storage';
import {getFarmMedia} from '@/lib/farm-offline-media';
import {syncManagerPending} from '@/lib/manager-offline-sync';
type Draft={form:{report_date:string;sections:ReportSections;decision_required:boolean};selected?:{id:string;revision:number;status:string}|null;mediaIds?:string[];requestId?:string;queuedRequest?:string;[key:string]:unknown};

export function FarmOfflineWorkspace(){
 const [workspace,setWorkspace]=useState<PreparedFarmWorkspace|null>(null),[draft,setDraft]=useState<Draft|null>(null),[message,setMessage]=useState('Checking this device’s saved sign-in…'),[busy,setBusy]=useState(false),[reason,setReason]=useState(''),[photos,setPhotos]=useState<{id:string;url:string}[]>([]);
 useEffect(()=>{
  const auth=createClient();if(!auth){setMessage('Reconnect and sign in before opening saved work.');return;}let alive=true;const urls:string[]=[];
  const lock=()=>{if(alive){setWorkspace(null);setDraft(null);setPhotos([]);setMessage('This workspace is locked. Reconnect and sign in with the account that saved this work.');}try{localStorage.removeItem(FARM_WORKSPACE_POINTER);}catch{/* Preserve drafts and photos. */}};
  let actor='';const {data:{subscription}}=auth.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(actor&&session?.user.id!==actor))lock();});
  const storageChanged=(event:StorageEvent)=>{if(event.key===FARM_WORKSPACE_POINTER)lock();};window.addEventListener('storage',storageChanged);
  void (async()=>{try{
   const {data}=await Promise.race([auth.auth.getSession(),new Promise<never>((_,reject)=>setTimeout(()=>reject(Error('Saved sign-in unavailable')),8000))]);if(!alive)return;actor=data.session?.user.id||'';
   const prepared=matchingWorkspace(JSON.parse(localStorage.getItem(FARM_WORKSPACE_POINTER)||'null'),actor);
   if(!prepared){lock();return;}
   const saved=JSON.parse(localStorage.getItem(farmReportDraftKey(prepared.identity))||'null') as Draft|null;
   setWorkspace(prepared);
   if(saved?.form?.sections&&typeof saved.form.report_date==='string'){const queued=saved.requestId&&getPendingItems(prepared.identity).some(item=>item.requestId===saved.requestId);setDraft(queued?{...saved,queuedRequest:saved.requestId}:saved);setMessage('Saved on this device. Nothing here is sent until the server confirms it.');
    const media=await getFarmMedia(prepared.identity);if(!alive)return;
    setPhotos(media.filter(item=>saved.mediaIds?.includes(item.id)).map(item=>{const url=URL.createObjectURL(item.blob);urls.push(url);return {id:item.id,url};}));
   }else setMessage('No prepared daily report on this device. Reconnect to prepare a report.');
  }catch{if(alive)setMessage('Saved work could not be opened. Reconnect and sign in. Your saved entries have not been deleted.');}})();
  return()=>{alive=false;subscription.unsubscribe();window.removeEventListener('storage',storageChanged);urls.forEach(url=>URL.revokeObjectURL(url));};
 },[]);
 const locked=!!draft?.queuedRequest||draft?.selected?.status==='submitted';
 function change(next:Draft){if(!workspace||locked)return;try{localStorage.setItem(farmReportDraftKey(workspace.identity),JSON.stringify(next));setDraft(next);setMessage('Saved on this device.');}catch{setMessage('Device storage is full or unavailable. Your change was not saved. Keep the app open and restore storage.');}}
 async function send(){
  if(!workspace||busy)return;setBusy(true);
  try{
   const auth=createClient(),{data}=await auth!.auth.getSession();
   if(data.session?.user.id!==workspace.identity.actorId)throw Error('Sign in with the account that saved this work.');
   const response=await fetch('/api/operations/manager-context?business=farm',{cache:'no-store'});
   if(!response.ok)throw Error('Reconnect and sign in before sending saved work.');
   const scope=await response.json(),verified=preparedWorkspace(scope,data.session.user.id);
   if(!verified||!sameWorkspace(verified.identity,workspace.identity))throw Error('Your account or responsibility period changed. Saved entries are retained for review.');
   const scopedSend:typeof fetch=(input,init={})=>{const headers=new Headers(init.headers);headers.set('X-Manager-Actor',scope.actorId);headers.set('X-Manager-Period',scope.periodId||'legacy');return fetch(input,{...init,headers,cache:'no-store'});};
   await syncManagerPending(workspace.identity,{send:scopedSend,isCurrent:()=>localStorage.getItem(FARM_WORKSPACE_POINTER)===JSON.stringify(workspace)});
   const pending=getPendingItems(workspace.identity);setMessage(pending.length?`${pending.length} saved entries remain. Open the app to review any entries needing attention.`:'Server confirmed all queued entries. Reopen the app to view sent records.');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to send. Saved work remains on this device.');}finally{setBusy(false);}
 }
 useEffect(()=>{
  const online=()=>{if(workspace)void send();};window.addEventListener('online',online);
  const foreground=()=>{if(document.visibilityState==='visible'&&navigator.onLine)online();};document.addEventListener('visibilitychange',foreground);
  return()=>{window.removeEventListener('online',online);document.removeEventListener('visibilitychange',foreground);};
 // The workspace identity is immutable while this shell is open.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[workspace]);
 return <main data-farm-offline-shell className="min-h-screen bg-emerald-50 px-4 py-8"><div className="mx-auto max-w-4xl space-y-5 rounded-2xl border bg-white p-5 sm:p-8">
  <h1 className="text-2xl font-bold text-emerald-950">Saved Farm workspace</h1><p className="text-sm text-slate-700">First-time sign-in needs internet. Uploading may wait until you reopen the app. Only previously prepared work is available here.</p>
  <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950">{message}</p>
  {workspace&&draft&&<><p className="font-semibold">Daily Report · {draft.form.report_date}</p><ReportFields sections={draft.form.sections} disabled={locked||busy} onChange={sections=>change({...draft,form:{...draft.form,sections}})}/>
   <label className="flex gap-2"><input type="checkbox" disabled={locked||busy} checked={draft.form.decision_required} onChange={event=>change({...draft,form:{...draft.form,decision_required:event.target.checked}})}/>Bimbo’s decision is needed</label>
   {!!photos.length&&<section><h2 className="font-semibold">Saved photos</h2><div className="flex flex-wrap gap-3">{photos.map(photo=><Image unoptimized width={112} height={112} key={photo.id} src={photo.url} alt="Saved supporting evidence" className="h-28 w-28 rounded-lg object-cover"/>)}</div><p className="text-xs text-slate-600">Original photos remain on this device until the server confirms the report.</p></section>}
   {!locked&&<>{draft.selected&&<label className="block">Reason for changing this saved draft<input className="mt-1 w-full rounded-lg border p-3" maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label>}<button disabled={busy||!!draft.selected&&!reason.trim()} className="min-h-11 rounded-lg bg-emerald-900 px-4 text-white disabled:opacity-50" onClick={()=>{
    try{
     const retryKey=`primefield-operation-retry:${workspace.identity.actorId}:daily-reports:period:${workspace.identity.periodId}`;
     if(localStorage.getItem(retryKey)||sessionStorage.getItem(retryKey)){setMessage('An earlier submission is unconfirmed. Reconnect and resolve it in the Farm app before sending another copy.');return;}
     const requestId=draft.requestId||crypto.randomUUID();
     // Persist a stable identifier before queue insertion so a storage failure cannot create a second report.
     localStorage.setItem(farmReportDraftKey(workspace.identity),JSON.stringify({...draft,requestId}));
     setDraft({...draft,requestId});
     if(!getPendingItems(workspace.identity).some(item=>item.requestId===requestId))savePending('/api/farm/daily-reports/submit',{...draft.form,request_id:requestId,...(draft.selected?{id:draft.selected.id,revision:draft.selected.revision,reason}:{})},workspace.identity,{mediaIds:draft.mediaIds});
     const queuedDraft={...draft,requestId,queuedRequest:requestId};setDraft(queuedDraft);
     localStorage.setItem(farmReportDraftKey(workspace.identity),JSON.stringify(queuedDraft));setMessage('Waiting to send. Reconnect and reopen the app to send this report.');if(navigator.onLine)void send();
    }catch{setMessage('Unable to save the entry. Keep this report open and retry.');}
   }}>Save report to send</button></>}
  </>}
  {workspace&&<button disabled={busy} onClick={()=>void send()} className="min-h-11 rounded-lg border px-4">{busy?'Sending…':'Retry sending when connected'}</button>}
  <a href="/" className="ml-3 inline-flex min-h-11 items-center font-semibold text-emerald-800 underline">Return to Farm app</a>
 </div></main>;
}
