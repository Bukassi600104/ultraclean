import {getPendingItems,removePending,updatePending,type QueueIdentity} from "./offline-storage";
export async function syncManagerPending(identity:QueueIdentity,{send=fetch,isCurrent,signal}:{send?:typeof fetch;isCurrent:()=>boolean;signal?:AbortSignal}){
 let synced=0;
 for(const item of getPendingItems(identity)){
  if(!isCurrent()||signal?.aborted)break;if(item.conflict)continue;
  try{
   const payload={...item.data,request_id:item.requestId},batch=["/api/farm/sales","/api/farm/expenses","/api/farm/feed-purchases"].includes(item.endpoint);
   const response=await send(item.endpoint,{method:"POST",headers:{"Content-Type":"application/json","X-Request-ID":item.requestId,"X-Manager-Actor":identity.actorId,"X-Manager-Period":identity.periodId},body:JSON.stringify(batch?[payload]:payload),signal});
   if(!isCurrent()||signal?.aborted)break;
   if(response.status===202){updatePending({...item,conflict:"Saved for Bimbo's funding review; not yet posted"},identity);}
   else if(response.ok){removePending(item.id,identity);synced++;}
   else if(response.status<500){const body=await response.json().catch(()=>({}));updatePending({...item,conflict:body.error||"This entry needs review"},identity);}
   else break;
  }catch{break;}
 }
 return synced;
}
