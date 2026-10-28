"use client";
import {useEffect,useRef,useState} from "react";
import {useManagerFetch,useManagerStorageKey,useQueueIdentity} from "@/contexts/ManagerPeriodContext";
import {isPendingFunding} from "@/lib/operations-cash-validation";
type Saved<T>={id:string;actorId:string;periodId:string;url:string;body:unknown;draft:T};
const paths=["/api/farm/sales","/api/farm/expenses","/api/farm/feed-purchases"];
export function useFarmFinancialSubmission<T=Record<string,string>>(namespace:string){
 const identity=useQueueIdentity(),sendRequest=useManagerFetch(),key=useManagerStorageKey(identity?.business==="farm"?`farm-financial:${identity.actorId}:${namespace}`:null);
 const actorId=identity?.actorId,periodId=identity?.periodId;
 const [pending,setPending]=useState<Saved<T>|null>(null),[error,setError]=useState("");
 const savedRef=useRef<Saved<T>|null>(null),busy=useRef(false),alive=useRef(true),currentKey=useRef(key),broken=useRef(false);currentKey.current=key;
 useEffect(()=>{alive.current=true;savedRef.current=null;setPending(null);setError("");broken.current=false;
  if(key&&actorId&&periodId){try{const saved=JSON.parse(localStorage.getItem(key)||"null");if(saved){if(saved.actorId!==actorId||saved.periodId!==periodId||!paths.includes(saved.url)||typeof saved.id!=="string"||!saved.draft||!("body" in saved))throw Error();savedRef.current=saved;setPending(saved);}}catch{broken.current=true;setError("Your saved entry needs review. It remains on this device and has not been replaced.");}}
  return()=>{alive.current=false;};
 },[key,actorId,periodId]);
 async function send(url:string,body:unknown,draft:T,requestId?:string):Promise<Response>{
  if(!key||!identity||identity.business!=="farm")throw Error("Wait for your verified farm workspace to load before saving.");
  if(broken.current)throw Error("The saved entry needs review before another entry can be sent from this page.");
  if(busy.current)throw Error("This entry is already being sent.");
  if(!paths.includes(url))throw Error("Unsupported farm financial entry");
  const saved=savedRef.current||{id:requestId||crypto.randomUUID(),actorId:identity.actorId,periodId:identity.periodId,url,body,draft},ownedKey=key;
  busy.current=true;setError("");
  try{
   try{localStorage.setItem(ownedKey,JSON.stringify(saved));}catch{throw Error("Device storage is unavailable. Your entry was not sent; its values are retained on this page.");}
   savedRef.current=saved;setPending(saved);
   const response=await sendRequest(saved.url,{method:"POST",headers:{"Content-Type":"application/json","X-Request-ID":saved.id},body:JSON.stringify(saved.body)}),result=await response.clone().json();
   if(!alive.current||currentKey.current!==ownedKey)throw new DOMException("Workspace changed","AbortError");
   if(response.ok){
    if(response.status===202){if(!isPendingFunding(result))throw Error("The funding-review response was incomplete. Keep and retry this saved entry.");localStorage.setItem(`${ownedKey}:funding-review:${saved.id}`,JSON.stringify({...saved,outcome:result}));}
    localStorage.removeItem(ownedKey);savedRef.current=null;setPending(null);window.dispatchEvent(new Event("operations-cash-updated"));
   }else {if(response.status===400){localStorage.setItem(`${ownedKey}:rejected:${saved.id}`,JSON.stringify({...saved,outcome:result}));localStorage.removeItem(ownedKey);savedRef.current=null;setPending(null);}setError(result.error||"The saved entry could not be confirmed. Keep its original date and retry it.");}
   return response;
  }catch(e){if(alive.current&&currentKey.current===ownedKey&&(e as Error).name!=="AbortError")setError((e as Error).message);throw e;}finally{busy.current=false;}
 }
 return {pending,error,send};
}
