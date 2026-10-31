'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {APP_RELEASE,QUEUE_FORMAT} from '@/lib/app-release';
import {queueUpdateProblem} from '@/lib/app-update-safety';
type Release={releaseId:string;notes:string[];queueFormat:number;promoted:boolean};
export function AppUpdateNotice(){
 const path=usePathname(),[release,setRelease]=useState<Release|null>(null),[later,setLater]=useState(''),[details,setDetails]=useState(false),[error,setError]=useState('');
 const dirty=useRef(false),writes=useRef(0),channel=useRef<BroadcastChannel|null>(null);
 const app=path.startsWith('/property')?'property':path.startsWith('/content')?'content':path.startsWith('/manager')?'farm':path.startsWith('/dashboard')?'ceo':typeof window!=='undefined'&&location.hostname==='farm.primefieldagric.com'?'farm':null;
 useEffect(()=>{dirty.current=false;setError('');},[path]);
 useEffect(()=>{
  if(!app)return;
  let alive=true;const original=window.fetch;
  const tracked:typeof fetch=async(input,init)=>{const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase(),write=!['GET','HEAD','OPTIONS'].includes(method);if(write)writes.current++;try{return await original(input,init);}finally{if(write)writes.current--;}};
  window.fetch=tracked;
  const input=()=>{dirty.current=true;};document.addEventListener('input',input,true);document.addEventListener('change',input,true);
  const beforeReload=(event:Event)=>{
   let reason='';
   try{reason=writes.current||document.querySelector('[data-update-busy="true"],form[aria-busy="true"]')?'Wait for the current submission or photo to finish.':dirty.current||document.querySelector('[data-unsaved-changes="true"]')?'Save your work and return to the overview before reloading.':queueUpdateProblem(localStorage,QUEUE_FORMAT)||'';}catch{reason='Storage could not be checked. Keep this tab open.';}
   if(reason){event.preventDefault();(event as CustomEvent<{reason:string}>).detail.reason=reason;}
  };
  window.addEventListener('app-reload-check',beforeReload);
  const check=async()=>{if(!navigator.onLine||document.visibilityState==='hidden')return;try{const response=await original('/api/app-version',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)return;const value=await response.json();if(alive&&value.promoted===true&&typeof value.releaseId==='string'&&value.releaseId!==APP_RELEASE&&Array.isArray(value.notes)&&value.notes.every((note:unknown)=>typeof note==='string')&&Number.isInteger(value.queueFormat)){setRelease(value);}}catch{/* A failed version check never interrupts work. */}};
  if('BroadcastChannel' in window){channel.current=new BroadcastChannel('bossbimbz-release:'+app);channel.current.onmessage=()=>void check();}
  void check();const interval=setInterval(()=>void check(),5*60*1000);window.addEventListener('online',check);document.addEventListener('visibilitychange',check);
  return()=>{alive=false;clearInterval(interval);window.removeEventListener('app-reload-check',beforeReload);window.removeEventListener('online',check);document.removeEventListener('visibilitychange',check);document.removeEventListener('input',input,true);document.removeEventListener('change',input,true);channel.current?.close();channel.current=null;if(window.fetch===tracked)window.fetch=original;};
 },[app]);
 async function update(){
  setError('');
  if(!navigator.onLine){setError('Reconnect before updating. Saved work stays on this device.');return;}
  if(writes.current||document.querySelector('form[aria-busy="true"],[data-update-busy="true"]')){setError('Wait for the current submission or photo to finish before updating.');return;}
  if(dirty.current||document.querySelector('[data-unsaved-changes="true"]')){setError('Save your work, then open your overview to update safely. This page will not refresh while you are editing.');return;}
  try{
   const problem=queueUpdateProblem(localStorage,release?.queueFormat??0);if(problem){setError(problem);return;}
   const checkKey='bossbimbz-update-storage-check';localStorage.setItem(checkKey,'1');localStorage.removeItem(checkKey);
   channel.current?.postMessage({releaseId:release?.releaseId});
   if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration(location.href);await registration?.update();}
   if(writes.current||dirty.current){setError('Work started while checking the update. Finish it before trying again.');return;}
   location.reload();
  }catch{setError('The update could not be prepared safely. Your saved work is retained. Please retry.');}
 }
 if(!app||!release||later===release.releaseId)return null;
 return <aside aria-label="App update" className="fixed bottom-20 left-3 right-3 z-[60] mx-auto max-w-lg rounded-xl border border-emerald-200 bg-white p-4 text-sm text-slate-900 shadow-lg"><p className="font-semibold">Update available</p><p className="mt-1">Your records and saved offline entries will be kept.</p><div className="mt-2 flex flex-wrap gap-2"><button className="min-h-11 rounded-lg bg-emerald-900 px-3 text-white" onClick={()=>void update()}>Update now</button><button className="min-h-11 px-3 underline" onClick={()=>setLater(release.releaseId)}>Later</button><button className="min-h-11 px-3 underline" onClick={()=>setDetails(!details)} aria-expanded={details}>What’s new</button></div>{details&&<ul className="mt-2 list-disc space-y-1 pl-5">{release.notes.map((note,index)=><li key={index}>{note}</li>)}</ul>}{error&&<p role="alert" className="mt-2 text-amber-900">{error}</p>}</aside>;
}
