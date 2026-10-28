import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {resolveManagerScope} from "@/lib/manager-periods";
import {getManagerReport} from "@/lib/manager-reports";
import {businessSchema,cashDate} from "@/lib/operations-cash-validation";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request){
 let actor;try{actor=await requireAdmin();}catch{return NextResponse.json({error:"CEO access required"},{status:403});}
 const p=new URL(request.url).searchParams,business=businessSchema.safeParse(p.get("business")),from=p.get("from")||undefined,to=p.get("to")||undefined;
 if(!business.success||(from&&!cashDate.safeParse(from).success)||(to&&!cashDate.safeParse(to).success)||(from&&to&&from>to))return NextResponse.json({error:"Choose a valid business and reporting dates"},{status:400});
 try{const scope=await resolveManagerScope(actor,business.data),report=await getManagerReport(scope,{from,to});return NextResponse.json(report,{headers:{"Cache-Control":"private, no-store"}});}catch{return NextResponse.json({error:"The control report is unavailable. Existing figures have not been replaced."},{status:503});}
}
