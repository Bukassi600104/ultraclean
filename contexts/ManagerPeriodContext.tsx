"use client";
import {createContext,useCallback,useContext,useEffect,useRef,useState,useMemo,type ReactNode} from "react";
import {useAuth} from "@/contexts/AuthContext";
import type {Business,ManagerScope} from "@/lib/manager-period-types";
import type {QueueIdentity} from "@/lib/offline-storage";
const Context=createContext<ManagerScope|null>(null);
const FeatureContext=createContext<{enabled:boolean|null;error:string;refresh:()=>void}>({enabled:null,error:"",refresh:()=>{}});
export function useManagerPeriod(){return useContext(Context);}
export function useOperationsFeature(){const scope=useManagerPeriod(),feature=useContext(FeatureContext);return scope?{...feature,enabled:scope.featureEnabled}:feature;}
export function OperationsFeatureProvider({actorId,children}:{actorId:string;children:ReactNode}){
 const [state,setState]=useState<{actor:string;enabled:boolean}|null>(null),[error,setError]=useState(""),[version,setVersion]=useState(0),refresh=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{const controller=new AbortController();setState(null);setError("");fetch("/api/operations/manager-context?business=farm",{cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(async response=>{const body=await response.json();if(!response.ok)throw Error(body.error||"Unable to verify operations availability");if(body.actorId!==actorId||body.business!=="farm"||typeof body.featureEnabled!=="boolean")throw Error("Operations availability could not be verified");if(!controller.signal.aborted)setState({actor:actorId,enabled:body.featureEnabled});}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[actorId,version]);
 return <FeatureContext.Provider value={{enabled:state?.actor===actorId?state.enabled:null,error,refresh}}>{children}</FeatureContext.Provider>;
}
export function useQueueIdentity():QueueIdentity|null{const scope=useManagerPeriod();return useMemo(()=>scope?{actorId:scope.actorId,business:scope.business,periodId:scope.mode==="personal"?scope.periodId!:scope.mode==="legacy"?"legacy":"admin"}:null,[scope]);}
export function useManagerStorageKey(base:string|null){const scope=useManagerPeriod();return base?`${base}:period:${scope?.mode==="personal"?scope.periodId:scope?.mode==="legacy"?"legacy":"admin"}`:null;}
export function useManagerFetch(){
 const {profile}=useAuth(),scope=useManagerPeriod(),key=scope?`${scope.actorId}:${scope.periodId}`:`admin:${profile?.id||"pending"}`,current=useRef(key),controller=useRef(new AbortController());
 current.current=key;
 useEffect(()=>{const active=controller.current;return()=>active.abort();},[key]);
 return useCallback(async(input:RequestInfo|URL,init:RequestInit={})=>{
  if(controller.current.signal.aborted)controller.current=new AbortController();
  const headers=new Headers(init.headers);
  if(scope){headers.set("X-Manager-Actor",scope.actorId);headers.set("X-Manager-Period",scope.periodId||"legacy");}
  if(scope?.periodId&&scope.actorId!==scope.managerId){
   const url=new URL(input instanceof Request?input.url:String(input),window.location.origin);
   if(url.origin!==window.location.origin)throw Error('Scoped requests must stay within this application');
   url.searchParams.set('period_id',scope.periodId);input=input instanceof Request?new Request(url,input):url;
  }
  const response=await fetch(input,{...init,cache:"no-store",headers,signal:AbortSignal.any([controller.current.signal,AbortSignal.timeout(30000),...(init.signal?[init.signal]:[])])});
  if(current.current!==key)throw new DOMException("Manager changed","AbortError");return response;
 },[key,scope]);
}
export function ManagerPeriodProvider({business,actorId,periodId,children}:{business:Business;actorId?:string;periodId?:string;children:ReactNode}){
 const auth=useAuth(),{profile}=auth,identity=actorId||profile?.id;
 const workspaceKey=`${identity}:${business}:${periodId||''}`;
 const [state,setState]=useState<{key:string;scope:ManagerScope}|null>(null),[error,setError]=useState(""),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!identity)return;const controller=new AbortController();const timeout=setTimeout(()=>{setError("Workspace took too long to load. Retry when connected. Reference: WORKSPACE_TIMEOUT");controller.abort();},15000);setError("");setState(null);
  fetch(`/api/operations/manager-context?business=${business}${periodId?'&period_id='+encodeURIComponent(periodId):''}`,{cache:"no-store",signal:controller.signal}).then(async response=>{const body=await response.json();if(!response.ok)throw Error(body.error);if(body.actorId!==identity||body.business!==business||typeof body.featureEnabled!=="boolean"||(periodId&&body.periodId!==periodId))throw Error("Manager identity changed. Refresh before continuing.");if(!controller.signal.aborted){clearTimeout(timeout);setState({key:workspaceKey,scope:body});}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>{clearTimeout(timeout);controller.abort();};
 },[identity,business,retry,periodId,workspaceKey]);
 if(!identity&&!auth.isLoading)return <div className="mx-auto max-w-xl p-6" role="alert"><p>{auth.error?"Unable to verify your sign-in. Retry when connected.":"Sign in to open your workspace."}</p><button className="min-h-11 underline" onClick={auth.retry}>Retry</button><a href="/login?reauth=1" className="ml-3 inline-flex min-h-11 items-center underline">Sign in</a></div>;
 if(!state||state.key!==workspaceKey)return <div className="mx-auto max-w-xl p-6" role={error?"alert":"status"}>{error||"Loading your workspace…"}{error&&<button className="ml-3 min-h-11 underline" onClick={()=>setRetry(v=>v+1)}>Retry</button>}</div>;
 if(state.scope.mode==="personal"&&!state.scope.featureEnabled)return <div className="mx-auto max-w-xl p-6" role="status">Your workspace is briefly paused for an update. Saved entries are retained.<button className="ml-3 min-h-11 underline" onClick={()=>setRetry(v=>v+1)}>Refresh workspace</button></div>;
 return <Context.Provider value={state.scope}><div key={`${state.key}:${state.scope.periodId}`}>{children}</div></Context.Provider>;
}
