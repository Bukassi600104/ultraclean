import {contentList,contentSave} from "@/lib/content";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:{kind:string}};
export function GET(request:Request,{params}:Context){return contentList(request,params.kind)}
export function POST(request:Request,{params}:Context){return contentSave(request,params.kind)}
export function PATCH(request:Request,{params}:Context){return contentSave(request,params.kind,true)}
