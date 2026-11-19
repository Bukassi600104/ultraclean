'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {APP_RELEASE,QUEUE_FORMAT} from '@/lib/app-release';
import {queueUpdateProblem} from '@/lib/app-update-safety';
import {farmMediaUpdateProblem} from '@/lib/farm-offline-media';

type App = 'farm' | 'ceo' | 'property' | 'content';
type Release = {releaseId:string;notes:string[];queueFormat:number;promoted:boolean};
type LatestRelease = {app:App; release:Release|null};

const storageKey = (app:App) => 'bossbimbz-release-seen:' + app;
const isRoute = (path:string,route:string) => path === route || path.startsWith(route + '/');

function operationalApp(path:string,host:string):App|null {
  if(host === 'farm.primefieldagric.com')return 'farm';
  if(isRoute(path,'/property'))return 'property';
  if(isRoute(path,'/content'))return 'content';
  if(host === 'leads.ultratidycleaning.com' || isRoute(path,'/dashboard'))return 'ceo';
  if(isRoute(path,'/manager'))return 'farm';
  return null;
}

function isRelease(value:unknown):value is Release {
  if(!value || typeof value !== 'object')return false;
  const release=value as Partial<Release>;
  return typeof release.promoted === 'boolean' &&
    typeof release.releaseId === 'string' && !!release.releaseId &&
    Array.isArray(release.notes) && release.notes.every(note=>typeof note === 'string') &&
    Number.isInteger(release.queueFormat) && (release.queueFormat ?? 0) > 0;
}

