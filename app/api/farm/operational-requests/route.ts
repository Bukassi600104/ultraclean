import { NextRequest } from "next/server";
import { listFarmOperations, writeFarmOperation } from "@/lib/farm-reports";
export const runtime="nodejs";
export function GET(request:NextRequest){return listFarmOperations(request,"request");}
export function POST(request:NextRequest){return writeFarmOperation(request,"request");}
