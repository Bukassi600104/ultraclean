import {NextResponse} from "next/server";
import type {Profile} from "@/lib/auth";
import type {ManagerScope,WriteOutcome} from "@/lib/manager-period-types";
import {createServerClient} from "@/lib/supabase/server";
import {managerRpc,withManagerWrite} from "@/lib/manager-write-api";
import {cashRequestSchema,type CashRequest,type CashSummary} from "@/lib/operations-cash-validation";
import {requestManagerScope} from "@/lib/manager-read-api";
export async function cashWrite(actor:Pick<Profile,"id">,operation:CashRequest["operation"],payload:CashRequest["payload"],requestId:string):Promise<WriteOutcome<Record<string,unknown>>>{
 const db=createServerClient();if(!db)throw Error("Database unavailable");
 const {data,error}=await managerRpc(db,"operations_cash_write",{p_actor:actor.id,p_operation:operation,p_payload:payload,p_request_id:requestId});if(error)throw error;return data;
}
export async function getCashSummary(scope:ManagerScope,filters:{from?:string;to?:string;page?:number;limit?:number}={}):Promise<CashSummary>{
 const db=createServerClient();if(!db)throw Error("Database unavailable");const {data,error}=await db.rpc("operations_cash_summary",{p_actor:scope.actorId,p_business:scope.business,p_period_id:scope.periodId,p_from:filters.from??null,p_to:filters.to??null,p_page:filters.page??0,p_limit:filters.limit??100});if(error)throw error;return data;
}
export function cashError(error:unknown){
 const e=error as {code?:string;message?:string};const status=e.code==="42501"?403:e.code==="P0002"?404:["23514","23505","40001"].includes(e.code||"")?409:["22023","22P02","22007","22008"].includes(e.code||"")?400:503;
 return NextResponse.json({error:status===503?"Funds information is unavailable. Please retry.":e.message,code:e.code},{status});
}
export async function postCash(request:Request,receiptsOnly=false){
 const parsed=cashRequestSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Check the cash entry"},{status:400});
 const {operation,payload,request_id}=parsed.data;
 if(receiptsOnly&&!["receive","handoff"].includes(operation))return NextResponse.json({error:"Use the funds workflow for this action"},{status:400});
 return withManagerWrite(request,payload.business,async()=>{
  try{const scope=await requestManagerScope(request,payload.business);const result=await cashWrite({id:scope.actorId},operation,payload,request_id);return NextResponse.json(result,{status:result.status==="posted"?201:202,headers:{"Cache-Control":"private, no-store"}});}catch(e){return cashError(e);}
 },["fund","correct","void"].includes(operation));
}
