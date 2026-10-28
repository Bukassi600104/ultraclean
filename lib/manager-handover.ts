import {createServerClient} from "@/lib/supabase/server";
import type {Profile} from "@/lib/auth";
import type {HandoverState,HandoverDecision} from "./manager-handover-types";
async function call(actor:Profile,operation:string,sessionId:string|null,items:HandoverDecision["items"],requestId:string|null):Promise<HandoverState>{
 const db=createServerClient();if(!db)throw Object.assign(Error("Handover service unavailable"),{code:"503"});
 const {data,error}=await db.rpc("handover_write",{p_actor:actor.id,p_operation:operation,p_session_id:sessionId,p_items:items,p_request_id:requestId});
 if(error)throw error;if(!data||!Array.isArray(data.steps)||!["active","awaiting_handover"].includes(data.status))throw Error("Handover service returned invalid data");return data;
}
export function getHandover(actor:Profile){return call(actor,"get",null,[],null);}
export function writeHandover(actor:Profile,body:HandoverDecision){return call(actor,body.operation,body.sessionId,body.items,body.requestId);}
