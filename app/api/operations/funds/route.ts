import {NextResponse} from "next/server";
import {z} from "zod";
import {requestManagerScope,managerReadError} from "@/lib/manager-read-api";
import {getCashSummary,postCash,cashError} from "@/lib/operations-cash";
import {businessSchema,cashDate} from "@/lib/operations-cash-validation";
export const runtime="nodejs";
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,parsed=z.object({business:businessSchema,from:cashDate.optional(),to:cashDate.optional(),page:z.coerce.number().int().min(0),limit:z.coerce.number().int().min(1).max(500)}).safeParse({business:p.get("business"),from:p.get("from")??undefined,to:p.get("to")??undefined,page:p.get("page")??0,limit:p.get("limit")??100});
 if(!parsed.success)return NextResponse.json({error:"Check the business, dates and page"},{status:400});
 let scope;try{scope=await requestManagerScope(request,parsed.data.business);}catch(e){return managerReadError(e);}
 try{return NextResponse.json(await getCashSummary(scope,parsed.data),{headers:{"Cache-Control":"private, no-store"}});}catch(e){return cashError(e);}
}
export function POST(request:Request){return postCash(request);}
