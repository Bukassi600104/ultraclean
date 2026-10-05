import { NextRequest } from "next/server";
import { writeFarmOperation } from "@/lib/farm-reports";
export const runtime="nodejs";
export function PUT(request:NextRequest,{params}:{params:{id:string}}){return writeFarmOperation(request,"report",params.id);}
