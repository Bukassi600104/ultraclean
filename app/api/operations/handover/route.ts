import {NextResponse} from "next/server";
import {z} from "zod";
import {requireManager} from "@/lib/auth";
import {getHandover,writeHandover} from "@/lib/manager-handover";
import {managerReadError} from "@/lib/manager-read-api";
import {withManagerWrite} from "@/lib/manager-write-api";
import {farmErrorResponse,type FarmWriteError} from "@/lib/farm-v2";
export const dynamic="force-dynamic";
export async function GET(){
 try{const actor=await requireManager();return NextResponse.json(await getHandover(actor),{headers:{"Cache-Control":"private, no-store"}});}catch(error){return managerReadError(error);}
}
const schema=z.object({sessionId:z.string().uuid(),operation:z.enum(["save","finalize"]),requestId:z.string().uuid(),items:z.array(z.object({itemId:z.string().uuid(),status:z.enum(["confirmed","cannot_confirm"]),version:z.string().regex(/^[a-f0-9]{32}$/)}).strict()).max(500)}).strict();
export function POST(request:Request){return withManagerWrite(request,"farm",async()=>{
 try{const actor=await requireManager();const text=await request.text();if(text.length>100000)return NextResponse.json({error:"Too many confirmations. Save a smaller step."},{status:400});const parsed=schema.safeParse(JSON.parse(text));if(!parsed.success)return NextResponse.json({error:"Check the handover confirmations"},{status:400});const state=await writeHandover(actor,parsed.data);return NextResponse.json(state,{status:state.conflict?409:200,headers:{"Cache-Control":"private, no-store"}});}catch(error){return error instanceof SyntaxError?NextResponse.json({error:"Invalid handover request"},{status:400}):(error as FarmWriteError)?.code?farmErrorResponse(error as FarmWriteError):managerReadError(error);}
 });}
