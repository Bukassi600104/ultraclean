'use client';
import {useEffect} from 'react';
import {useManagerPeriod} from '@/contexts/ManagerPeriodContext';
import {createClient} from '@/lib/supabase/client';
import {FARM_WORKSPACE_POINTER,preparedWorkspace} from '@/lib/farm-offline-workspace';

/** Metadata is written only after the server-backed provider verified the active manager. */
export function PrepareFarmOfflineWorkspace(){
 const scope=useManagerPeriod();
 useEffect(()=>{
  const auth=createClient();if(!auth)return;let stopped=false;
  const clear=()=>{try{localStorage.removeItem(FARM_WORKSPACE_POINTER);}catch{/* Never remove drafts. */}};
  const {data:{subscription}}=auth.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT'||(session&&scope&&session.user.id!==scope.actorId))clear();
  });
  void (async()=>{
   try{
   const {data}=await auth.auth.getSession();if(stopped)return;
   const prepared=scope&&preparedWorkspace(scope,data.session?.user.id||'');
   if(!prepared){clear();return;}
   // A root worker belongs only to the dedicated Farm origin, never the CEO or other apps.
   if(location.hostname!=='farm.primefieldagric.com')return;
    const registration=await navigator.serviceWorker?.register('/farm-sw.js',{scope:'/'});
    if(!registration||stopped)return;
    await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>setTimeout(()=>reject(Error('Offline preparation pending')),10000))]);if(stopped)return;
    registration.active?.postMessage({type:'PREPARE_FARM_OFFLINE'});
    localStorage.setItem(FARM_WORKSPACE_POINTER,JSON.stringify(prepared));
   }catch{/* Offline preparation is optional; ordinary online recording remains available. */}
  })();
  return()=>{stopped=true;subscription.unsubscribe();};
 },[scope]);
 return null;
}
