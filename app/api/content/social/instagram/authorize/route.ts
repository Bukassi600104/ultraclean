import {NextResponse} from "next/server";
import {requireContentManager} from "@/lib/auth";
import {socialConfig,socialState} from "@/lib/content-social";
import {contentError} from "@/lib/content";
export const dynamic="force-dynamic";
export async function GET(){try{const actor=await requireContentManager();if(actor.role!=='admin')return NextResponse.json({error:'CEO authorization required'},{status:403});const config=socialConfig();if(!config.configured)return NextResponse.json({error:'Instagram developer configuration is required. Manual entry is available.'},{status:503});const state=socialState(actor.id),url=new URL('https://www.instagram.com/oauth/authorize');url.search=new URLSearchParams({client_id:config.appId!,redirect_uri:config.redirect!,response_type:'code',scope:'instagram_business_basic,instagram_business_manage_insights',state}).toString();const response=NextResponse.redirect(url);response.cookies.set('content_instagram_state',state,{httpOnly:true,secure:true,sameSite:'lax',maxAge:600,path:'/api/content/social/instagram'});return response}catch(e){return contentError(e)}}
