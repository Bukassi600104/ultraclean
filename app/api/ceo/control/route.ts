import {NextResponse} from "next/server";
import {z} from "zod";
import {managerReadError} from "@/lib/manager-read-api";
import {requireAdmin} from "@/lib/auth";
import {resolveManagerScope} from "@/lib/manager-periods";
import {getManagerReport} from "@/lib/manager-reports";
import {businessSchema,cashDate} from "@/lib/operations-cash-validation";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request){
 let actor;try{actor=await requireAdmin();}catch{return NextResponse.json({error:"CEO access required"},{status:403});}
 const p=new URL(request.url).searchParams,business=businessSchema.safeParse(p.get("business")),period=z.string().uuid().optional().safeParse(p.get("period_id")||undefined),from=p.get("from")||undefined,to=p.get("to")||undefined;
 if(!business.success||!period.success||(from&&!cashDate.safeParse(from).success)||(to&&!cashDate.safeParse(to).success)||(from&&to&&from>to))return NextResponse.json({error:"Choose a valid business and reporting dates"},{status:400});
 try{const scope=await resolveManagerScope(actor,business.data,{periodId:period.data}),report=await getManagerReport(scope,{from,to});return NextResponse.json(report,{headers:{"Cache-Control":"private, no-store"}});}catch(error){return managerReadError(error);}
}
