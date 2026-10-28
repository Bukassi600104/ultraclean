"use client";
import {useState,useEffect,useCallback,useRef} from "react";
import {getPendingItems,getPendingCount,getQuarantinedCount,savePending,queueIdentityKey} from "@/lib/offline-storage";
import {syncManagerPending} from "@/lib/manager-offline-sync";
import {useManagerPeriod,useQueueIdentity} from "@/contexts/ManagerPeriodContext";
import {toast} from "sonner";
export function useOfflineSync(){
 const identity=useQueueIdentity(),scope=useManagerPeriod(),key=identity?queueIdentityKey(identity):"",current=useRef(key);current.current=key;
 const [isOnline,setOnline]=useState(true),[pendingCount,setCount]=useState(0),[isSyncing,setSyncing]=useState(false),[conflicts,setConflicts]=useState<ReturnType<typeof getPendingItems>>([]),[quarantinedCount,setQuarantined]=useState(0),active=useRef<AbortController|null>(null);
 const refresh=useCallback(()=>{setCount(identity?getPendingCount(identity):0);setConflicts(identity?getPendingItems(identity).filter(item=>item.conflict):[]);setQuarantined(getQuarantinedCount());},[key]);
 useEffect(()=>{const online=()=>setOnline(navigator.onLine);online();refresh();window.addEventListener("online",online);window.addEventListener("offline",online);window.addEventListener("farm-pending-changed",refresh);return()=>{window.removeEventListener("online",online);window.removeEventListener("offline",online);window.removeEventListener("farm-pending-changed",refresh);active.current?.abort();active.current=null;};},[key,refresh]);
 const syncPending=useCallback(async()=>{if(!identity||scope?.status!=="active"||!navigator.onLine||active.current)return;const controller=new AbortController();active.current=controller;setSyncing(true);try{const count=await syncManagerPending(identity,{isCurrent:()=>current.current===key,signal:controller.signal});if(current.current===key&&count)toast.success(`Synced ${count} saved entries`);}finally{if(active.current===controller){active.current=null;setSyncing(false);refresh();}}},[key,scope?.status,refresh]);
 useEffect(()=>{if(isOnline&&pendingCount&&!conflicts.length)void syncPending();},[isOnline,pendingCount,conflicts.length,syncPending]);
 const submitOrQueue=useCallback(async(endpoint:string,data:Record<string,unknown>)=>{if(!identity||scope?.status!=="active")return {success:false,error:"Wait for your workspace to load"};savePending(endpoint,data,identity);refresh();if(navigator.onLine)await syncPending();return {success:true,offline:!navigator.onLine};},[key,scope?.status,refresh,syncPending]);
 return {isOnline,pendingCount,isSyncing,conflicts,quarantinedCount,submitOrQueue,syncPending};
}
