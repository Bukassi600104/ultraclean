"use client";
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import {useAuth} from "@/contexts/AuthContext";
import type {Business,ManagerScope} from "@/lib/manager-period-types";
import type {QueueIdentity} from "@/lib/offline-storage";
const Context=createContext<ManagerScope|null>(null);
export function useManagerPeriod(){return useContext(Context);}
export function useQueueIdentity():QueueIdentity|null{const scope=useManagerPeriod();return scope?{actorId:scope.actorId,business:scope.business,periodId:scope.periodId||"legacy"}:null;}
export function useManagerStorageKey(base:string|null){const scope=useManagerPeriod();return base?`${base}:period:${scope?.periodId||(scope?"legacy":"admin")}`:null;}
export function useManagerFetch(){
 const {profile}=useAuth(),scope=useManagerPeriod(),key=scope?`${scope.actorId}:${scope.periodId}`:`admin:${profile?.id||"pending"}`,current=useRef(key),controller=useRef(new AbortController());
 current.current=key;
 useEffect(()=>{const active=controller.current;return()=>active.abort();},[key]);
 return useCallback(async(input:RequestInfo|URL,init:RequestInit={})=>{
  if(controller.current.signal.aborted)controller.current=new AbortController();
  const headers=new Headers(init.headers);
  if(scope){headers.set("X-Manager-Actor",scope.actorId);headers.set("X-Manager-Period",scope.periodId||"legacy");}
  const response=await fetch(input,{...init,cache:"no-store",headers,signal:AbortSignal.any([controller.current.signal,...(init.signal?[init.signal]:[])])});
  if(current.current!==key)throw new DOMException("Manager changed","AbortError");return response;
 },[key,scope]);
}
export function ManagerPeriodProvider({business,actorId,children}:{business:Business;actorId?:string;children:ReactNode}){
 const {profile}=useAuth(),identity=actorId||profile?.id;
 const [state,setState]=useState<{key:string;scope:ManagerScope}|null>(null),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!identity)return;const controller=new AbortController();setError("");setState(null);
  fetch(`/api/operations/manager-context?business=${business}`,{cache:"no-store",signal:controller.signal}).then(async response=>{const body=await response.json();if(!response.ok)throw Error(body.error);if(body.actorId!==identity||body.business!==business)throw Error("Manager identity changed. Refresh before continuing.");if(!controller.signal.aborted)setState({key:identity,scope:body});}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>controller.abort();
 },[identity,business,retry]);
 if(!state||state.key!==identity)return <div className="mx-auto max-w-xl p-6" role={error?"alert":"status"}>{error||"Loading your workspace…"}{error&&<button className="ml-3 min-h-11 underline" onClick={()=>setRetry(v=>v+1)}>Retry</button>}</div>;
 return <Context.Provider value={state.scope}><div key={`${state.key}:${state.scope.periodId}`}>{children}</div></Context.Provider>;
}
