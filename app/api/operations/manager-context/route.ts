import {NextResponse} from "next/server";
import {requestManagerScope,managerReadError} from "@/lib/manager-read-api";
import type {Business} from "@/lib/manager-period-types";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const business=new URL(request.url).searchParams.get("business");
 if(!["farm","property","content"].includes(business||""))return NextResponse.json({error:"Choose a business"},{status:400});
 try{return NextResponse.json(await requestManagerScope(request,business as Business),{headers:{"Cache-Control":"private, no-store"}});}catch(error){return managerReadError(error);}
}
