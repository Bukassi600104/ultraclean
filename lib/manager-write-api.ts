import {AsyncLocalStorage} from "node:async_hooks";
import {requestManagerScope,managerReadError} from "@/lib/manager-read-api";
import type {Business,ManagerScope} from "@/lib/manager-period-types";
import type {SupabaseClient} from "@supabase/supabase-js";
const currentWrite=new AsyncLocalStorage<ManagerScope>();
export async function withManagerWrite(request:Request,business:Business,write:()=>Promise<Response>,adminOnly=false) {
 try{
  const scope=await requestManagerScope(request,business,adminOnly);
  const expected=request.headers.get("X-Manager-Period"),actor=request.headers.get("X-Manager-Actor");
  if((scope.mode==="personal"&&scope.actorId===scope.managerId&&(!expected||!actor))||(expected&&expected!==(scope.periodId||"legacy"))||(actor&&actor!==scope.actorId))
   throw Object.assign(Error("This saved entry belongs to another login or responsibility period. Keep it for review."),{code:"42501"});
  return await currentWrite.run(scope,write);
 }catch(error){return managerReadError(error);}
}
export function managerRpc(db:SupabaseClient,name:string,args:Record<string,unknown>) {
 const scope=currentWrite.getStore();
 if(scope?.periodId){
  const add=(row:unknown)=>row&&typeof row==="object"&&!Array.isArray(row)?{...row,manager_period_id:scope.periodId}:row;
  args={...args,p_payload:Array.isArray(args.p_payload)?args.p_payload.map(add):add(args.p_payload)};
 }
 return db.rpc(name,args);
}
