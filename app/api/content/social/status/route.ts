import {platformConfig} from "@/lib/content-platforms";
import {NextResponse} from "next/server";
import {requireContentManager} from "@/lib/auth";
import {socialConfig} from "@/lib/content-social";
import {contentError} from "@/lib/content";
export const dynamic="force-dynamic";
export async function GET(){try{const actor=await requireContentManager();return NextResponse.json({data:{admin:actor.role==='admin',instagram:{configured:socialConfig().configured},facebook:{configured:platformConfig('facebook').configured},tiktok:{configured:platformConfig('tiktok').configured}}})}catch(e){return contentError(e)}}

