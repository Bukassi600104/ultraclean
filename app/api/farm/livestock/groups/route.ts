import { NextRequest,NextResponse } from "next/server";
import { requireAdmin,requireManager } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { farmErrorResponse } from "@/lib/farm-v2";
import { classificationFields } from "@/lib/farm-livestock-validation";
import { z } from "zod";
export const runtime="nodejs";
export async function GET(){try{await requireManager();}catch{return NextResponse.json({error:"Unauthorized"},{status:401});}const db=createServerClient();if(!db)return NextResponse.json({error:"Database unavailable"},{status:503});const {data,error}=await db.rpc("farm_livestock_balances");return error?farmErrorResponse(error):NextResponse.json({data},{headers:{"Cache-Control":"no-store"}});}
const schema=z.object({operation:z.enum(["allocate","transfer"]),product:z.enum(["catfish","goat","chicken","pig","turkey","cattle"]),classification:classificationFields.classification.unwrap(),from_group_id:z.string().uuid().optional(),quantity:z.number().int().positive(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),reason:z.string().trim().min(1).max(1000),request_id:z.string().uuid()}).strict();
export async function POST(request:NextRequest){let actor;try{actor=await requireAdmin();}catch{return NextResponse.json({error:"Admin access required"},{status:403});}const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Valid categories, date, quantity and reason are required"},{status:400});const {operation,reason,request_id,...payload}=parsed.data;const db=createServerClient();if(!db)return NextResponse.json({error:"Database unavailable"},{status:503});const {data,error}=await db.rpc("farm_livestock_group_write",{p_actor:actor.id,p_operation:operation,p_payload:payload,p_reason:reason,p_request_id:request_id});return error?farmErrorResponse(error):NextResponse.json({data});}
