import {withManagerWrite} from "@/lib/manager-write-api";
import {managerRpc} from "@/lib/manager-write-api";
import {managerReadResponse} from "@/lib/manager-read-api";
import { z } from "zod";
import {applicableAreaFields,areaFields,areaSectionsSchema,areaTitle,isAreaSections,reportArea} from '@/lib/farm-report-areas';
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireManager } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { farmErrorResponse } from "@/lib/farm-v2";

export const REQUEST_CATEGORIES = ["purchase", "feed", "veterinary", "repair", "maintenance", "equipment", "staffing", "water", "pump", "emergency", "other"] as const;
const text = z.string().trim().max(2000).default("");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const parsed = new Date(value + "T12:00:00Z"); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value; }, "Invalid calendar date");
const legacySectionsSchema = z.object({
  farm1: z.object({ pond1:text, pond2:text, pond3:text, pond4:text, water_issue:text }).strict().default({pond1:"",pond2:"",pond3:"",pond4:"",water_issue:""}),
  farm2: z.object({ vat1:text, vat2:text, vat3:text, mortality:text, water_issue:text, pump_status:text }).strict().default({vat1:"",vat2:"",vat3:"",mortality:"",water_issue:"",pump_status:""}),
  livestock: z.object({ goats:text, ram:text, cattle:text, piggery:text, poultry:text, mortality:text, sick_animals:text, feed:text, water:text }).strict().default({goats:"",ram:"",cattle:"",piggery:"",poultry:"",mortality:"",sick_animals:"",feed:"",water:""}),
  crops: z.object({ report:text }).strict().default({report:""}),
  people: z.object({ workers_present:z.number().int().min(0).max(9999).optional(), supervisor:text, tasks_completed:text }).strict().default({supervisor:"",tasks_completed:""}),
  problems: z.object({ issues:text, action_taken:text, request_category:z.enum(REQUEST_CATEGORIES).default("other") }).strict().default({issues:"",action_taken:"",request_category:"other"}),
}).strict().refine(value=>new TextEncoder().encode(JSON.stringify(value)).length<=28000,"Report is too long. Shorten the section notes.");
const waterBody = z.object({water_quality:text,mortality:text,feed:text,general_remarks:text}).strict().default({water_quality:"",mortality:"",feed:"",general_remarks:""});
const sickAnimal = z.object({animal_group:z.string().trim().min(1).max(100),quantity:z.number().int().min(1).max(9999).optional(),symptoms:text,action_taken:text,remarks:text}).strict();
const structuredSectionsSchema = z.object({
  template_version:z.literal(2),
  farm1:z.object({pond1:waterBody,pond2:waterBody,pond3:waterBody,pond4:waterBody,water_issue:text}).strict(),
  farm2:z.object({vat1:waterBody,vat2:waterBody,vat3:waterBody,water_issue:text,pump_status:text}).strict(),
  livestock:z.object({goats:text,ram:text,cattle:text,piggery:text,poultry:text,mortality:text,feed:text,water:text,sick_animals:z.array(sickAnimal).max(50).default([])}).strict(),
  crops:z.object({report:text}).strict().default({report:""}),
  people:z.object({workers_present:z.number().int().min(0).max(9999).optional(),supervisor:text,tasks_completed:text}).strict().default({supervisor:"",tasks_completed:""}),
  problems:z.object({issues:text,action_taken:text,request_category:z.enum(REQUEST_CATEGORIES).default("other")}).strict().default({issues:"",action_taken:"",request_category:"other"}),
}).strict();
export const sectionsSchema=z.union([areaSectionsSchema,structuredSectionsSchema,legacySectionsSchema]).refine(value=>new TextEncoder().encode(JSON.stringify(value)).length<=28000,"Report is too long. Shorten the section notes.");
export type StructuredReportSections=z.infer<typeof structuredSectionsSchema>;
export const reportSchema = z.object({report_date:date,sections:sectionsSchema,decision_required:z.boolean().default(false)}).strict().refine(value=>!value.decision_required || (!isAreaSections(value.sections)&&value.sections.problems.issues.length>0),{message:"Describe the issue requiring a decision in the whole-farm report",path:["sections","problems","issues"]});
export const requestSchema = z.object({request_date:date,category:z.enum(REQUEST_CATEGORIES),description:z.string().trim().min(1).max(2000),evidence_ids:z.array(z.string().uuid()).max(6).optional(),request_id:z.string().uuid().optional()}).strict();
export type ReportSections = z.infer<typeof sectionsSchema>;
export type DailyReport = z.infer<typeof reportSchema> & {id:string;manager_id:string;has_photos?:boolean;manager?:{id:string;name:string|null}|null;status:"draft"|"submitted";revision:number;created_at:string;submitted_at:string|null;reviewer?:{id:string;name:string|null}|null;reviewed_by:string|null;reviewed_at:string|null;review_note:string|null};
export type OperationalRequest = z.infer<typeof requestSchema> & {id:string;report_id:string|null;action_taken?:string|null;requested_by:string;requester?:{id:string;name:string|null}|null;status:"pending"|"approved"|"declined"|"resolved"|"cancelled";cancel_reason?:string|null;revision:number;created_at:string;ceo_response:string|null;resolution:string|null;decider?:{id:string;name:string|null}|null;decision_by:string|null;decision_at:string|null;resolved_at:string|null;linked_purchase?:{id:string;total:string; supplier:string|null};feed_count_review?:boolean};

