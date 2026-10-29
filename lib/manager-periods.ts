import {createServerClient} from "@/lib/supabase/server";
import type {Profile} from "@/lib/auth";
import type {Business,ManagerScope} from "./manager-period-types";
export type {Business,ManagerScope} from "./manager-period-types";

function failure(message:string,code="42501"):never {throw Object.assign(new Error(message),{code});}
export async function resolveManagerScope(actor:Profile,business:Business,selection:{managerId?:string;periodId?:string}={}):Promise<ManagerScope> {
 const db=createServerClient();if(!db)failure("Manager service unavailable","503");
 let periodId=selection.periodId;
 if(selection.managerId){
  if(actor.role!=="admin"&&selection.managerId!==actor.id)failure("Own manager records only");
  let query=db.from("manager_periods").select("id,manager_id,business").eq("manager_id",selection.managerId).eq("business",business);
  if(periodId)query=query.eq("id",periodId);
  const {data,error}=await query.order("ended_at",{ascending:false,nullsFirst:true}).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;if(!data)failure("Manager period is not configured");periodId=data.id;
 }
 const {data,error}=await db.rpc("manager_context",{p_actor:actor.id,p_business:business,p_period_id:periodId??null});
 if(error)throw error;
 if(!data||data.actorId!==actor.id||data.business!==business||typeof data.featureEnabled!=="boolean"||!["admin_all","legacy","personal"].includes(data.mode)||!["active","awaiting_handover","closed"].includes(data.status))failure("Invalid manager context","503");
 return data as ManagerScope;
}
export type RecordFilters={from?:string;to?:string;page?:number;limit?:number;[key:string]:unknown};
export async function readManagerRecords(scope:ManagerScope,resource:string,filters:RecordFilters={}):Promise<{data:Record<string,unknown>[];total:number;has_more:boolean}> {
 const db=createServerClient();if(!db)failure("Manager service unavailable","503");
 const ownLegacy=scope.mode==="legacy"&&scope.actorId===scope.managerId&&filters.personal_report!==true;
 const {data,error}=await db.rpc("manager_read_records",{p_actor:scope.actorId,p_business:scope.business,p_resource:resource,p_period_id:ownLegacy?null:scope.periodId,p_filters:filters});
 if(error)throw error;
 if(!data||!Array.isArray(data.data)||typeof data.total!=="number")failure("Scoped records are unavailable","503");
 return data;
}
