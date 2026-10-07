import type { Profile } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
export type FeedStock = { id:string;feed_type:string;feed_source:"local"|"foreign";current_bags:number|null;initialized_at:string|null;initialized_by:string|null;opening_date:string|null;revision:number;updated_at:string };
export type FeedStockMovement = { id:string;stock_id:string;movement_type:"opening"|"receipt"|"use"|"adjust";bags_delta:number;resulting_bags:number|null;movement_date:string;actor_id:string;reason:string|null;purchase_id:string|null;daily_feed_id:string|null;created_at:string };
export async function feedStockWrite(profile:Profile,operation:string,payload:unknown,options:{id?:string;reason?:string;requestId?:string}={}) {
 const db=createServerClient();if(!db)return {data:null,error:{code:"503",message:"Database not configured"}};
 return db.rpc("farm_feed_stock_write",{p_actor:profile.id,p_operation:operation,p_payload:payload,p_id:options.id??null,p_reason:options.reason??null,p_request_id:options.requestId??null});
}