async function operationActors(response:Response,kind:"report"|"request",preview=false) {
 if(!response.ok)return response;
 const body=await response.json(),rows=body.data as (DailyReport|OperationalRequest)[];
 if(!Array.isArray(rows)||!rows.length)return NextResponse.json(body,{headers:response.headers});
 const ids=Array.from(new Set(rows.flatMap(row=>kind==='report'?[(row as DailyReport).reviewed_by,...(!(row as DailyReport).manager?[(row as DailyReport).manager_id]:[])]:[(row as OperationalRequest).decision_by]).filter((id):id is string=>!!id)));
 if(!ids.length&&!preview)return NextResponse.json(body,{headers:response.headers});
 const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Database not configured'});
 // Resolve only actors referenced by records already authorized above. Never expose profile lists.
 const [actors,evidence]=await Promise.all([ids.length?db.from('profiles').select('id,name').in('id',ids):Promise.resolve({data:[],error:null}),preview?db.from('farm_evidence').select('record_id').eq('target_resource','farm_daily_reports').in('record_id',rows.map(row=>row.id)):Promise.resolve(null)]);
 const {data,error}=actors;
 const photos=evidence&&!evidence.error?new Set(evidence.data?.map(item=>item.record_id)):null;
 if(error)return farmErrorResponse(error);
 return NextResponse.json({...body,data:rows.map(row=>{const id=kind==='report'?(row as DailyReport).reviewed_by:(row as OperationalRequest).decision_by;return {...row,...(photos?{has_photos:photos.has(row.id)}:{}),...(kind==='report'?{manager:(row as DailyReport).manager||data?.find(actor=>actor.id===(row as DailyReport).manager_id)||null}:{}),[kind==='report'?'reviewer':'decider']:data?.find(actor=>actor.id===id)||null};})},{headers:response.headers});
}

async function requestLinks(response:Response){
 if(!response.ok)return response;
 const body=await response.json(),rows=body.data as OperationalRequest[];
 if(!Array.isArray(rows)||!rows.length)return NextResponse.json(body,{headers:response.headers});
 const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Database not configured'});
 const ids=rows.map(row=>row.id);
 const [purchases,counts]=await Promise.all([db.from('farm_purchases').select('id,request_id,total,supplier').in('request_id',ids),db.from('farm_feed_activities').select('review_request_id').in('review_request_id',ids).eq('kind','problem')]);
 if(purchases.error||counts.error)return farmErrorResponse(purchases.error||counts.error!);
 return NextResponse.json({...body,data:rows.map(row=>{const p=purchases.data?.find(p=>p.request_id===row.id);return {...row,...(p?{linked_purchase:{id:p.id,total:String(p.total),supplier:p.supplier}}:{}),feed_count_review:counts.data?.some(c=>c.review_request_id===row.id)||false};})},{headers:response.headers});
}