export function AppUpdateNotice() {
  const path=usePathname();
  const [host,setHost]=useState('');
  const app=operationalApp(path,host);
  const [latest,setLatest]=useState<LatestRelease|null>(null);
  const [seen,setSeen]=useState<{app:App;releaseId:string|null}|null>(null);
  const [later,setLater]=useState('');
  const [details,setDetails]=useState(false);
  const [error,setError]=useState('');
  const [applying,setApplying]=useState(false);
  const dirty=useRef(false);
  const writes=useRef(0);
  const updateInProgress=useRef(false);
  const channel=useRef<BroadcastChannel|null>(null);

  const checkForOpenWork=useCallback(()=>{
    if(writes.current || document.querySelector('[data-update-busy="true"], form[aria-busy="true"]')){
      return 'Wait for the current submission or photo to finish before updating.';
    }
    if(dirty.current || document.querySelector('[data-unsaved-changes="true"]')){
      return 'Save your work, then open your overview to update safely.';
    }
    return null;
  },[]);

  useEffect(()=>{setHost(window.location.hostname);},[]);
  useEffect(()=>{dirty.current=false;setError('');},[path]);

  useEffect(()=>{
    if(!app)return;

    const currentApp=app;
    const key=storageKey(currentApp);
    let active=true;
    let request:AbortController|undefined;
    let retryTimer:number|undefined;
    const original=window.fetch;
    const tracked:typeof fetch=async(input,init)=>{
      const method=(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const write=!['GET','HEAD','OPTIONS'].includes(method);
      if(write)writes.current++;
      try{return await original.call(window,input,init);}
      finally{if(write)writes.current--;}
    };
    window.fetch=tracked;

    function loadAcknowledgement(){
      try{setSeen({app:currentApp,releaseId:localStorage.getItem(key)});}
      catch{setSeen({app:currentApp,releaseId:null});}
    }
    const syncAcknowledgement=(event:StorageEvent)=>{
      if(event.key===key || event.key===null)loadAcknowledgement();
    };
    loadAcknowledgement();

    const trackInput=()=>{dirty.current=true;};
    const beforeReload=(event:Event)=>{
      let reason:string|null;
      try{reason=checkForOpenWork() || queueUpdateProblem(localStorage,QUEUE_FORMAT);}
      catch{reason='Storage could not be checked. Keep this tab open.';}
      if(reason){
        event.preventDefault();
        (event as CustomEvent<{reason:string}>).detail.reason=reason;
      }
    };

    async function check(retry:boolean){
      if(!active || request || !navigator.onLine || document.visibilityState === 'hidden')return;
      window.clearTimeout(retryTimer);
      const controller=new AbortController();
      request=controller;
      const timeout=window.setTimeout(()=>controller.abort(),10000);
      try{
        const response=await original.call(window,'/api/app-version',{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw Error('App version unavailable');
        const release:unknown=await response.json();
        if(!isRelease(release))throw Error('App version unavailable');
        if(active)setLatest({app:currentApp,release:release.promoted?release:null});
      }catch{
        if(active && retry)retryTimer=window.setTimeout(()=>void check(false),3000);
      }finally{
        window.clearTimeout(timeout);
        request=undefined;
      }
    }
    const refresh=()=>void check(true);
    const resumed=(event:PageTransitionEvent)=>{
      if(event.persisted)setLater('');
      refresh();
    };
    const foregrounded=()=>{
      if(document.visibilityState==='visible'){
        setLater('');
        refresh();
      }
    };
    try{
      if('BroadcastChannel' in window){
        channel.current=new BroadcastChannel('bossbimbz-release:' + app);
        channel.current.onmessage=refresh;
      }
    }catch{/* Local version checks also work without cross-tab messaging. */}

    refresh();
    const interval=window.setInterval(refresh,5*60*1000);
    window.addEventListener('online',refresh);
    window.addEventListener('focus',refresh);
    window.addEventListener('pageshow',resumed);
    window.addEventListener('storage',syncAcknowledgement);
    window.addEventListener('app-reload-check',beforeReload);
    document.addEventListener('visibilitychange',foregrounded);
    document.addEventListener('input',trackInput,true);
    document.addEventListener('change',trackInput,true);
    return()=>{
      active=false;
      request?.abort();
      window.clearTimeout(retryTimer);
      window.clearInterval(interval);
      window.removeEventListener('online',refresh);
      window.removeEventListener('focus',refresh);
      window.removeEventListener('pageshow',resumed);
      window.removeEventListener('storage',syncAcknowledgement);
      window.removeEventListener('app-reload-check',beforeReload);
      document.removeEventListener('visibilitychange',foregrounded);
      document.removeEventListener('input',trackInput,true);
      document.removeEventListener('change',trackInput,true);
      channel.current?.close();
      channel.current=null;
      if(window.fetch===tracked)window.fetch=original;
    };
  },[app,checkForOpenWork]);

  const release=latest?.app===app?latest.release:null;
  if(!app || !release)return null;
  const needsUpdate=release.releaseId!==APP_RELEASE;
  const noticeKey=app+':'+release.releaseId;
  if(needsUpdate ? later===noticeKey : (
    (app!=='farm' && app!=='ceo') || !release.notes.length || seen?.app!==app || seen.releaseId===release.releaseId
  ))return null;

  function acknowledge(){
    if(!app || !release)return;
    setSeen({app,releaseId:release.releaseId});
    try{localStorage.setItem(storageKey(app),release.releaseId);}
    catch{/* It stays dismissed for this session if device storage is unavailable. */}
  }

  async function applyUpdate(target:Release){
    if(updateInProgress.current)return;
    setError('');
    if(!navigator.onLine){setError('Reconnect before updating.');return;}
    const openWork=checkForOpenWork();
    if(openWork){setError(openWork);return;}
    updateInProgress.current=true;
    setApplying(true);
    const originalPage=location.href;
    try{
      const queueProblem=queueUpdateProblem(localStorage,target.queueFormat);
      if(queueProblem){setError(queueProblem);return;}
      const photoProblem=await farmMediaUpdateProblem(target.queueFormat);
      if(photoProblem){setError(photoProblem);return;}
      if(location.href!==originalPage)return;

      const newWork=checkForOpenWork() || queueUpdateProblem(localStorage,target.queueFormat);
      if(newWork){setError(newWork);return;}
      if(!navigator.onLine){setError('Reconnect before updating.');return;}

      try{channel.current?.postMessage({releaseId:target.releaseId});}catch{/* Other tabs check on resume. */}
      // Navigation is already network-first. Do not force a new service worker
      // to take over other tabs or block the page refresh on an offline-shell update.
      void Promise.resolve()
        .then(()=>navigator.serviceWorker?.getRegistration(originalPage))
        .then(registration=>registration?.update())
        .catch(()=>{});

      location.reload();
    }catch{setError('The update could not be prepared safely. Please retry.');}
    finally{updateInProgress.current=false;setApplying(false);}
  }

  return (
    <aside aria-label="App update" className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] mx-auto max-w-lg rounded-xl border border-emerald-200 bg-white p-4 text-sm text-slate-900 shadow-lg sm:left-auto sm:right-4">
      <p role="status" className="font-semibold">{needsUpdate?'Update available':'App updated'}</p>
      {(!needsUpdate || details) && <ul className="mt-2 list-disc space-y-1 pl-5">
        {release.notes.map(note=><li key={note}>{note}</li>)}
      </ul>}
      <div className="mt-2 flex flex-wrap gap-2">
        {needsUpdate ? <>
          <button type="button" className="min-h-11 rounded-lg bg-emerald-900 px-3 text-white disabled:opacity-60" disabled={applying} onClick={()=>void applyUpdate(release)}>{applying?'Preparing update...':'Update now'}</button>
          <button type="button" className="min-h-11 px-3 underline" disabled={applying} onClick={()=>setLater(noticeKey)}>Later</button>
          {!!release.notes.length && <button type="button" className="min-h-11 px-3 underline" onClick={()=>setDetails(!details)} aria-expanded={details}>What’s new</button>}
        </> : <button type="button" className="min-h-11 rounded-lg bg-emerald-900 px-3 text-white" onClick={acknowledge}>Got it</button>}
      </div>
      {error && needsUpdate && <p role="alert" className="mt-2 text-amber-900">{error}</p>}
    </aside>
  );
}
