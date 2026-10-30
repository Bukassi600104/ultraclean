import {NextResponse} from 'next/server';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {getFarmControl} from '@/lib/farm-control';
import {buildLegacyManagerWorkbook} from '@/lib/legacy-manager-export';
import {cashDate} from '@/lib/operations-cash-validation';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const scope=await requestManagerScope(request,'farm',true),p=new URL(request.url).searchParams,from=p.get('from')||'',to=p.get('to')||'';
 if(!cashDate.safeParse(from).success||!cashDate.safeParse(to).success||from>to)return NextResponse.json({error:'Choose valid report dates'},{status:400});
 const data=await getFarmControl(scope,from,to),sources={...data.report.records,...Object.fromEntries(Object.entries(data.report.assets).map(([k,v])=>['asset_'+k,v]))};
 const bytes=await buildLegacyManagerWorkbook({target:{id:scope.periodId||'whole-farm',name:data.report.manager?.name||'Whole farm'},asOf:data.asOf,summary:{from,to,currency:'NGN',...data.credit.summary},attributionNotes:['CEO operational report; this does not change special historical-account export eligibility.','Financial source rows include earlier entries required to calculate opening balances. Apply report dates when reviewing period activity.','Unknown historical attribution remains unknown; source JSON retains saved values.'],sheets:Object.entries(sources).map(([name,rows],i)=>({name:`${i+1} ${name}`.slice(0,31),rows}))});
 // shortcut: Vercel response limit; large reports need private object storage, never a partial workbook.
 if(bytes.byteLength>4*1024*1024)return NextResponse.json({error:'The complete workbook exceeds the download limit. Contact support for a full export.'},{status:413});
 return new NextResponse(new Uint8Array(bytes).buffer,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="primefield-${from}-${to}.xlsx"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(e){return managerReadError(e);}}
