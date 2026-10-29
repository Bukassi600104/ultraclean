"use client";
import {useEffect,useRef,useState} from "react";
import {useAuth} from "@/contexts/AuthContext";
import {useManagerFetch} from "@/contexts/ManagerPeriodContext";
import {Button} from "@/components/ui/button";

export function LegacyManagerExportButton({targetId}:{targetId:string}){
 const {profile}=useAuth(),managerFetch=useManagerFetch(),key=`${profile?.id||""}:${targetId}`;
 const [access,setAccess]=useState<{key:string;allowed:boolean;error?:string}|null>(null),[version,setVersion]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const current=useRef(key),download=useRef<AbortController|null>(null);current.current=key;
 useEffect(()=>{
  const controller=new AbortController();setAccess(null);setBusy(false);setError("");
  if(profile?.id&&targetId)void (async()=>{try{const response=await managerFetch(`/api/managers/${encodeURIComponent(targetId)}/export?eligibility=1`,{cache:"no-store",signal:controller.signal});if([400,401,403].includes(response.status)){if(!controller.signal.aborted)setAccess({key,allowed:false});return;}const body=await response.json();if(!response.ok)throw Error("Export access could not be verified. Please retry.");if(!controller.signal.aborted)setAccess({key,allowed:body.allowed===true});}catch(e){if(!controller.signal.aborted)setAccess({key,allowed:false,error:e instanceof Error?e.message:"Export access could not be verified."});}})();
  return()=>{controller.abort();download.current?.abort();download.current=null;};
 },[key,profile?.id,targetId,managerFetch,version]);
 async function save(){
  if(download.current||access?.key!==key||!access.allowed)return;
  const controller=new AbortController(),owner=key;download.current=controller;setBusy(true);setError("");
  try{
   const response=await managerFetch(`/api/managers/${encodeURIComponent(targetId)}/export`,{cache:"no-store",signal:controller.signal});
   if(!response.ok){const body=await response.json();throw Error(body.error||"The historical export could not be prepared. Please retry.");}
   if(!response.headers.get("Content-Type")?.includes("spreadsheetml.sheet"))throw Error("The server did not return a complete Excel workbook. Please retry.");
   const blob=await response.blob();if(controller.signal.aborted||current.current!==owner)return;
   const supplied=response.headers.get("Content-Disposition")?.match(/filename="([a-zA-Z0-9_.-]+\.xlsx)"/)?.[1],url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=supplied||"primefield-account-history.xlsx";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  }catch(e){if(!controller.signal.aborted&&current.current===owner)setError(e instanceof Error?e.message:"The export could not be downloaded. Please retry.");}
  finally{if(download.current===controller)download.current=null;if(current.current===owner&&!controller.signal.aborted)setBusy(false);}
 }
 if(access?.key!==key)return null;
 if(access.error)return <div role="alert" className="space-y-2 text-sm text-red-800"><p>{access.error}</p><Button variant="outline" onClick={()=>setVersion(v=>v+1)}>Retry export access</Button></div>;
 if(!access.allowed)return null;
 return <section className="mb-4 space-y-2 rounded-xl border bg-white p-4"><Button variant="outline" className="min-h-11 h-auto whitespace-normal text-left" disabled={busy} onClick={()=>void save()}>{busy?"Preparing Excel…":"Export account history to Excel"}</Button><p className="max-w-md text-xs text-slate-600">All periods of this account, with attributable records and correction history. Downloading changes no records.</p>{error&&<p role="alert" className="max-w-md text-sm text-red-800">{error}</p>}</section>;
}
