"use client";
import {useCallback,useEffect,useState} from "react";
import {useAuth} from "@/contexts/AuthContext";
import {useManagerFetch,useOperationsFeature} from "@/contexts/ManagerPeriodContext";
import type {Business} from "@/lib/manager-period-types";
import type {CashSummary} from "@/lib/operations-cash-validation";
export function useOperationsFunds(business:Business,selection=""){
 const {enabled}=useOperationsFeature();
 const send=useManagerFetch(),{profile}=useAuth(),[data,setData]=useState<CashSummary|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[version,setVersion]=useState(0);
 const refresh=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{let current=true;const controller=new AbortController();setData(null);setError("");setLoading(true);
  if(enabled!==true){setLoading(false);return()=>{current=false;controller.abort();};}
  send(`/api/operations/funds?business=${business}${selection}`,{signal:controller.signal}).then(async response=>{const body=await response.json();if(!response.ok)throw Error(body.error||"Unable to load funds");if(current)setData(body);}).catch(e=>{if(current&&e.name!=="AbortError")setError(e.message);}).finally(()=>{if(current)setLoading(false);});
  return()=>{current=false;controller.abort();};
 },[business,selection,profile?.id,send,version,enabled]);
 useEffect(()=>{window.addEventListener("operations-cash-updated",refresh);window.addEventListener("focus",refresh);return()=>{window.removeEventListener("operations-cash-updated",refresh);window.removeEventListener("focus",refresh);};},[refresh]);
 return {data,error,loading,refresh};
}
