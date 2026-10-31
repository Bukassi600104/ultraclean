'use client';
import {useState} from 'react';
import {queueUpdateProblem} from '@/lib/app-update-safety';
import {QUEUE_FORMAT} from '@/lib/app-release';
export function AppLoadError({reset}:{reset:()=>void}){
 const [message,setMessage]=useState('');
 function reload(){
  try{
   const event=new CustomEvent('app-reload-check',{cancelable:true,detail:{reason:''}});window.dispatchEvent(event);
   const problem=event.defaultPrevented?event.detail.reason:queueUpdateProblem(localStorage,QUEUE_FORMAT);
   if(problem){setMessage(problem);return;}
   if(!navigator.onLine){setMessage('Reconnect before reloading. Saved entries remain on this device.');return;}
   location.reload();
  }catch{setMessage('Keep this tab open. Device storage could not be checked safely.');}
 }
 return <section role="alert" className="mx-auto max-w-lg space-y-3 p-6 text-slate-900"><h1 className="text-xl font-semibold">This page could not load</h1><p>Check your connection and try again. If the app was recently updated, reload its latest files. Your accounts and saved offline records will be kept.</p><p className="text-xs">Reference: APP_PAGE_LOAD</p><div className="flex flex-wrap gap-3"><button onClick={reset} className="min-h-11 rounded-lg bg-emerald-900 px-4 text-white">Try again</button><button onClick={reload} className="min-h-11 rounded-lg border px-4">Reload app</button></div>{message&&<p>{message}</p>}</section>;
}
