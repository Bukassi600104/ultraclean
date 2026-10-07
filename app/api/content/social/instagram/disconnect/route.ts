import {NextResponse} from "next/server";
import {requireContentManager} from "@/lib/auth";
import {integrationRow,socialWrite} from "@/lib/content-social";
import {contentError} from "@/lib/content";
export async function POST(){try{const actor=await requireContentManager();if(actor.role!=='admin')return NextResponse.json({error:'CEO authorization required'},{status:403});const row=await integrationRow();if(!row)return NextResponse.json({data:null});const data=await socialWrite(actor.id,'integration',{status:'disconnected',last_error:null},row);return NextResponse.json({data})}catch(e){return contentError(e)}}
