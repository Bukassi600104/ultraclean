import {NextResponse} from "next/server";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth";
import {createServerClient} from "@/lib/supabase/server";
import {businessForRole} from "@/lib/manager-period-types";
import {cashDate} from "@/lib/operations-cash-validation";
import {cashError} from "@/lib/operations-cash";
const schema=z.discriminatedUnion("operation",[
 z.object({operation:z.literal("provision"),starts_on:cashDate,reason:z.string().trim().min(1).max(2000),request_id:z.string().uuid()}).strict(),
 z.object({operation:z.literal("close"),period_id:z.string().uuid(),reason:z.string().trim().min(1).max(2000),request_id:z.string().uuid()}).strict(),
 z.object({operation:z.literal("assign"),period_id:z.string().uuid(),assets:z.array(z.object({resource:z.string().min(1),record_id:z.string().uuid()}).strict()).min(1).max(1000),reason:z.string().trim().min(1).max(2000),request_id:z.string().uuid()}).strict()
]);
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:{id:string}}){try{try{await requireAdmin();}catch{return NextResponse.json({error:"CEO access required"},{status:403});}if(!z.string().uuid().safeParse(params.id).success)return NextResponse.json({error:"Invalid manager"},{status:400});const db=createServerClient();if(!db)throw Error();const {data,error}=await db.from("manager_periods").select("*").eq("manager_id",params.id).order("created_at",{ascending:false});if(error)throw error;return NextResponse.json({periods:data},{headers:{"Cache-Control":"private, no-store"}});}catch(e){return cashError(e);}}
export async function POST(request:Request,{params}:{params:{id:string}}){
 let actor;try{actor=await requireAdmin();}catch{return NextResponse.json({error:"CEO access required"},{status:403});}
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success||!z.string().uuid().safeParse(params.id).success)return NextResponse.json({error:"Check the period decision and reason"},{status:400});
 try{const db=createServerClient();if(!db)throw Error();const {data:person,error}=await db.from("profiles").select("id,role").eq("id",params.id).maybeSingle();if(error)throw error;const business=person&&businessForRole(person.role);if(!business)return NextResponse.json({error:"Manager account not found"},{status:404});
 const value=parsed.data;if(value.operation!=="provision"){const {data:period,error}=await db.from("manager_periods").select("id").eq("id",value.period_id).eq("manager_id",params.id).eq("business",business).maybeSingle();if(error)throw error;if(!period)return NextResponse.json({error:"Choose this manager's own period"},{status:403});}
 const {operation,...payload}=value;const {data,error:writeError}=await db.rpc("manager_period_write",{p_actor:actor.id,p_operation:operation,p_payload:{...payload,manager_id:params.id,business}});if(writeError)throw writeError;return NextResponse.json(data,{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return cashError(e);}
}
