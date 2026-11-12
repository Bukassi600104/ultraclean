"use client";
import {farmTimestamp} from "@/lib/farm-products";
import {formatExactCurrency} from '@/lib/money';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useOfflineSync} from '@/hooks/useOfflineSync';
import {useFarmRecordRefresh} from '@/hooks/useFarmRecordRefresh';
import {FarmPhotoPicker} from './FarmPhotoPicker';
import {blankRequestDetails,FarmRequestDetailsForm,requestFieldsForSubmit} from './FarmRequestDetailsForm';
import {requestDetails as requestDetailsSchema} from '@/lib/farm-purchases';
import {FarmRecordEvidence} from './FarmRecordEvidence';
import {AreaLogFields,AreaMeasurements} from './FarmAreaLogs';
import {areaSectionsDraftSchema,areaSectionsSchema,areaTitle,isAreaSections,reportArea,reportAreas,type ReportArea} from '@/lib/farm-report-areas';
import {getSubmissionStatus} from '@/lib/offline-storage';
import {useQueueIdentity} from '@/contexts/ManagerPeriodContext';
import {FarmRecordDiscussion,FarmDiscussionDialog} from "@/components/manager/FarmRecordThread";
import {useManagerFetch,useManagerStorageKey} from "@/contexts/ManagerPeriodContext";


import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {farmManagerPrefix} from "@/lib/dashboard-navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { DailyReport, OperationalRequest, ReportSections, StructuredReportSections } from "@/lib/farm-reports";

const categories = ["purchase","feed","veterinary","repair","maintenance","equipment","staffing","water","pump","emergency","other"] as const;
const groups = {
  farm1: {title:"Farm 1",fields:{pond1:"Pond 1",pond2:"Pond 2",pond3:"Pond 3",pond4:"Pond 4",water_issue:"Water issue"}},
  farm2: {title:"Farm 2",fields:{vat1:"Tarpaulin Vat 1",vat2:"Tarpaulin Vat 2",vat3:"Tarpaulin Vat 3",mortality:"Mortality",water_issue:"Water issue",pump_status:"Pump status"}},
  livestock: {title:"Livestock",fields:{goats:"Goats",ram:"Ram",cattle:"Cattle",piggery:"Piggery",poultry:"Poultry",mortality:"Mortality",sick_animals:"Sick animals",feed:"Feed",water:"Water"}},
  crops: {title:"Crops",fields:{report:"Crop report"}},
  people: {title:"People",fields:{workers_present:"Workers present",supervisor:"Supervisor",tasks_completed:"Tasks completed"}},
  problems: {title:"Problems",fields:{issues:"Issues",action_taken:"Action taken",request_category:"Request category"}},
};
const blankWater=()=>({water_quality:"",mortality:"",feed:"",general_remarks:""});
export const blankSections=():StructuredReportSections=>({template_version:2,farm1:{pond1:blankWater(),pond2:blankWater(),pond3:blankWater(),pond4:blankWater(),water_issue:""},farm2:{vat1:blankWater(),vat2:blankWater(),vat3:blankWater(),water_issue:"",pump_status:""},livestock:{goats:"",ram:"",cattle:"",piggery:"",poultry:"",mortality:"",sick_animals:[],feed:"",water:""},crops:{report:""},people:{supervisor:"",tasks_completed:""},problems:{issues:"",action_taken:"",request_category:"other"}});
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const input="w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-700";
const button="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50";
const panel="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4";
type ReportForm={report_date:string;sections:ReportSections;decision_required:boolean};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
const uuid=(value:unknown):value is string=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const draftDate=(value:unknown)=>typeof value==="string"&&(value===""||/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+"T12:00:00Z"))&&new Date(value+"T12:00:00Z").toISOString().slice(0,10)===value);
const nullableText=(value:unknown)=>value==null||typeof value==="string";
const mediaList=(value:unknown)=>value===undefined||Array.isArray(value)&&value.every(id=>typeof id==="string"&&id.length>0);
function validReportForm(value:unknown):value is ReportForm{
 if(!object(value)||!draftDate(value.report_date)||typeof value.decision_required!=="boolean"||!object(value.sections))return false;
 const sections=value.sections,structured=sections.template_version===2;
 if(isAreaSections(sections))return !value.decision_required&&areaSectionsDraftSchema.safeParse(sections).success;
 if(sections.template_version!==undefined&&!structured)return false;
 for(const [name,group] of Object.entries(groups)){
  const fields=sections[name];if(!object(fields))return false;
  for(const field of Object.keys(group.fields)){
   const item=fields[field];
   if(field==="workers_present"){if(item!==undefined&&(!Number.isInteger(item)||Number(item)<0))return false;}
   else if(structured&&field==="sick_animals"){if(!Array.isArray(item)||!item.every(row=>object(row)&&["animal_group","symptoms","action_taken","remarks"].every(key=>typeof row[key]==="string")&&(row.quantity===undefined||Number.isInteger(row.quantity)&&Number(row.quantity)>0)))return false;}
   else if(structured&&/^(pond|vat)\d$/.test(field)){if(!object(item)||!["water_quality","mortality","feed","general_remarks"].every(key=>typeof item[key]==="string"))return false;}
   else if(!(structured&&name==="farm2"&&field==="mortality")&&typeof item!=="string")return false;
  }
 }
 return true;
}
function validSelectedReport(value:unknown){return value==null||object(value)&&uuid(value.id)&&["draft","submitted"].includes(String(value.status))&&Number.isInteger(value.revision)&&Number(value.revision)>=0&&["created_at","submitted_at","reviewed_by","reviewed_at","review_note"].every(key=>nullableText(value[key]))&&["manager","reviewer"].every(key=>value[key]==null||object(value[key])&&nullableText(value[key].name))&&validReportForm(value);}
function validDraftMetadata(value:Record<string,unknown>){return (value.schemaVersion===undefined||value.schemaVersion===1)&&mediaList(value.mediaIds)&&(value.requestId===undefined||uuid(value.requestId))&&(value.queuedRequest===undefined||value.queuedRequest===""||uuid(value.queuedRequest))&&(!value.queuedRequest||value.requestId===undefined||value.requestId===value.queuedRequest);}
export function validReportDraft(value:unknown){return object(value)&&validDraftMetadata(value)&&validReportForm(value.form)&&validSelectedReport(value.selected);}
export function validRequestDraft(value:unknown){return object(value)&&validDraftMetadata(value)&&draftDate(value.date)&&typeof value.category==="string"&&categories.includes(value.category as typeof categories[number])&&typeof value.description==="string";}
function validRetry(value:unknown,kind:string):value is {key:string;id:string}{
 if(!object(value)||!uuid(value.id)||typeof value.key!=="string")return false;
 try{const saved=JSON.parse(value.key);if(!object(saved)||!object(saved.payload)||(saved.id!==undefined&&!uuid(saved.id)))return false;const p=saved.payload;
  if(!saved.id)return kind==="daily-reports"?validReportForm(p):draftDate(p.request_date)&&typeof p.category==="string"&&categories.includes(p.category as typeof categories[number])&&typeof p.description==="string";
  if(!Number.isInteger(p.revision)||Number(p.revision)<0||typeof p.reason!=="string")return false;
  return kind==="daily-reports"?(p.operation==="update"?validReportForm(p):p.operation==="submit"||p.operation==="review"&&typeof p.review_note==="string"):["respond","approve","decline","resolve","cancel"].includes(String(p.operation))&&["ceo_response","resolution"].every(key=>nullableText(p[key]));
 }catch{return false;}
}
const recoveryMessage="Saved information could not be read safely. It remains on this device. Do not enter it again; ask for help recovering it.";
const deliveryMessage=(status:string,noun:string)=>status==='sent'?`Sent. The server confirmed your ${noun}.`:status==='queued'?'Saved on this device. Waiting to send.':status==='needs_attention'?'Saved on this device. This entry needs attention.':'Confirmation unavailable. Check the saved submission status before entering it again.';


