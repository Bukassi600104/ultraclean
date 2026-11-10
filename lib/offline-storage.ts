import type {Business} from "./manager-period-types";
const PREFIX="farm_pending_";
const CONFIRMED="farm_confirmed_";
export interface QueueIdentity {actorId:string;business:Business;periodId:string}
export interface PendingItem {id:string;endpoint:string;data:Record<string,unknown>;createdAt:string;identity:QueueIdentity;conflict?:string;requestId:string;mediaIds?:string[];fundingReview?:boolean}
export function queueIdentityKey(identity:QueueIdentity){return `${identity.business}:${identity.actorId}:${identity.periodId}`;}
function matches(a:QueueIdentity|undefined,b:QueueIdentity){return !!a&&queueIdentityKey(a)===queueIdentityKey(b);}
function changed(){window.dispatchEvent(new Event("farm-pending-changed"));}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function validItem(value:unknown,key:string):value is PendingItem{
 if(!object(value)||!object(value.identity))return false;
 return value.id===key&&typeof value.createdAt==='string'&&Number.isFinite(Date.parse(value.createdAt))&&typeof value.endpoint==='string'&&value.endpoint.startsWith('/api/')&&object(value.data)&&typeof value.requestId==='string'&&!!value.requestId
  &&typeof value.identity.actorId==='string'&&!!value.identity.actorId&&typeof value.identity.periodId==='string'&&!!value.identity.periodId&&['farm','property','content'].includes(String(value.identity.business))
  &&(value.mediaIds===undefined||Array.isArray(value.mediaIds)&&value.mediaIds.every(id=>typeof id==='string'));
}
export type SubmissionStatus='sent'|'queued'|'needs_attention'|'unknown';
type Confirmation={schemaVersion:1;identity:QueueIdentity;requestId:string;endpoint:string;confirmedAt:string;recordId?:string};
function acknowledgement(identity:QueueIdentity,requestId:string):Confirmation|null{
 const raw=localStorage.getItem(CONFIRMED+queueIdentityKey(identity)+':'+requestId);if(!raw)return null;
 try{const value=JSON.parse(raw);return value?.schemaVersion===1&&matches(value.identity,identity)&&value.requestId===requestId&&typeof value.endpoint==='string'&&typeof value.confirmedAt==='string'&&Number.isFinite(Date.parse(value.confirmedAt))?value:null;}catch{return null;}
}
export function confirmSubmission(identity:QueueIdentity,requestId:string,endpoint:string,recordId?:string){
 const value:Confirmation={schemaVersion:1,identity:{...identity},requestId,endpoint,confirmedAt:new Date().toISOString(),...(recordId?{recordId}:{})};
 localStorage.setItem(CONFIRMED+queueIdentityKey(identity)+':'+requestId,JSON.stringify(value));changed();
}
export function getSubmissionStatus(identity:QueueIdentity,requestId:string):SubmissionStatus{
 if(typeof window==='undefined')return 'unknown';
 try{
  if(acknowledgement(identity,requestId))return 'sent';
  const row=getPendingItems(identity).find(item=>item.requestId===requestId);
  if(row)return row.conflict?'needs_attention':'queued';
  for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith('farm_reviewed_'+PREFIX+queueIdentityKey(identity)+':'))continue;try{const value=JSON.parse(localStorage.getItem(key)||'null');if(matches(value?.identity,identity)&&value.requestId===requestId&&value.fundingStatus==='declined')return 'needs_attention';}catch{/* Retain unreadable history. */}}
  return getQuarantinedCount(identity)?'needs_attention':'unknown';
 }catch{return 'unknown';}
}
function items():PendingItem[]{
 if(typeof window==="undefined")return [];
 const rows:PendingItem[]=[];
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(PREFIX)){try{const item=JSON.parse(localStorage.getItem(key)!);if(validItem(item,key))rows.push(item);}catch{/* Retain unreadable entries for review. */}}}
 return rows;
}
export function savePending(endpoint:string,data:Record<string,unknown>,identity:QueueIdentity,options:{mediaIds?:string[]}={}){
 if(typeof window==="undefined")return;
 if(!identity?.actorId||!identity.periodId)throw Error("Wait for your manager period before saving offline");
 if(typeof data.request_id==='string'){
  if(acknowledgement(identity,data.request_id))throw Error('This entry is already confirmed. Check its saved record before starting another.');
  const previous=getPendingItems(identity).find(item=>item.requestId===data.request_id);
  if(previous){
   if(previous.endpoint!==endpoint||JSON.stringify(previous.data)!==JSON.stringify(data)||JSON.stringify(previous.mediaIds||[])!==JSON.stringify(options.mediaIds||[]))throw Error('This retry already belongs to a saved entry. Keep it for review.');
   return previous.id;
  }
 }
 const id=`${PREFIX}${queueIdentityKey(identity)}:${crypto.randomUUID()}`;
 const item:PendingItem={id,endpoint,data,identity:{...identity},createdAt:new Date().toISOString(),requestId:typeof data.request_id==="string"?data.request_id:crypto.randomUUID(),...(options.mediaIds?.length?{mediaIds:[...options.mediaIds]}:{})};
 localStorage.setItem(id,JSON.stringify(item));changed();return id;
}
export function getPendingItems(identity:QueueIdentity):PendingItem[]{return items().filter(item=>matches(item.identity,identity)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));}
export function getQuarantinedCount(identity?:QueueIdentity){
 if(typeof window==='undefined')return 0;
 let count=0;
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith(identity?PREFIX+queueIdentityKey(identity)+':':PREFIX))continue;try{if(!validItem(JSON.parse(localStorage.getItem(key)||'null'),key))count++;}catch{count++;}}
 return count;
}
export function archiveFundingReview(item:PendingItem,identity:QueueIdentity,status:'posted'|'declined'){
 if(!matches(item.identity,identity))return;
 localStorage.setItem('farm_reviewed_'+item.id,JSON.stringify({...item,fundingStatus:status,checkedAt:new Date().toISOString()}));
 if(status==='posted')confirmSubmission(identity,item.requestId,item.endpoint);
 removePending(item.id,identity);
}
export function removePending(id:string,identity:QueueIdentity){if(getPendingItems(identity).some(item=>item.id===id)){localStorage.removeItem(id);changed();}}
export function updatePending(item:PendingItem,identity:QueueIdentity){if(matches(item.identity,identity)&&getPendingItems(identity).some(row=>row.id===item.id)){localStorage.setItem(item.id,JSON.stringify(item));changed();}}
export function getPendingCount(identity:QueueIdentity){return getPendingItems(identity).length;}
