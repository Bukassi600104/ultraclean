import {NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentUser} from "@/lib/auth";
import {managerReadError} from "@/lib/manager-read-api";
import {canExportLegacyManager,getLegacyManagerSnapshot,buildLegacyManagerWorkbook} from "@/lib/legacy-manager-export";
export const runtime="nodejs";export const dynamic="force-dynamic";
let activeExports=0;
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:Request,{params}:{params:{id:string}}){
 let acquired=false;
 try{
  const actor=await getCurrentUser();if(!actor)return NextResponse.json({error:"Sign in to download this account's history"},{status:403,headers});
  if(!z.string().uuid().safeParse(params.id).success)return NextResponse.json({error:"Choose a valid manager account"},{status:400,headers});
  if(!canExportLegacyManager(actor,params.id))return NextResponse.json({error:"Historical export is limited to the two authorised manager accounts"},{status:403,headers});
  if(new URL(request.url).searchParams.get("eligibility")==="1")return NextResponse.json({allowed:true},{headers});
  if(activeExports>=2)return NextResponse.json({error:"Two historical exports are being prepared. Please retry shortly."},{status:429,headers:{...headers,"Retry-After":"5"}});
  activeExports++;acquired=true;
  const snapshot=await getLegacyManagerSnapshot(actor,params.id),bytes=await buildLegacyManagerWorkbook(snapshot);
  // shortcut: Complete responses are capped at 4 MiB; use private object storage for larger workbooks.
  if(bytes.byteLength>4*1024*1024)return NextResponse.json({error:"This complete workbook exceeds the download limit. Contact support for a full export."},{status:413,headers});
  return new NextResponse(new Uint8Array(bytes).buffer,{headers:{...headers,"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="primefield-${params.id}-history-${snapshot.asOf.slice(0,10)}.xlsx"`,"X-Content-Type-Options":"nosniff"}});
 }catch(error){const response=managerReadError(error);response.headers.set("Cache-Control","private, no-store");return response;}
 finally{if(acquired)activeExports--;}
}
