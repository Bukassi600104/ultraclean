import { z } from "zod";
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
// Legacy sections retain their original strings; only new reports use version 2.
export const sectionsSchema=z.union([structuredSectionsSchema,legacySectionsSchema]).refine(value=>new TextEncoder().encode(JSON.stringify(value)).length<=28000,"Report is too long. Shorten the section notes.");
export type StructuredReportSections=z.infer<typeof structuredSectionsSchema>;
export const reportSchema = z.object({report_date:date,sections:sectionsSchema,decision_required:z.boolean().default(false)}).strict().refine(value=>!value.decision_required || value.sections.problems.issues.length>0,{message:"Describe the issue requiring a decision",path:["sections","problems","issues"]});
export const requestSchema = z.object({request_date:date,category:z.enum(REQUEST_CATEGORIES),description:z.string().trim().min(1).max(2000)}).strict();
export type ReportSections = z.infer<typeof sectionsSchema>;
export type DailyReport = z.infer<typeof reportSchema> & {id:string;manager_id:string;manager?:{id:string;name:string|null}|null;status:"draft"|"submitted";revision:number;created_at:string;submitted_at:string|null;reviewed_by:string|null;reviewed_at:string|null;review_note:string|null};
export type OperationalRequest = z.infer<typeof requestSchema> & {id:string;report_id:string|null;action_taken?:string|null;requested_by:string;requester?:{id:string;name:string|null}|null;status:"pending"|"approved"|"declined"|"resolved";revision:number;created_at:string;ceo_response:string|null;resolution:string|null;decision_by:string|null;decision_at:string|null;resolved_at:string|null};

export async function listFarmOperations(request:NextRequest,kind:"report"|"request") {
  let profile;try{profile=await requireManager();}catch{return NextResponse.json({error:"Unauthorized"},{status:401});}
  const db=createServerClient();if(!db)return farmErrorResponse({code:"503",message:"Database not configured"});
  const params=new URL(request.url).searchParams;
  const targetId=params.get("id");
  if(targetId&&!z.string().uuid().safeParse(targetId).success)return NextResponse.json({error:"Invalid record ID"},{status:400});
  const page=Math.max(1,Number.parseInt(params.get("page")||"1")||1);
  let query=db.from(kind==="report"?"farm_daily_reports":"farm_operational_requests").select(kind==="report"?"*,manager:profiles!manager_id(id,name)":"*,requester:profiles!requested_by(id,name)",{count:"exact"});
  if(profile.role!=="admin")query=query.eq(kind==="report"?"manager_id":"requested_by",profile.id);
  if(targetId)query=query.eq("id",targetId);
  const {data,count,error}=await query.order(kind==="report"?"report_date":"request_date",{ascending:false}).order("created_at",{ascending:false}).range((page-1)*50,page*50-1);
  if(error)return farmErrorResponse(error);
  return NextResponse.json({data,total:count});
}

export async function writeFarmOperation(request:NextRequest,kind:"report"|"request",id?:string){
  let profile;try{profile=await requireManager();}catch{return NextResponse.json({error:"Unauthorized"},{status:401});}
  let body:Record<string,unknown>;try{body=await request.json();if(!body||Array.isArray(body)||typeof body!=="object")throw Error();}catch{return NextResponse.json({error:"Invalid request body"},{status:400});}
  const operation=id?body.operation:"create";
  const allowed=kind==="report"?["create","update","submit","review"]:["create","respond","approve","decline","resolve"];
  if(typeof operation!=="string"||!allowed.includes(operation)||(id&&operation==="create"))return NextResponse.json({error:"Invalid operation"},{status:400});
  if(["review","respond","approve","decline","resolve"].includes(operation)){
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
  if(operation==="update"&&fields.decision_required&&!(fields.sections as ReportSections).problems.issues)return NextResponse.json({error:"Describe the issue requiring a decision"},{status:400});
  if(id&&!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"Invalid record ID"},{status:400});
  const requestId=request.headers.get("X-Request-ID");if(!requestId||!z.string().uuid().safeParse(requestId).success)return NextResponse.json({error:"A valid X-Request-ID is required for safe retries"},{status:400});
  const {operation:ignored,revision,reason:reasonValue,...payload}=fields;void ignored;
  const db=createServerClient();if(!db)return farmErrorResponse({code:"503",message:"Database not configured"});
  const {data,error}=await db.rpc("farm_operations_write",{p_actor:profile.id,p_kind:kind,p_operation:operation,p_payload:{...payload,...(id?{expected_revision:revision}:{})},p_id:id??null,p_reason:reasonValue??null,p_request_id:requestId});
  if(error)return farmErrorResponse(error);
  return NextResponse.json({data},{status:id?200:201});
}
