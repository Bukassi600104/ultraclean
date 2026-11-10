import {getPendingItems,removePending,updatePending,archiveFundingReview,queueIdentityKey,confirmSubmission,getSubmissionStatus,type QueueIdentity} from "./offline-storage";
import {getFarmMedia,syncFarmMedia,removeFarmMedia} from './farm-offline-media';
const activeSyncs=new Set<string>();
export async function checkFarmSubmission(identity:QueueIdentity,requestId:string,kind:'report'|'request',{send=fetch,isCurrent}:{send?:typeof fetch;isCurrent:()=>boolean}):Promise<'sent'|'unknown'>{
 if(identity.business!=='farm')throw Error('Wait for your farm workspace to load.');
 const response=await send(`/api/farm/submission-status?kind=${kind}&request_id=${encodeURIComponent(requestId)}`,{cache:'no-store'}),body=await response.json();
 if(!isCurrent())throw Error('Your account or responsibility period changed. Open the original workspace to check this entry.');
 if(!response.ok)throw Error(body.error||'Confirmation is unavailable. Please retry.');
 if(body.status!=='confirmed'||typeof body.record_id!=='string'||!body.record_id.trim())return 'unknown';
 confirmSubmission(identity,requestId,kind==='report'?'/api/farm/daily-reports/submit':'/api/farm/operational-requests',body.record_id);return 'sent';
}
export async function syncManagerPending(identity:QueueIdentity,{send=fetch,isCurrent,signal}:{send?:typeof fetch;isCurrent:()=>boolean;signal?:AbortSignal}){
 const key=queueIdentityKey(identity);if(activeSyncs.has(key))return 0;activeSyncs.add(key);
 try{
 let synced=0;
 for(const item of getPendingItems(identity)){
  if(!isCurrent()||signal?.aborted)break;
  if(getSubmissionStatus(identity,item.requestId)==='sent'){
   try{for(const id of item.mediaIds||[])await removeFarmMedia(id,identity);if(!isCurrent()||signal?.aborted)break;removePending(item.id,identity);synced++;}catch{/* Retain confirmed work until local cleanup succeeds. */}
   continue;
  }
  if(item.fundingReview||item.conflict==="Saved for Bimbo's funding review; not yet posted"){
   try{
    const response=await send(`/api/operations/funding-status?business=${identity.business}&request_id=${encodeURIComponent(item.requestId)}`,{headers:{'X-Manager-Actor':identity.actorId,'X-Manager-Period':identity.periodId},cache:'no-store',signal}),result=await response.json();
    if(!isCurrent()||signal?.aborted)break;
    if(response.ok&&['posted','declined'].includes(result.status)){
     archiveFundingReview(item,identity,result.status);synced++;
     if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('farm-records-synced',{detail:{requestId:item.requestId,endpoint:item.endpoint,fundingStatus:result.status}}));
    }
   }catch{if(!isCurrent()||signal?.aborted)break;}
   continue;
  }
  if(item.conflict)continue;
  try{
   let payload:Record<string,unknown>={...item.data,request_id:item.requestId};
   const batch=["/api/farm/sales","/api/farm/expenses","/api/farm/feed-purchases"].includes(item.endpoint);
   if(item.mediaIds?.length){
    await syncFarmMedia(identity,{send,isCurrent,signal});if(!isCurrent()||signal?.aborted)break;
    const photos=await getFarmMedia(identity),owned=item.mediaIds.map(id=>photos.find(photo=>photo.id===id));
    if(owned.some(photo=>!photo)){updatePending({...item,conflict:'A supporting photo is missing on this device. Keep this record for review.'},identity);continue;}
    if(owned.some(photo=>photo?.status!=='uploaded'||!photo.evidenceId))continue;
    const evidence_ids=owned.map(photo=>photo!.evidenceId!);
    payload=payload.payload&&typeof payload.payload==='object'&&!Array.isArray(payload.payload)?{...payload,payload:{...payload.payload,evidence_ids}}:{...payload,evidence_ids};
   }
   if(!isCurrent()||signal?.aborted)break;
   const response=await send(item.endpoint,{method:"POST",headers:{"Content-Type":"application/json","X-Request-ID":item.requestId,"X-Manager-Actor":identity.actorId,"X-Manager-Period":identity.periodId},body:JSON.stringify(batch?[payload]:payload),signal});
   if(!isCurrent()||signal?.aborted)break;
   if(response.redirected||!response.headers.get('content-type')?.includes('application/json')){
    continue;
   }
   if(response.status===202){updatePending({...item,fundingReview:true,conflict:"Saved for Bimbo's funding review; not yet posted"},identity);}
   else if(response.ok){
    const result=await response.json().catch(()=>null);if(!isCurrent()||signal?.aborted)break;
    if(!result||typeof result!=='object')continue;
    const records=batch?result.data:[result.data??result];
    if(!Array.isArray(records)||records.length!==1||records.some(row=>!row||typeof row.id!=='string'||!row.id.trim()))continue;
    confirmSubmission(identity,item.requestId,item.endpoint,records[0].id);
    for(const id of item.mediaIds||[])await removeFarmMedia(id,identity);
    if(!isCurrent()||signal?.aborted)break;
    removePending(item.id,identity);synced++;
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('farm-records-synced',{detail:{requestId:item.requestId,endpoint:item.endpoint}}));
   }
   else if(response.status<500&&response.status!==401){const body=await response.json().catch(()=>({}));updatePending({...item,conflict:body.error||"This entry needs review"},identity);}
  }catch{if(!isCurrent()||signal?.aborted)break;}
 }
 return synced;
 }finally{activeSyncs.delete(key);}
}