async function readFarmOperations(request:NextRequest,kind:"report"|"request") {
  let profile;try{profile=await requireManager();}catch{return NextResponse.json({error:"Unauthorized"},{status:401});}
  const params=new URL(request.url).searchParams;
  const preview=kind==='report'&&profile.role==='admin'&&params.get('preview')==='1';
  const area=kind==='report'?params.get('area_filter'):null,unreviewed=kind==='report'&&params.get('unreviewed')==='1';
  if(area&&area!=='whole'&&!reportArea(area))return NextResponse.json({error:'Choose a farm area'},{status:400});
  const dated=kind==='report'?params.get('date'):null;
  if(dated&&!date.safeParse(dated).success)return NextResponse.json({error:'Choose a valid report date'},{status:400});
  const page=Math.max(1,Number.parseInt(params.get("page")||"1")||1);
  const scopedUrl=new URL(request.url);
  if(area||unreviewed){scopedUrl.searchParams.set('all','1');scopedUrl.searchParams.set('page','1');}
  const scoped=await managerReadResponse(area||unreviewed?new Request(scopedUrl,{headers:request.headers}):request,"farm",kind==="report"?"farm_daily_reports":"farm_operational_requests");
  if(scoped){
    if(!scoped.ok||!area&&!unreviewed)return operationActors(kind==='request'?await requestLinks(scoped):scoped,kind,preview);
    const {data}=await scoped.json();
    const filtered=(data as DailyReport[]).filter(row=>(!unreviewed||row.status==='submitted'&&!row.reviewed_at)&&(!area||(isAreaSections(row.sections)?row.sections.area:'whole')===area));
    return operationActors(NextResponse.json({data:filtered.slice((page-1)*50,page*50),total:filtered.length},{headers:scoped.headers}),kind,preview);
  }
  const db=createServerClient();if(!db)return farmErrorResponse({code:"503",message:"Database not configured"});
  const targetId=params.get("id");
  if(targetId&&!z.string().uuid().safeParse(targetId).success)return NextResponse.json({error:"Invalid record ID"},{status:400});
  let query=db.from(kind==="report"?"farm_daily_reports":"farm_operational_requests").select(kind==="report"?"*,manager:profiles!manager_id(id,name)":"*,requester:profiles!requested_by(id,name)",{count:"exact"});
  if(dated)query=query.eq('report_date',dated);
  if(area)query=area==='whole'?query.is('sections->>area',null):query.eq('sections->>area',area);
  if(unreviewed)query=query.eq('status','submitted').is('reviewed_at',null);
  if(profile.role!=="admin")query=query.eq(kind==="report"?"manager_id":"requested_by",profile.id);
  if(targetId)query=query.eq("id",targetId);
  const {data,count,error}=await query.order(kind==="report"?"report_date":"request_date",{ascending:false}).order("created_at",{ascending:false}).range((page-1)*50,page*50-1);
  if(error)return farmErrorResponse(error);
  const response=NextResponse.json({data,total:count});return operationActors(kind==='request'?await requestLinks(response):response,kind,preview);
}

