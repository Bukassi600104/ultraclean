import {NextRequest} from "next/server";
import {platformAction} from "@/lib/content-platforms";
export const dynamic="force-dynamic";
export const runtime="nodejs";
type Context={params:{platform:string;action:string}};
export function GET(request:NextRequest,{params}:Context){return platformAction(request,params.platform,params.action,'GET')}
export function POST(request:NextRequest,{params}:Context){return platformAction(request,params.platform,params.action,'POST')}
