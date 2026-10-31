import {NextResponse} from 'next/server';
import {APP_RELEASE,RELEASE_NOTES,QUEUE_FORMAT} from '@/lib/app-release';
export const dynamic='force-dynamic';
export function GET(request:Request){
 const host=new URL(request.url).hostname;
 const promoted=['leads.ultratidycleaning.com','farm.primefieldagric.com','ultratidycleaning.com','www.ultratidycleaning.com'].includes(host)&&process.env.VERCEL_ENV==='production';
 return NextResponse.json({releaseId:APP_RELEASE,notes:RELEASE_NOTES,queueFormat:QUEUE_FORMAT,promoted},{headers:{'Cache-Control':'no-store, max-age=0','CDN-Cache-Control':'no-store','Vercel-CDN-Cache-Control':'no-store'}});
}