function useOperations(kind:"daily-reports"|"operational-requests",filters="") {
 const managerFetch=useManagerFetch();
 const refreshKey=useFarmRecordRefresh();
  const [rows,setRows]=useState<(DailyReport|OperationalRequest)[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[page,setPage]=useState(1),[total,setTotal]=useState(0);
  const latest=useRef(0),loadedQuery=useRef("");
  const load=useCallback(async()=>{
    const call=++latest.current;
    const target=new URL(window.location.href).searchParams.get(kind==="daily-reports"?"report_id":"request_id");
    const query=`/api/farm/${kind}?page=${page}${target?`&id=${encodeURIComponent(target)}`:filters}`;
    if(query!==loadedQuery.current)setLoading(true);
    setError("");
    try{
      const response=await managerFetch(query,{cache:"no-store",headers:kind==="daily-reports"?{"X-Farm-Report-Format":"3"}:undefined});
      const body=await response.json();
      if(!response.ok||!Array.isArray(body.data))throw Error(body.error||"Unable to load records");
      if(call===latest.current){loadedQuery.current=query;setRows(body.data);setTotal(body.total??0);}
    }catch(err){if(call===latest.current)setError(err instanceof Error?err.message:"Unable to load records");}
    finally{if(call===latest.current)setLoading(false);}
  },[kind,page,managerFetch,filters]);
  useEffect(()=>{void load();},[load,refreshKey]);
  return {rows,loading,error,setError,load,page,setPage,total};
}

function useWrite(kind:string,onError:(message:string)=>void) {
 const managerFetch=useManagerFetch();
  const {profile}=useAuth();
  const [busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false);
  const pending=useRef<{key:string;id:string}|null>(null),loadedKey=useRef<string|null>(null),invalid=useRef(false);
  const [storageFault,setStorageFault]=useState(false);
  const lock=useRef(false);
  const storageKey=useManagerStorageKey(profile?`primefield-operation-retry:${profile.id}:${kind}`:null);
  useEffect(()=>{loadedKey.current=null;invalid.current=false;setStorageFault(false);pending.current=null;if(!storageKey)return;try{const raw=localStorage.getItem(storageKey)??sessionStorage.getItem(storageKey),saved=raw===null?null:JSON.parse(raw);if(saved!==null&&!validRetry(saved,kind))throw Error();pending.current=saved;setUncertain(!!saved);loadedKey.current=storageKey;}catch{invalid.current=true;setStorageFault(true);setUncertain(true);onError(recoveryMessage);}},[storageKey,kind,onError]);
  async function write(payload:unknown,id?:string){
    if(lock.current||invalid.current||loadedKey.current!==storageKey)return null;
    if(!storageKey){onError("Sign in before submitting this entry.");return null;}
    const key=JSON.stringify({id,payload});
    if(pending.current&&pending.current.key!==key){setUncertain(true);onError("A previous submission is unconfirmed. Retry the saved submission before changing it.");return null;}
    const hadPending=!!pending.current;
    lock.current=true;setBusy(true);onError("");
    if(!pending.current)pending.current={key,id:crypto.randomUUID()};
    try{localStorage.setItem(storageKey,JSON.stringify(pending.current));}catch{onError("Device storage is unavailable. The entry was not sent. Keep this form and restore storage before retrying.");if(!hadPending)pending.current=null;lock.current=false;setBusy(false);return null;}
    function clear(confirmed=false){try{if(storageKey){localStorage.removeItem(storageKey);sessionStorage.removeItem(storageKey);}}catch{throw Error(confirmed?"The server confirmed this entry, but this device could not save the confirmation. Retry the saved submission to finish safely.":"This device could not record the response. Keep the saved submission and retry when storage is available.");}pending.current=null;setUncertain(false);}
    try{const response=await managerFetch(`/api/farm/${kind}${id?`/${id}`:""}`,{method:id?"PUT":"POST",headers:{"Content-Type":"application/json","X-Request-ID":pending.current.id,...(kind==="daily-reports"?{"X-Farm-Report-Format":"3"}:{})},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok){if(response.status>=400&&response.status<500&&![401,403].includes(response.status))clear();else setUncertain(true);throw Error(result.error||"Unable to save");}if(!object(result.data)||!uuid(result.data.id)||(id&&result.data.id!==id))throw Error("The server response could not confirm this entry. Retry the saved submission.");clear(true);return result.data;}catch(err){if(pending.current)setUncertain(true);onError(err instanceof Error?err.message:"Unable to confirm the submission. Retry the saved entry when connected.");return null;}finally{lock.current=false;setBusy(false);}
  }
  async function retry(){if(invalid.current||!pending.current)return null;const saved=JSON.parse(pending.current.key);return write(saved.payload,saved.id);}
  return {write,busy,uncertain,retry,storageFault};
}

const initialReport=(area?:ReportArea,date=today()):ReportForm=>({report_date:date,sections:area?{template_version:3,area:area.key,observations:{}}:blankSections(),decision_required:false});
export function FarmDailyReports({admin=false,historyOnly=false,area,activityDate}:{admin?:boolean;historyOnly?:boolean;area?:ReportArea;activityDate?:string}) {
  const managerBase=farmManagerPrefix(usePathname());
  const identity=useQueueIdentity(),offline=useOfflineSync();
  const [draftError,setDraftError]=useState(''),[draftFault,setDraftFault]=useState(false),[checking,setChecking]=useState(false);
  const [mediaIds,setMediaIds]=useState<string[]>([]),[photoBusy,setPhotoBusy]=useState(false),[queueBusy,setQueueBusy]=useState(false),[queuedRequest,setQueuedRequest]=useState(''),[requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const detailRef=useRef<HTMLElement>(null);
  const [discussion,setDiscussion]=useState<DailyReport|null>(null);
  const [discussionMessage,setDiscussionMessage]=useState<string|null>(null);
  function closeDiscussion(){
    setDiscussion(null);setDiscussionMessage(null);
    const url=new URL(window.location.href);
    if(!url.searchParams.has("message_id"))return;
    url.searchParams.delete("message_id");
    window.history.replaceState(window.history.state,"",url);
  }
  function questions(row:DailyReport){
    return <button type="button" className="min-h-11 rounded-lg border px-3 text-sm font-medium" onClick={()=>setDiscussion(row)}>Questions</button>;
  }
  function backToReports(){
    const url=new URL(window.location.href);
    if(url.searchParams.has("report_id")){
      url.searchParams.delete("report_id");
      url.searchParams.delete("message_id");
      window.history.replaceState(window.history.state,"",url);
      loadedDetail.current="";
      void records.load();
    }
    setSelected(null);
  }
  const [reviewSelection,setReviewSelection]=useState<DailyReport[]>([]),[reviewingPage,setReviewingPage]=useState(false);
  const [areaFilter,setAreaFilter]=useState(''),[unreviewed,setUnreviewed]=useState(false);
  const {profile}=useAuth(),records=useOperations("daily-reports",area?`&area_filter=${area.key}&date=${activityDate}`:`${admin?'&preview=1':''}${areaFilter?'&area_filter='+areaFilter:''}${unreviewed?'&unreviewed=1':''}`);
  const [form,setForm]=useState<ReportForm>({report_date:"",sections:blankSections(),decision_required:false}),[selected,setSelected]=useState<DailyReport|null>(null),[reason,setReason]=useState(""),[review,setReview]=useState(""),[message,setMessage]=useState(""),[restored,setRestored]=useState(false);
  const baseKey=useManagerStorageKey(profile?`primefield-report-draft:${profile.id}`:null),storageKey=baseKey&&area?`${baseKey}:area:${area.key}:${activityDate}`:baseKey,restoredKey=useRef<string|null>(null);
  const {write,busy:writeBusy,uncertain,retry,storageFault:retryFault}=useWrite("daily-reports",records.setError);
  const busy=writeBusy||queueBusy||photoBusy||offline.isSyncing||checking||reviewingPage;
  useEffect(()=>{restoredKey.current=null;setRestored(false);setDraftFault(false);if(!storageKey||admin||historyOnly)return;try{const saved=localStorage.getItem(storageKey);if(saved!==null){const draft=JSON.parse(saved);if(!validReportDraft(draft)||(area&&(!isAreaSections(draft.form.sections)||draft.form.sections.area!==area.key||draft.form.report_date!==activityDate)))throw Error();setForm(draft.form);setSelected(draft.selected??null);setMediaIds(draft.mediaIds??[]);setQueuedRequest(draft.queuedRequest??'');setRequestId(draft.requestId||(draft.queuedRequest||crypto.randomUUID()));setMessage("Local draft restored. Save it when connected.");}else {setForm(initialReport(area,activityDate));setSelected(null);setMediaIds([]);setQueuedRequest('');setRequestId(crypto.randomUUID());setMessage('');}restoredKey.current=storageKey;setRestored(true);}catch{setDraftFault(true);setDraftError(recoveryMessage);}},[storageKey,admin,historyOnly,area,activityDate]);
  useEffect(()=>{if(!storageKey||restoredKey.current!==storageKey||!restored||draftFault||admin||historyOnly||selected?.status==="submitted")return;try{localStorage.setItem(storageKey,JSON.stringify({...JSON.parse(localStorage.getItem(storageKey)||"{}"),form,selected,mediaIds,queuedRequest,requestId}));setDraftError("");}catch{setDraftError("This draft could not be saved on the device. Keep the page open and restore storage access before leaving.");}},[form,selected,mediaIds,queuedRequest,requestId,storageKey,restored,draftFault,admin,historyOnly]);
  const loadedDetail=useRef("");
  useEffect(()=>{
    const params=new URL(window.location.href).searchParams,target=params.get("report_id");
    if(!target||loadedDetail.current===target)return;
    const row=records.rows.find(item=>item.id===target) as DailyReport|undefined;
    if(!row)return;
    loadedDetail.current=row.id;setSelected(row);setForm({report_date:row.report_date,sections:row.sections,decision_required:row.decision_required});setReview(row.review_note??"");
    const messageId=params.get("message_id");
    if(uuid(messageId)){setDiscussionMessage(messageId);setDiscussion(row);}
  },[records.rows]);
  const existingArea=area?(records.rows as DailyReport[]).find(r=>r.status==='submitted'&&r.report_date===activityDate&&isAreaSections(r.sections)&&r.sections.area===area.key):undefined;
  const queueStatus=identity&&queuedRequest?getSubmissionStatus(identity,queuedRequest):undefined;
  const unresolved=!!queuedRequest&&queueStatus!=="sent";
  const readOnly=admin||historyOnly||draftFault||selected?.status==="submitted"||!!queuedRequest;
  function choose(row:DailyReport){if(unresolved||draftFault)return;requestAnimationFrame(()=>{detailRef.current?.focus({preventScroll:true});detailRef.current?.scrollIntoView({block:"start"});});setMediaIds([]);setQueuedRequest('');setRequestId(crypto.randomUUID());setSelected(row);setForm({report_date:row.report_date,sections:row.sections,decision_required:row.decision_required});setReason("");setReview(row.review_note??"");setMessage("");}
  function fresh(){if(unresolved||draftFault)return;setMediaIds([]);setQueuedRequest('');setRequestId(crypto.randomUUID());setSelected(null);setForm(initialReport(area,activityDate));setReason("");setMessage("");}
  async function queueReport(savedOnly=false){
    if(uncertain||busy||queuedRequest||draftFault||!restored)return;
    if(isAreaSections(form.sections)){const checked=areaSectionsSchema.safeParse(form.sections);if(!checked.success){records.setError(checked.error.issues[0].message);return;}}
    if(selected&&!savedOnly&&!reason.trim()){records.setError('Enter a reason for changing this draft.');return;}
    setQueueBusy(true);records.setError('');
    try{
      const fields=savedOnly&&selected?{report_date:selected.report_date,sections:selected.sections,decision_required:selected.decision_required}:form;
      const result=await offline.submitOrQueue('/api/farm/daily-reports/submit',{...fields,request_id:requestId,...(selected?{id:selected.id,revision:selected.revision,reason:savedOnly?'Submit saved draft':reason}:{})},{mediaIds});
      if(!result.success)throw Error(result.error);
      setQueuedRequest(requestId);setMessage(deliveryMessage(result.status||'unknown','report'));
      if(result.status==='sent')await records.load();
    }catch(error){records.setError(error instanceof Error?error.message:'Not saved. Keep this report open and retry.');}finally{setQueueBusy(false);}
  }
  useEffect(()=>{if(queuedRequest&&identity)setMessage(deliveryMessage(getSubmissionStatus(identity,queuedRequest),'report'));},[queuedRequest,offline.pendingCount,offline.conflicts,offline.quarantinedCount,identity]);
  async function checkStatus(){if(!queuedRequest||checking)return;setChecking(true);try{const status=await offline.checkSubmission(queuedRequest,'report');setMessage(deliveryMessage(status,'report'));if(status==='sent')await records.load();}catch(error){records.setError(error instanceof Error?error.message:'Confirmation unavailable. Keep this saved report for review.');}finally{setChecking(false);}}
  async function save(submit:boolean){
    if(draftFault||(!admin&&!historyOnly&&!restored))return;
    if(submit){await queueReport();return;}
    if(selected&&selected.status!=="draft")return;
    if(selected&&!reason.trim()){records.setError("Enter a reason for changing this draft.");return;}
    const row=await write(selected?{...form,operation:"update",revision:selected.revision,reason}:form,selected?.id) as DailyReport|null;
    if(!row)return;setSelected(row);setMessage("Draft saved.");
    await records.load();
  }
  async function submitSaved(){await queueReport(true);}
  async function markReviewed(){if(!selected)return;const row=await write({operation:"review",revision:selected.revision,review_note:review,reason},selected.id) as DailyReport|null;if(row){choose({...row,reviewer:profile?{id:profile.id,name:profile.name}:row.reviewer});setMessage("Review saved.");await records.load();}}
  async function quickReview(row:DailyReport){
    const saved=await write({operation:"review",revision:row.revision,review_note:"Reviewed",reason:"Daily log reviewed"},row.id) as DailyReport|null;
    if(saved)setSelected(current=>current?.id===saved.id?{...current,...saved,reviewer:profile?{id:profile.id,name:profile.name}:saved.reviewer}:current);
    return saved;
  }
  async function reviewShown(){
    if(!admin||busy||uncertain||!reviewSelection.length)return;
    setReviewingPage(true);let completed=0;
    try{
      for(const row of reviewSelection){if(!await quickReview(row))break;completed++;}
      setMessage(`${completed} of ${reviewSelection.length} reports marked as reviewed.${completed<reviewSelection.length?" Check the remaining reports before retrying.":""}`);
    }finally{setReviewSelection([]);setReviewingPage(false);await records.load();}
  }
  const availableReviews=(records.rows as DailyReport[]).filter(row=>row.status==='submitted'&&!row.reviewed_at);
  async function retryPending(){const row=await retry() as DailyReport|null;if(row){choose(row);setMessage("Saved submission confirmed.");if(row.status==="submitted"&&storageKey){try{localStorage.removeItem(storageKey);}catch{/* Confirmed online. */}}await records.load();}}
  return <div className={"mx-auto space-y-5 text-slate-800 "+(area?"max-w-2xl":"max-w-6xl")}>
    {draftError&&<p role="alert" className="rounded-lg bg-amber-50 p-3 text-amber-900">{draftError}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">{!area&&!admin&&<p className="text-sm text-slate-600">Farm conditions, people and problems.</p>}{!admin&&<Link className="text-sm font-semibold text-emerald-700 underline" href={managerBase+(historyOnly?"/daily-report":"/daily-report/history")}>{historyOnly?"Write a report":"View report history"}</Link>}{area&&<Link className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline" href={managerBase+"/daily-report"}>Choose another area</Link>}</div>
    {uncertain&&<div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">The previous submission is unconfirmed. Its saved values are locked to prevent duplicates. <button className="min-h-11 px-3 font-semibold underline" disabled={busy||retryFault} onClick={()=>void retryPending()}>Retry saved submission</button></div>}{records.error&&<div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{records.error} <button className="underline" onClick={()=>void records.load()}>Reload records</button></div>}{message&&<p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{message}</p>}
    {queuedRequest&&queueStatus!=="sent"&&<button className="min-h-11 font-semibold text-emerald-800 underline" disabled={busy} onClick={()=>void checkStatus()}>Check saved submission status</button>}
    {existingArea&&!selected&&!queuedRequest&&<p className="rounded-lg bg-emerald-50 p-3 text-sm">A log has already been sent for this area and date. <Link className="font-semibold underline" href={`${managerBase}/daily-report/history?report_id=${existingArea.id}`}>View sent log</Link></p>}
    {(!draftFault&&(!existingArea||selected||queuedRequest)&&(!historyOnly&&!admin||selected&&!records.error))&&<section ref={detailRef} tabIndex={-1} className={panel}>
      <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold text-emerald-950">{selected?`${selected.report_date} · ${selected.status}`:area?areaTitle(area):"Daily farm update"}</h2>{admin&&selected&&<button type="button" className="min-h-11 text-sm font-semibold text-emerald-800 underline" onClick={backToReports}>Back to reports</button>}{!area&&!admin&&!historyOnly&&<button className="text-emerald-700 underline disabled:opacity-50" disabled={busy||uncertain||unresolved||draftFault||!restored} onClick={fresh}>New report</button>}</div>
      {selected&&<><p className="text-sm text-slate-600">{selected.manager?.name||"Manager name not recorded"}{selected.reviewed_at&&<span className="ml-2 rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-900">Reviewed</span>}</p><details className="text-sm"><summary className="min-h-11 cursor-pointer font-semibold text-slate-600">Report details</summary><dl className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2"><div><dt className="text-slate-500">Created at</dt><dd>{farmTimestamp(selected.created_at)}</dd></div><div><dt className="text-slate-500">Submitted at</dt><dd>{farmTimestamp(selected.submitted_at)}</dd></div>{selected.reviewed_at&&<div><dt className="text-slate-500">Reviewed at</dt><dd>{farmTimestamp(selected.reviewed_at)}</dd></div>}{selected.reviewed_by&&<div><dt className="text-slate-500">Reviewed by</dt><dd className="break-words">{selected.reviewer?.name||"Name not recorded"}</dd></div>}{selected.review_note&&<div className="sm:col-span-2"><dt className="text-slate-500">Review note</dt><dd className="whitespace-pre-wrap break-words">{selected.review_note}</dd></div>}</dl></details></>}
      {!readOnly&&area&&<p className="text-sm font-medium text-slate-600">{new Date((form.report_date||activityDate)+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"Africa/Lagos"})}</p>}
      {!readOnly&&!area&&<label className="block text-sm font-medium">Report date<input type="date" required className={`${input} mt-1 max-w-xs`} disabled={busy||uncertain||!!selected||!!area} value={form.report_date} onChange={event=>setForm({...form,report_date:event.target.value})}/></label>}

      <ReportFields sections={form.sections} disabled={!!readOnly||busy||uncertain} readOnly={!!readOnly} onChange={sections=>setForm({...form,sections})}/>
      {!isAreaSections(form.sections)&&<><details><summary className="min-h-11 cursor-pointer text-sm font-semibold">View feed records already entered today</summary><ReportFeedActivity date={form.report_date}/></details>
      {readOnly?<p className="text-sm text-slate-600">Feed stock is recorded separately in <Link className="font-semibold text-emerald-800 underline" href={admin?"/dashboard/farm/daily-feed":managerBase+"/daily-feed"}>Daily Feed</Link> and <Link className="font-semibold text-emerald-800 underline" href={admin?"/dashboard/farm/feed-stock":managerBase+"/feed-stock"}>Feed Inventory</Link>.</p>:<p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Feed notes describe conditions only. <Link className="font-semibold underline" href={managerBase+"/daily-feed"}>Record new bags opened in Daily Feed</Link> to deduct stock once. <Link className="font-semibold underline" href={managerBase+"/feed-stock"}>View feed inventory and linked movement history</Link>.</p>}
      {readOnly?<p className="text-sm">{form.decision_required?<>A decision was requested. <Link className="font-semibold text-emerald-800 underline" href={admin?"/dashboard/farm/operational-requests":managerBase+"/operational-requests"}>View requests</Link></>:"No decision was requested."}</p>:<label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" disabled={busy||uncertain} checked={form.decision_required} onChange={event=>setForm({...form,decision_required:event.target.checked})}/>CEO decision required (creates a linked request on submission)</label>}</>}
      {!readOnly&&isAreaSections(form.sections)&&((form.sections.observations.deaths??0)>0||(form.sections.observations.feed_kg??0)>0)&&<div className="flex flex-wrap items-center gap-3 text-sm"><span>Related stock records</span>{(form.sections.observations.deaths??0)>0&&<Link href={managerBase+"/mortality"} className="inline-flex min-h-11 items-center font-semibold text-emerald-800 underline">Mortality</Link>}{(form.sections.observations.feed_kg??0)>0&&<Link href={managerBase+"/daily-feed"} className="inline-flex min-h-11 items-center font-semibold text-emerald-800 underline">Daily Feed</Link>}</div>}
      {!readOnly&&<FarmPhotoPicker date={form.report_date} resource="farm_daily_reports" value={mediaIds} onChange={setMediaIds} onBusyChange={setPhotoBusy}/>}
      {!readOnly&&<><p className="text-xs text-slate-500">{area?"Saved on this device as you type. This observation does not move stock.":"Drafts save on this device. Use Save draft to store online. Submitted reports are read only."}</p>{selected&&<label className="block text-sm font-medium">Reason for draft changes<input maxLength={2000} className={`${input} mt-1`} disabled={busy||uncertain} value={reason} onChange={event=>setReason(event.target.value)}/></label>}<div className="flex flex-wrap gap-3">{!area&&<button className={button} disabled={busy||uncertain} onClick={()=>void save(false)}>Save draft</button>}<button className={button} disabled={busy||uncertain||!restored||!!area&&records.loading} onClick={()=>void save(true)}>{area?"Send location log":"Save and submit"}</button>{selected&&<button className={button} disabled={busy||uncertain} onClick={()=>void submitSaved()}>Submit saved draft</button>}</div></>}
      {selected?.status==="submitted"&&<><FarmRecordEvidence resource="farm_daily_reports" recordId={selected.id}/>{questions(selected)}</>}
      {admin&&selected?.status==="submitted"&&<details open={!selected.reviewed_at} className="space-y-3 border-t pt-4"><summary className="min-h-11 cursor-pointer font-semibold">{selected.reviewed_at?"Update review":"Review report"}</summary><label className="block text-sm font-medium">Review note<textarea aria-label="Review note" maxLength={2000} className={`${input} mt-1`} disabled={busy||uncertain} value={review} onChange={event=>setReview(event.target.value)}/></label><label className="block text-sm font-medium">Reason<input maxLength={2000} className={`${input} mt-1`} disabled={busy||uncertain} value={reason} onChange={event=>setReason(event.target.value)}/></label><button disabled={busy||uncertain||!review.trim()||!reason.trim()} className={button} onClick={()=>void markReviewed()}>Record review</button><Link href="/dashboard/farm/operational-requests" className="ml-3 text-emerald-700 underline">Review operational requests</Link></details>}
    </section>}
    {!area&&!records.error&&(!admin||!selected)&&<section className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{admin?"Report inbox":"Your reports"}</h2>{admin&&<div className="flex flex-wrap items-center gap-2">{availableReviews.length>1&&<button disabled={busy||uncertain||records.loading} className={button} onClick={()=>setReviewSelection(availableReviews)}>Mark shown as reviewed</button>}<button className="min-h-11 rounded-lg border px-3 text-sm font-medium" aria-pressed={unreviewed} onClick={()=>{setUnreviewed(!unreviewed);records.setPage(1);}}>Awaiting review</button><label className="text-sm">Farm area <select className="min-h-11 max-w-full rounded-lg border p-2" value={areaFilter} onChange={e=>{setAreaFilter(e.target.value);records.setPage(1);}}><option value="">All areas</option><option value="whole">Whole farm</option>{reportAreas.map(a=><option key={a.key} value={a.key}>{areaTitle(a)}</option>)}</select></label></div>}</div>{records.loading?<p role="status">Loading reports…</p>:!records.rows.length?<p className="text-sm text-slate-500">No daily reports recorded.</p>:<div className="divide-y divide-slate-200">{(records.rows as DailyReport[]).map(row=>{
        const location=isAreaSections(row.sections)?reportArea(row.sections.area):null;
        return <article key={row.id} className="min-w-0 space-y-2 bg-white py-4">
          <button type="button" disabled={busy||uncertain||unresolved||draftFault} className="flex min-h-11 w-full flex-wrap items-start justify-between gap-2 text-left" onClick={()=>choose(row)}>
            <span><strong className="block">{location?areaTitle(location):"Whole farm report"}</strong><span className="text-sm text-slate-600">{row.report_date} · {admin?(row.manager?.name||"Name not recorded")+" · ":""}{row.status}</span></span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">{row.reviewed_at?"Reviewed":row.decision_required?"Decision needed":row.status==="submitted"?"View log":"Open draft"}</span>
          </button>
          {isAreaSections(row.sections)&&<AreaMeasurements sections={row.sections}/>}
          {admin&&row.status==="submitted"&&<>{row.has_photos!==false&&<FarmRecordEvidence thumbnail resource="farm_daily_reports" recordId={row.id}/>}<div className="flex flex-wrap gap-2">{questions(row)}{!row.reviewed_at&&<button className={button} disabled={busy||uncertain} onClick={async()=>{if(await quickReview(row)){setMessage("Review saved.");await records.load();}}}>Mark reviewed</button>}</div></>}
        </article>;
      })}</div>}{(records.total>50||records.page>1)&&<Pagination {...records}/>}</section>}
    <FarmDiscussionDialog resource="farm_daily_reports" recordId={discussion?.id??null} description={discussion?`${discussion.manager?.name||"Farm supervisor"} · ${discussion.report_date}`:undefined} messageId={discussionMessage} onClose={closeDiscussion}/>
    <Dialog open={reviewSelection.length>0} onOpenChange={open=>{if(!open&&!reviewingPage)setReviewSelection([]);}}><DialogContent><DialogTitle>Mark {reviewSelection.length} reports as reviewed?</DialogTitle><DialogDescription>This records your review of the reports shown on this page.</DialogDescription><div className="flex flex-wrap gap-2"><button className="min-h-11 rounded-lg border px-4" disabled={reviewingPage} onClick={()=>setReviewSelection([])}>Cancel</button><button className={button} disabled={reviewingPage||uncertain} onClick={()=>void reviewShown()}>{reviewingPage?"Saving reviews…":"Confirm reviews"}</button></div></DialogContent></Dialog>
  </div>;
}

function ReportFeedActivity({date}:{date:string}){
 const managerFetch=useManagerFetch();
 const [rows,setRows]=useState<{id:string;bags_delta:number|null;bags?:number;kind?:string;daily_feed_id:string|null;purchase_id:string|null;created_at?:string;recorded_at?:string;activity_date?:string;actor_name?:string|null}[]>([]),[error,setError]=useState(""),[total,setTotal]=useState(0),[loading,setLoading]=useState(false);
 useEffect(()=>{let active=true;if(!date)return;setRows([]);setTotal(0);setError("");setLoading(true);void (async()=>{try{const response=await managerFetch(`/api/farm/feed-stock?history=1&date=${encodeURIComponent(date)}`,{cache:"no-store"});const body=await response.json();if(!response.ok)throw Error(body.error||"Unable to load bag movements");if(active){setRows(body.data??[]);setTotal(body.total??0);}}catch(err){if(active)setError(err instanceof Error?err.message:"Unable to load bag movements");}finally{if(active)setLoading(false);}})();return ()=>{active=false;};},[date,managerFetch]);
 return <section className="space-y-2 rounded-lg border bg-slate-50 p-3"><h3 className="text-sm font-semibold">Linked feed stock activity - {date}</h3>{error?<p role="alert" className="text-sm text-red-800">{error}</p>:loading?<p role="status" className="text-sm">Loading feed stock activity...</p>:!rows.length?<p className="text-sm text-slate-600">No recorded bag movements for this date. Feed notes do not change stock.</p>:<><ul className="space-y-2">{rows.map(row=><li key={row.id} className="break-all text-xs">{({starting:"Starting count",received:"Bags received",opened:"Bags opened",problem:"Physical count for review",adjust:"Stock correction"} as Record<string,string>)[row.kind||""]||"Feed stock activity"}: {row.bags_delta!=null?`${row.bags_delta>0?"+":""}${row.bags_delta} bags`:row.bags!=null?`${row.bags} bags counted`:"Quantity not recorded"} · {row.activity_date||date} · {row.actor_name||"Name not recorded"}{(row.recorded_at||row.created_at)&&<> · Recorded {new Date((row.recorded_at||row.created_at)!).toLocaleString()}</>}{row.daily_feed_id&&<> · Linked to daily feeding</>}{row.purchase_id&&<> · Linked to a feed purchase</>}</li>)}</ul>{total>rows.length&&<p className="text-xs">Showing {rows.length} of {total} movements. View full feed inventory history.</p>}</>}</section>;
}

export function ReportSummary({sections}:{sections:ReportSections}) {
 if(isAreaSections(sections))return <AreaMeasurements sections={sections}/>;
 const label=(key:string)=>({water_quality:"Water quality",general_remarks:"Notes",animal_group:"Animal group",quantity:"Number affected",symptoms:"Symptoms",action_taken:"Action taken",remarks:"Notes",request_category:"Request category"} as Record<string,string>)[key]||key.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
 const entries=(value:unknown,path:string[]=[]):{label:string;value:string}[]=>{
  if(value==null||value==='')return [];
  if(Array.isArray(value))return value.flatMap((row,index)=>entries(row,[...path,`Animal ${index+1}`]));
  if(typeof value==='object')return Object.entries(value).flatMap(([key,item])=>entries(item,[...path,label(key)]));
  return [{label:path.join(' · '),value:String(value)}];
 };
 const sectionsRead=Object.entries(groups).map(([key,group])=>({key,title:group.title,rows:Object.entries(sections[key as keyof typeof sections] as Record<string,unknown>).filter(([field])=>field!=="request_category"||sections.problems.issues).flatMap(([field,value])=>entries(value,[(group.fields as Record<string,string>)[field]||label(field)]))}));
 return <div className="space-y-3" aria-label="Recorded farm update"><div className="grid gap-3 lg:grid-cols-2">{sectionsRead.filter(section=>section.rows.length).map(section=><section key={section.key} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"><h3 className="mb-3 font-semibold text-emerald-950">{section.title}</h3><dl className="space-y-3">{section.rows.map((row,index)=><div key={index}><dt className="text-xs font-medium text-slate-500">{row.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{row.value}</dd></div>)}</dl></section>)}</div>{sectionsRead.some(section=>!section.rows.length)&&<p className="text-xs text-slate-500">No observations recorded for {sectionsRead.filter(section=>!section.rows.length).map(section=>section.title.toLowerCase()).join(', ')}.</p>}</div>;
}

export function ReportFields({sections,disabled,readOnly=false,onChange}:{sections:ReportSections;disabled:boolean;readOnly?:boolean;onChange:(value:ReportSections)=>void}) {
  const [step,setStep]=useState("farm1");
  const structured="template_version" in sections && sections.template_version===2;
  if(readOnly)return <ReportSummary sections={sections}/>;
  if(isAreaSections(sections))return <AreaLogFields sections={sections} disabled={disabled} onChange={onChange}/>;
  function textField(label:string,value:string,update:(value:string)=>void){return <label key={label} className="block text-sm font-medium">{label}<textarea aria-label={label} rows={2} maxLength={2000} className={`${input} mt-1 resize-y`} value={value} onChange={event=>update(event.target.value)}/></label>;}
  if(!structured) return <><p className="text-sm text-slate-500">Legacy report: original notes are preserved in their saved format.</p><div className="grid gap-4 lg:grid-cols-2">{Object.entries(groups).map(([key,group])=><fieldset key={key} disabled={disabled} className="min-w-0 rounded-lg border border-slate-200 p-4"><legend className="px-1 font-semibold">{group.title}</legend><div className="grid gap-3 sm:grid-cols-2">{Object.entries(group.fields).map(([field,label])=>{const values=sections[key as keyof typeof sections] as Record<string,string|number>;const value=values[field]??"";const update=(next:string)=>onChange({...sections,[key]:{...values,[field]:field==="workers_present"?(next===""?undefined:Number(next)):next}} as ReportSections);return field==="workers_present"?<label key={field}>{label}<input aria-label={label} type="number" min={0} max={9999} className={input} value={value} onChange={event=>update(event.target.value)}/></label>:field==="request_category"?<label key={field}>{label}<select aria-label={label} className={input} value={value} onChange={event=>update(event.target.value)}>{categories.map(category=><option key={category}>{category}</option>)}</select></label>:textField(label,String(value),update);})}</div></fieldset>)}</div></>;
  const value=sections as StructuredReportSections;
  const sick=value.livestock.sick_animals;
  return <div className="space-y-4"><div className="flex flex-wrap gap-2" aria-label="Daily report sections">{[["farm1","Farm 1"],["farm2","Farm 2"],["livestock","Animals"],["other","People and issues"],["all","All sections"]].map(([key,label])=><button key={key} type="button" aria-pressed={step===key} className={"min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold "+(step===key?"border-emerald-800 bg-emerald-50 text-emerald-950":"bg-white")} onClick={()=>setStep(key)}>{label}</button>)}</div><p className="text-sm text-slate-600">Open each section you need. Entries stay saved while you move between sections.</p>
    {(["farm1","farm2"] as const).map(farm=><fieldset hidden={step!=="all"&&step!==farm} key={farm} disabled={disabled} className="min-w-0 rounded-xl border p-4"><legend className="px-1 font-semibold">{farm==="farm1"?"Farm 1":"Farm 2"}</legend><div className="grid gap-4 lg:grid-cols-2">{Object.entries(value[farm]).map(([waterKey,water],index)=>{if(typeof water==="string")return null;const name=farm==="farm1"?`Pond ${index+1}`:`Tarpaulin Vat ${index+1}`;return <div key={waterKey} className="min-w-0 rounded-lg bg-slate-50 p-3"><h3 className="mb-3 font-semibold">{name}</h3><div className="grid gap-3 sm:grid-cols-2">{Object.entries({water_quality:"Water Quality",mortality:"Mortality",feed:"Feed",general_remarks:"General Remarks"}).map(([field,label])=>textField(`${name} ${label}`,water[field as keyof typeof water],next=>onChange({...value,[farm]:{...value[farm],[waterKey]:{...water,[field]:next}}})))}</div></div>;})}</div><div className="mt-3 grid gap-3 sm:grid-cols-2">{textField(`${farm==="farm1"?"Farm 1":"Farm 2"} Water issue`,value[farm].water_issue,next=>onChange({...value,[farm]:{...value[farm],water_issue:next}}))}{farm==="farm2"&&textField("Farm 2 Pump status",value.farm2.pump_status,next=>onChange({...value,farm2:{...value.farm2,pump_status:next}}))}</div></fieldset>)}
    <fieldset hidden={step!=="all"&&step!=="livestock"} disabled={disabled} className="rounded-xl border p-4"><legend className="px-1 font-semibold">Animal groups</legend><p className="text-xs text-gray-600 mb-3">Mention the growth stage where useful. Stock categories are maintained in Stock and Inventory; these report notes do not change animal counts.</p><div className="grid gap-3 sm:grid-cols-2">{Object.entries({goats:"Goats",ram:"Ram",cattle:"Cattle",piggery:"Piggery",poultry:"Poultry",mortality:"Livestock mortality",feed:"Livestock feed",water:"Livestock water"}).map(([field,label])=>textField(label,value.livestock[field as keyof typeof value.livestock] as string,next=>onChange({...value,livestock:{...value.livestock,[field]:next}})))}</div></fieldset>
    <fieldset hidden={step!=="all"&&step!=="livestock"} disabled={disabled} className="space-y-3 rounded-xl border p-4"><legend className="px-1 font-semibold">Sick animals by group</legend>{!sick.length&&<p className="text-sm text-slate-500">No affected animals added.</p>}{sick.map((animal,index)=><div key={index} className="space-y-3 rounded-lg bg-slate-50 p-3"><h3 className="font-semibold">Affected animal {index+1}</h3><div className="grid gap-3 sm:grid-cols-2">{textField(`Animal/group ${index+1}`,animal.animal_group,next=>onChange({...value,livestock:{...value.livestock,sick_animals:sick.map((row,i)=>i===index?{...row,animal_group:next}:row)}}))}<label className="text-sm font-medium">Quantity affected {index+1}<input aria-label={`Quantity affected ${index+1}`} type="number" min={1} max={9999} step={1} inputMode="numeric" className={`${input} mt-1`} value={animal.quantity??""} onChange={event=>onChange({...value,livestock:{...value.livestock,sick_animals:sick.map((row,i)=>i===index?{...row,quantity:event.target.value===""?undefined:Number(event.target.value)}:row)}})}/></label>{(["symptoms","action_taken","remarks"] as const).map(field=>textField(`${{symptoms:"Observation/symptoms",action_taken:"Action taken",remarks:"Remarks"}[field]} ${index+1}`,animal[field],next=>onChange({...value,livestock:{...value.livestock,sick_animals:sick.map((row,i)=>i===index?{...row,[field]:next}:row)}})))}</div><button className="min-h-11 px-3 text-red-700 underline" onClick={()=>onChange({...value,livestock:{...value.livestock,sick_animals:sick.filter((_,i)=>i!==index)}})}>Remove affected animal {index+1}</button></div>)}<button className="min-h-11 rounded border px-3 font-medium" disabled={disabled||sick.length>=50} onClick={()=>onChange({...value,livestock:{...value.livestock,sick_animals:[...sick,{animal_group:"",symptoms:"",action_taken:"",remarks:""}]}})}>Add affected animal</button></fieldset>
    <div hidden={step!=="all"&&step!=="other"} className={step!=="all"&&step!=="other"?"hidden":"grid gap-4 lg:grid-cols-2"}>{(["crops","people","problems"] as const).map(key=><fieldset key={key} disabled={disabled} className="min-w-0 rounded-lg border p-4"><legend className="px-1 font-semibold">{groups[key].title}</legend><div className="grid gap-3">{Object.entries(groups[key].fields).map(([field,label])=>{const values=value[key] as Record<string,string|number>;const update=(next:string)=>onChange({...value,[key]:{...values,[field]:field==="workers_present"?(next===""?undefined:Number(next)):next}});return field==="request_category"?<label key={field}>{label}<select aria-label={label} className={input} value={values[field]??"other"} onChange={event=>update(event.target.value)}>{categories.map(category=><option key={category}>{category}</option>)}</select></label>:field==="workers_present"?<label key={field}>{label}<input aria-label={label} type="number" min={0} max={9999} className={input} value={values[field]??""} onChange={event=>update(event.target.value)}/></label>:textField(label,String(values[field]??""),update);})}</div></fieldset>)}</div>
  </div>;
}

function Pagination({page,setPage,total,loading}:{page:number;setPage:(page:number)=>void;total:number;loading:boolean}){return <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>{total} records - page {page}</span><div className="flex gap-2"><button className="min-h-11 rounded border px-3 disabled:opacity-40" disabled={loading||page===1} onClick={()=>setPage(page-1)}>Previous</button><button className="min-h-11 rounded border px-3 disabled:opacity-40" disabled={loading||page*50>=total} onClick={()=>setPage(page+1)}>Next</button></div></div>;}

export function FarmOperationalRequests({admin=false}:{admin?:boolean}) {
  const managerBase=farmManagerPrefix(usePathname());
  const {profile}=useAuth(),identity=useQueueIdentity(),offline=useOfflineSync();
  const records=useOperations("operational-requests"),{write,busy:writeBusy,uncertain,retry,storageFault:retryFault}=useWrite("operational-requests",records.setError);
  const {load:reloadRequests,setError:setRequestError}=records;
  const [date,setDate]=useState(""),[category,setCategory]=useState("other"),[description,setDescription]=useState(""),[selected,setSelected]=useState<OperationalRequest|null>(null),[reason,setReason]=useState(""),[message,setMessage]=useState("");
  const [decision,setDecision]=useState(''),[formOpen,setFormOpen]=useState(false),[mediaIds,setMediaIds]=useState<string[]>([]),[queueBusy,setQueueBusy]=useState(false),[queuedRequest,setQueuedRequest]=useState(''),[requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const [details,setDetails]=useState(blankRequestDetails),[olderDraft,setOlderDraft]=useState(false);
  const busy=writeBusy||queueBusy||offline.isSyncing;
  const [restored,setRestored]=useState(false),[draftFault,setDraftFault]=useState(false),[draftError,setDraftError]=useState(""),[checking,setChecking]=useState(false);
  const draftKey=useManagerStorageKey(profile?`primefield-request-draft:${profile.id}`:null),restoredKey=useRef<string|null>(null);
  useEffect(()=>{restoredKey.current=null;setRestored(false);setDraftFault(false);if(admin||!draftKey)return;try{const raw=localStorage.getItem(draftKey),saved=raw===null?null:JSON.parse(raw);if(raw!==null){if(!validRequestDraft(saved))throw Error();setDate(saved.date);setCategory(saved.category);setDescription(saved.description);setDetails(saved.details||blankRequestDetails());setOlderDraft(saved.olderDraft??(!saved.details&&!!(saved.description||saved.mediaIds?.length||saved.queuedRequest)));setMediaIds(saved.mediaIds??[]);setRequestId(saved.requestId||(saved.queuedRequest||crypto.randomUUID()));setQueuedRequest(saved.queuedRequest??'');}else setDate(today());restoredKey.current=draftKey;setRestored(true);}catch{setDraftFault(true);setDraftError(recoveryMessage);}},[admin,draftKey]);
  useEffect(()=>{if(admin||!draftKey||restoredKey.current!==draftKey||!restored||draftFault)return;try{localStorage.setItem(draftKey,JSON.stringify({...JSON.parse(localStorage.getItem(draftKey)||"{}"),date,category,description,mediaIds,requestId,queuedRequest,details,olderDraft}));}catch{setRequestError("Draft could not be saved. Keep this form open until confirmed.");}},[admin,draftKey,restored,draftFault,date,category,description,mediaIds,requestId,queuedRequest,details,olderDraft,setRequestError]);
  useEffect(()=>{const target=new URL(window.location.href).searchParams.get("request_id")||selected?.id;if(target){const row=records.rows.find(row=>row.id===target) as OperationalRequest|undefined;if(row){setSelected(row);}}},[records.rows,selected?.id]);
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')void reloadRequests();};window.addEventListener('farm-records-synced',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('farm-records-synced',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[reloadRequests]);
  const queueStatus=identity&&queuedRequest?getSubmissionStatus(identity,queuedRequest):undefined;
  useEffect(()=>{if(queuedRequest&&identity)setMessage(deliveryMessage(getSubmissionStatus(identity,queuedRequest),'request'));},[queuedRequest,identity,offline.pendingCount,offline.conflicts,offline.quarantinedCount]);
  async function checkStatus(){if(!queuedRequest||checking)return;setChecking(true);try{const status=await offline.checkSubmission(queuedRequest,'request');setMessage(deliveryMessage(status,'request'));if(status==='sent')await reloadRequests();}catch(error){setRequestError(error instanceof Error?error.message:'Confirmation unavailable. Keep this saved request for review.');}finally{setChecking(false);}}
  async function create(){if(busy||uncertain||queuedRequest||draftFault||!restored)return;setQueueBusy(true);records.setError('');try{const requestDetails=olderDraft?undefined:requestFieldsForSubmit(details,description);if(requestDetails){const parsed=requestDetailsSchema.safeParse(requestDetails);if(!parsed.success||requestDetails.needed_on<date)throw Error('Check the date needed, reason and requested quantities.');}const result=await offline.submitOrQueue('/api/farm/operational-requests',{request_date:date,category,description,request_id:requestId,...(requestDetails?{request_details:requestDetails}:{})},{mediaIds});if(!result.success)throw Error(result.error);setQueuedRequest(requestId);setMessage(deliveryMessage(result.status||'unknown','request'));if(result.status==='sent'){setFormOpen(false);await reloadRequests();}}catch(error){records.setError(error instanceof Error?error.message:'Request not saved. Keep this form and retry.');}finally{setQueueBusy(false);}}
  function newRequest(){if(draftFault||!restored)return;if(queuedRequest&&queueStatus!=='sent'){setFormOpen(true);return;}if(queuedRequest){setDetails(blankRequestDetails());setOlderDraft(false);setDescription('');setMediaIds([]);setRequestId(crypto.randomUUID());setQueuedRequest('');}setFormOpen(true);}
  async function decide(operation:string){if(!selected)return;const row=await write({operation,revision:selected.revision,reason,ceo_response:reason,...(operation==="resolve"?{resolution:reason}:{})},selected.id) as OperationalRequest|null;if(row){setSelected({...selected,...row});setMessage("Decision saved. The manager can see your response.");setDecision("");setReason("");await reloadRequests();}}
  function choose(row:OperationalRequest){setSelected(row);setReason("");setMessage("");}
  async function retryPending(){const row=await retry() as OperationalRequest|null;if(row){choose(row);if(!admin)setDescription("");setMessage(admin?"Saved decision confirmed.":"Operational request submitted.");await reloadRequests();}}
  return <div className="mx-auto max-w-5xl space-y-6 text-slate-800"><div><p className="mt-1 text-sm text-slate-600">{admin?"Review requests and approve the next step.":"Ask the MD for an item or action."}</p></div>
    {uncertain&&<div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">The previous submission is unconfirmed. Its saved values are locked to prevent duplicates. <button className="min-h-11 px-3 font-semibold underline" disabled={busy||retryFault} onClick={()=>void retryPending()}>Retry saved submission</button></div>}{records.error&&<div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{records.error} <button className="underline" onClick={()=>void reloadRequests()}>Reload records</button></div>}{message&&<p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{message}</p>}
    {draftError&&<p role="alert" className="rounded-lg bg-amber-50 p-3 text-amber-900">{draftError}</p>}{queuedRequest&&queueStatus!=="sent"&&<button className="min-h-11 font-semibold text-emerald-800 underline" disabled={busy||checking} onClick={()=>void checkStatus()}>Check saved submission status</button>}
    {!admin&&<><button className={button} disabled={busy||uncertain||draftFault||!restored} onClick={newRequest}>New request</button><Dialog open={formOpen} onOpenChange={open=>{if(!busy)setFormOpen(open);}}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogTitle>New operational request</DialogTitle><DialogDescription>Send this request to the MD.</DialogDescription><form className="space-y-4" onSubmit={event=>{event.preventDefault();void create();}}><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Request date<input disabled={busy||uncertain||!!queuedRequest} required type="date" className={`${input} mt-1`} value={date} onChange={event=>setDate(event.target.value)}/></label><label className="text-sm font-medium">Category<select aria-label="Category" disabled={busy||uncertain||!!queuedRequest} className={`${input} mt-1`} value={category} onChange={event=>{const v=event.target.value;setCategory(v);if((v==="purchase"||v==="feed")&&!details.items.length)setDetails({...details,purchase_category:v==="feed"?"feed":"other",items:[{description:"",quantity:"",unit:v==="feed"?"bags":"",destination:v==="feed"?"feed":"other",...(v==="feed"?{feed_type:"fish",feed_source:"local" as const}:{})}]});}}>{categories.map(value=><option key={value}>{value}</option>)}</select></label></div><label className="block text-sm font-medium">What do you need?<textarea disabled={busy||uncertain||!!queuedRequest} aria-label="What do you need?" required maxLength={2000} rows={4} className={`${input} mt-1`} value={description} onChange={event=>setDescription(event.target.value)}/></label><fieldset disabled={busy||uncertain||!!queuedRequest}>{!olderDraft&&<FarmRequestDetailsForm value={details} onChange={setDetails} requestDate={date}/>} {mediaIds.length>0&&<p className="text-sm text-slate-600">{mediaIds.length} saved {mediaIds.length===1?"photo":"photos"} from your earlier draft.</p>}</fieldset>{records.error&&<p role="alert" className="text-red-800">{records.error}</p>}{queuedRequest&&<p role="status">{message}</p>}<div className="flex flex-wrap gap-3"><button className={button} disabled={busy||uncertain||!!queuedRequest||!description.trim()}>Submit request</button><button type="button" className="min-h-11 rounded border px-4" disabled={busy} onClick={()=>setFormOpen(false)}>Close and keep draft</button></div></form></DialogContent></Dialog></>}
    {selected&&!records.error&&<section className={panel}><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{selected.request_date} - {selected.category}</h2><span className="text-sm">{selected.status}</span></div><dl className="grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Requested by</dt><dd className="break-all">{selected.requester?.name||"Name not recorded"}</dd></div><div><dt className="text-slate-500">Created at</dt><dd>{farmTimestamp(selected.created_at)}</dd></div>{selected.decision_at&&<><div><dt className="text-slate-500">MD decision date</dt><dd>{farmTimestamp(selected.decision_at)}</dd></div><div><dt className="text-slate-500">Decision recorded by</dt><dd className="break-all">{selected.decider?.name||"Name not recorded"}</dd></div></>}{selected.resolved_at&&<div><dt className="text-slate-500">Resolved at</dt><dd>{farmTimestamp(selected.resolved_at)}</dd></div>}</dl><p className="whitespace-pre-wrap break-words">{selected.description}</p>{selected.request_details&&<div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm"><p><strong>When needed</strong> {selected.request_details.needed_on}</p><p><strong>Why needed</strong> {selected.request_details.why_needed}</p>{selected.request_details.items.map((line,i)=><p key={i}>{line.description} · {line.quantity} {line.unit}{line.unit_price!==undefined?" · "+formatExactCurrency(line.unit_price,"NGN")+" per unit":""}</p>)}{selected.status==="approved"&&selected.request_details.purchase_category&&<Link className="inline-flex min-h-11 items-center font-semibold text-emerald-800 underline" href={admin?"/dashboard/farm/purchases":managerBase+"/purchases"}>View purchase and delivery</Link>}</div>}{selected.action_taken&&<p className="text-sm"><strong>Action already taken:</strong> {selected.action_taken}</p>}{selected.report_id&&<Link className="break-all text-sm text-emerald-700 underline" href={`${admin?"/dashboard/farm/daily-reports":managerBase+"/daily-report/history"}?report_id=${selected.report_id}`}>View originating daily report</Link>}<p className="whitespace-pre-wrap break-words text-sm"><strong>MD response:</strong> {selected.ceo_response||"Awaiting response"}</p><FarmRecordDiscussion resource="farm_operational_requests" recordId={selected.id}/>{selected.resolution&&<p className="whitespace-pre-wrap break-words text-sm"><strong>Resolution:</strong> {selected.resolution}</p>}{selected.linked_purchase&&<div className="rounded-xl bg-emerald-50 p-4"><p><strong>Purchase amount:</strong> {formatExactCurrency(selected.linked_purchase.total,'NGN')}</p><p>Supplier: {selected.linked_purchase.supplier||'Not recorded'}</p><FarmRecordEvidence resource="farm_purchases" recordId={selected.linked_purchase.id}/><Link className="inline-flex min-h-11 items-center underline" href={admin?'/dashboard/farm/purchases':managerBase+'/purchases'}>View purchase lines, quote, payments and deliveries</Link></div>}{selected.feed_count_review&&<p className="rounded-xl bg-amber-50 p-4">This physical-count decision can change stock. <Link className="inline-flex min-h-11 items-center font-semibold underline" href={admin?'/dashboard/farm/feed-stock':managerBase+'/feed-stock'}>Review count in Feed Inventory</Link></p>}<FarmRecordEvidence resource="farm_operational_requests" recordId={selected.id}/>{admin&&!selected.feed_count_review&&['pending','approved'].includes(selected.status)&&<div className="flex flex-wrap gap-3 border-t pt-4">{(['respond',...(selected.status==='pending'?['approve','decline']:selected.linked_purchase||selected.request_details?.purchase_category?[]:['resolve']),'cancel']).map(action=><button key={action} className={button} disabled={busy||uncertain} onClick={()=>{setDecision(action);setReason('');}}>{{respond:'Send response',approve:'Approve',decline:'Decline',resolve:'Mark resolved',cancel:'Cancel request'}[action]}</button>)}</div>}</section>}
    <Dialog open={!!decision} onOpenChange={open=>{if(!open&&!busy)setDecision('');}}><DialogContent className="sm:max-w-lg"><DialogTitle>{{respond:'Send a response',approve:'Approve request',decline:'Decline request',resolve:'Mark request resolved',cancel:'Cancel request'}[decision]||'Request decision'}</DialogTitle><DialogDescription>{selected?.description} Your note will be shown to the manager and saved in the activity history. Approval does not send money or record delivery.</DialogDescription><form className="space-y-4" onSubmit={event=>{event.preventDefault();void decide(decision);}}><label className="block text-base font-medium">Decision note (required)<textarea autoFocus aria-label="Decision note" required maxLength={2000} rows={4} className={input} disabled={busy||uncertain} value={reason} onChange={event=>setReason(event.target.value)}/></label>{records.error&&<p role="alert" className="text-red-800">{records.error}</p>}<div className="flex gap-3"><button className={button} disabled={busy||uncertain||!reason.trim()}>{busy?'Saving...':'Confirm decision'}</button><button type="button" disabled={busy} className="min-h-11 rounded-lg border px-4" onClick={()=>setDecision('')}>Cancel</button></div></form></DialogContent></Dialog>
    <button className="min-h-11 underline" disabled={busy} onClick={()=>void reloadRequests()}>Refresh requests</button>
    {!records.error&&<section className={panel}><h2 className="font-semibold">{admin?"Farm request history":"Your request history"}</h2>{records.loading?<p role="status">Loading requests…</p>:!records.rows.length?<p className="text-sm text-slate-500">No operational requests recorded.</p>:<div className="grid gap-3 sm:grid-cols-2">{(records.rows as OperationalRequest[]).map(row=><button key={row.id} disabled={busy||uncertain} className="min-h-16 w-full rounded-lg border p-3 text-left hover:bg-emerald-50" onClick={()=>choose(row)}><span className="flex flex-wrap justify-between gap-2 text-sm font-semibold"><span>{admin&&<span className="mr-2 block break-all">{row.requester?.name||"Name not recorded"}</span>}{row.request_date} - {row.category}</span><span>{row.status}</span></span><span className="mt-1 block truncate text-sm text-slate-600">{row.description}</span></button>)}</div>}<Pagination {...records}/></section>}
  </div>;
}
