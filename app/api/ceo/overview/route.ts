import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCeoOverview } from "@/lib/ceo-overview";
import { farmDateToday } from "@/lib/farm-products";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export async function GET(request:NextRequest) {
 try {const profile=await requireAdmin();if(profile.suspended)throw new Error("Suspended");}
 catch{return NextResponse.json({error:"CEO access required"},{status:403});}
 const to=request.nextUrl.searchParams.get("to")??farmDateToday(),from=request.nextUrl.searchParams.get("from")??to.slice(0,8)+"01";
 if(!validDate(from)||!validDate(to)||from>to)return NextResponse.json({error:"Choose a valid date range"},{status:400});
 try{return NextResponse.json(await getCeoOverview({from,to}),{headers:{"Cache-Control":"private, no-store"}});}
 catch{return NextResponse.json({error:"Dashboard data is unavailable"},{status:503});}
}