async function legacyWriteFarmOperation(request:NextRequest,kind:"report"|"request",id?:string){
  let profile;try{profile=await requireManager();}catch{return NextResponse.json({error:"Unauthorized"},{status:401});}
  let body:Record<string,unknown>;try{body=await request.json();if(!body||Array.isArray(body)||typeof body!=="object")throw Error();}catch{return NextResponse.json({error:"Invalid request body"},{status:400});}
  const operation=id?body.operation:"create";
  const allowed=kind==="report"?["create","update","submit","review"]:["create","respond","approve","decline","resolve","cancel"];
  if(typeof operation!=="string"||!allowed.includes(operation)||(id&&operation==="create"))return NextResponse.json({error:"Invalid operation"},{status:400});
  if(["review","respond","approve","decline","resolve","cancel"].includes(operation)){
    try{profile=await requireAdmin();}catch{return farmErrorResponse({code:"42501",message:"Admin access required"});}
  }
  const reason=z.string().trim().min(1).max(2000);
  const mutation=z.object({operation:z.string(),revision:z.number().int().nonnegative(),reason:reason.optional(),review_note:z.string().trim().min(1).max(2000).optional(),ceo_response:z.string().trim().min(1).max(2000).optional(),resolution:z.string().trim().min(1).max(2000).optional(),report_date:date.optional(),sections:sectionsSchema.optional(),decision_required:z.boolean().optional()}).strict();
  const parsed=(id?mutation:kind==="report"?reportSchema:requestSchema).safeParse(body);
  if(!parsed.success)return NextResponse.json({error:"Validation failed",details:parsed.error.flatten()},{status:400});
  const fields=parsed.data as Record<string,unknown>;
  if(id&&operation!=="submit"&&!fields.reason)return NextResponse.json({error:"A reason is required"},{status:400});
  if(operation==="review"&&!fields.review_note||["respond","approve","decline","resolve"].includes(operation)&&!fields.ceo_response||operation==="resolve"&&!fields.resolution)return NextResponse.json({error:"A review, response or resolution is required"},{status:400});
  if(operation==="update"&&!fields.sections)return NextResponse.json({error:"Report sections are required"},{status:400});
  const updated=fields.sections as ReportSections|undefined;
  if(operation==="update"&&fields.decision_required&&(!updated||isAreaSections(updated)||!updated.problems.issues))return NextResponse.json({error:"Describe the issue requiring a decision"},{status:400});
  if(id&&!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"Invalid record ID"},{status:400});
  const requestId=request.headers.get("X-Request-ID");if(!requestId||!z.string().uuid().safeParse(requestId).success)return NextResponse.json({error:"A valid X-Request-ID is required for safe retries"},{status:400});
  if(fields.request_id&&fields.request_id!==requestId)return NextResponse.json({error:'Retry identifier mismatch'},{status:400});
  const {operation:ignored,revision,reason:reasonValue,request_id:ignoredRequest,...payload}=fields;void ignored;void ignoredRequest;
  const db=createServerClient();if(!db)return farmErrorResponse({code:"503",message:"Database not configured"});
  const {data,error}=await managerRpc(db,kind==='request'?'farm_operational_request_write':"farm_operations_write",{p_actor:profile.id,...(kind==='report'?{p_kind:kind}:{}),p_operation:operation,p_payload:{...payload,...(id?{expected_revision:revision}:{})},p_id:id??null,p_reason:reasonValue??null,p_request_id:requestId});
  if(error)return farmErrorResponse(error);
  return NextResponse.json({data},{status:id?200:201});
}

// Older cached screens iterate all six sections. Present a readable view without rewriting the saved log.
function legacyReportView(row:DailyReport) {
  const source=row?.sections;if(!isAreaSections(source))return row;
  const area=reportArea(source.area);if(!area)return row;
  const notes=[areaTitle(area),...applicableAreaFields(area).flatMap(key=>{
    const value=source.observations[key];return value===undefined||value===''?[]:[`${areaFields[key]}: ${value}`];
  })].join('\n');
  const sections=legacySectionsSchema.parse({});
  if(area.group==='Catfish'){
    const [site,water]=area.key.split('_');
    Object.assign(site==='farm1'?sections.farm1:sections.farm2,{[water]:notes});
  }else if(area.key==='crops')sections.crops.report=notes;
  else Object.assign(sections.livestock,{[area.group==='Poultry'?'poultry':area.group==='Piggery'?'piggery':area.key]:notes});
  return {...row,sections:{...sections,problems:{...sections.problems,request_category:''}}};
}
export async function farmReportResponse(request:Request,response:Response) {
  response.headers.set('Cache-Control','private, no-store');
  if(!response.ok||request.headers.get('X-Farm-Report-Format')==='3')return response;
  const body=await response.json();
  return NextResponse.json({...body,data:Array.isArray(body.data)?body.data.map(legacyReportView):legacyReportView(body.data)},{status:response.status,headers:response.headers});
}
export async function listFarmOperations(request:NextRequest,kind:"report"|"request"){
  const response=await readFarmOperations(request,kind);
  return kind==='report'?farmReportResponse(request,response):response;
}
export async function writeFarmOperation(request:NextRequest,kind:"report"|"request",id?:string){
  const response=await withManagerWrite(request,"farm",()=>legacyWriteFarmOperation(request,kind,id));
  return kind==='report'?farmReportResponse(request,response):response;
}
