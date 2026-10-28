import {NextResponse} from "next/server";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth";
import {resolveManagerScope} from "@/lib/manager-periods";
import {managerReadError} from "@/lib/manager-read-api";
import {getManagerReport} from "@/lib/manager-reports";
import {businessSchema,cashDate} from "@/lib/operations-cash-validation";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:{id:string}}){
 try{const actor=await requireAdmin(),p=new URL(request.url).searchParams,parsed=z.object({id:z.string().uuid(),business:businessSchema,periodId:z.string().uuid().optional(),from:cashDate.optional(),to:cashDate.optional()}).safeParse({id:params.id,business:p.get("business"),periodId:p.get("period_id")||undefined,from:p.get("from")||undefined,to:p.get("to")||undefined});
 if(!parsed.success)return NextResponse.json({error:"Choose a valid manager, business and dates"},{status:400});
 const scope=await resolveManagerScope(actor,parsed.data.business,{managerId:params.id,periodId:parsed.data.periodId});return NextResponse.json(await getManagerReport(scope,parsed.data),{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return managerReadError(e);}
}
