import {discussionResource} from '@/lib/farm-record-messages';
import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {requireManager} from '@/lib/auth';
import {createServerClient} from '@/lib/supabase/server';
import {requestManagerScope,managerReadError} from '@/lib/manager-read-api';
import {withManagerWrite,managerRpc} from '@/lib/manager-write-api';
import {farmErrorResponse} from '@/lib/farm-v2';
import {prepareEvidenceImage,MAX_EVIDENCE_BYTES} from '@/lib/farm-evidence-image';
import {cashDate} from '@/lib/operations-cash-validation';

export const runtime='nodejs';
const bucket='farm-evidence';
const metadata=z.object({request_id:z.string().uuid(),activity_date:cashDate,batch_id:z.string().uuid().optional(),target_resource:z.enum(['farm_inventory_transactions','farm_daily_reports','farm_operational_requests','farm_sales','farm_feed_purchases','farm_batch_records','farm_purchase_requests','farm_health_tasks'])}).strict();
async function boundedForm(request:Request){
 if(!request.body)throw Error('Choose a photo');
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
  if(size>MAX_EVIDENCE_BYTES+65536){await reader.cancel();throw Error('Photo request is too large');}chunks.push(value);
 }}finally{reader.releaseLock();}
 return new Response(new Uint8Array(Buffer.concat(chunks)),{headers:{'Content-Type':request.headers.get('Content-Type')||''}}).formData();
}
export async function POST(request:Request){return withManagerWrite(request,'farm',async()=>{
 const profile=await requireManager();
 let form:FormData;
 try{form=await boundedForm(request);}catch{return NextResponse.json({error:'Choose a photo no larger than 3 MB'},{status:400});}
 const file=form.get('file'),fields:Record<string,unknown>={};
 form.forEach((value,key)=>{if(key!=='file')fields[key]=value;});
 const parsed=metadata.safeParse(fields);
 if(!parsed.success||!(file instanceof Blob)||Array.from(form.keys()).length!==new Set(form.keys()).size)return NextResponse.json({error:'Check the photo, activity date and batch'},{status:400});
 let image;
 try{image=await prepareEvidenceImage(Buffer.from(await file.arrayBuffer()),file.type);}catch{return NextResponse.json({error:'Choose a valid JPEG, PNG or WebP photo, up to 3 MB and 20 megapixels'},{status:400});}
 const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Photo service unavailable'});
 const {request_id,...details}=parsed.data;
 const reserved=await managerRpc(db,'farm_evidence_write',{p_actor:profile.id,p_operation:'reserve',p_payload:{...details,sha256:image.sha256,bytes:image.bytes.length,mime:image.mime},p_request:request_id});
 if(reserved.error)return farmErrorResponse(reserved.error);
 const row=reserved.data;
 if(row.status!=='uploaded'){
  const upload=await db.storage.from(bucket).upload(row.object_path,image.bytes,{contentType:image.mime,upsert:false,cacheControl:'0'});
  if(upload.error){
   if(String(upload.error.statusCode)!=='409')return NextResponse.json({error:'Photo upload is pending. Keep your saved photo and retry.'},{status:503});
   const existing=await db.storage.from(bucket).download(row.object_path);
   if(existing.error||!existing.data)return NextResponse.json({error:'Photo verification is pending. Keep your saved photo and retry.'},{status:503});
   if(createHash('sha256').update(Buffer.from(await existing.data.arrayBuffer())).digest('hex')!==image.sha256)return NextResponse.json({error:'The stored photo differs from this upload. Keep the original for review.'},{status:409});
  }
  const completed=await managerRpc(db,'farm_evidence_write',{p_actor:profile.id,p_operation:'uploaded',p_payload:{id:row.id},p_request:request_id});
  if(completed.error)return farmErrorResponse(completed.error);
 }
 return NextResponse.json({data:{id:row.id,status:'uploaded'}},{status:201,headers:{'Cache-Control':'private, no-store'}});
});}
export async function GET(request:Request){
 try{
  const scope=await requestManagerScope(request,'farm');
  const params=new URL(request.url).searchParams,id=params.get('id');
  const db=createServerClient();if(!db)return farmErrorResponse({code:'503',message:'Photo service unavailable'});
  if(!id){
   const source=z.object({resource:discussionResource,record_id:z.string().uuid()}).safeParse({resource:params.get('resource'),record_id:params.get('record_id')});
   if(!source.success)return NextResponse.json({error:'Choose a valid photo or farm record'},{status:400});
   const result=await db.rpc('farm_record_evidence_read',{p_actor:scope.actorId,p_resource:source.data.resource,p_record:source.data.record_id,p_period:scope.periodId});
   if(result.error)return farmErrorResponse(result.error);
   return NextResponse.json({data:result.data},{headers:{'Cache-Control':'private, no-store'}});
  }
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Choose a valid photo'},{status:400});
  const {data,error}=await db.rpc('farm_evidence_read',{p_actor:scope.actorId,p_id:id,p_period:scope.periodId});
  if(error)return farmErrorResponse(error);
  if(data.status!=='uploaded')return NextResponse.json({error:'Photo upload is still pending'},{status:409});
  const signed=await db.storage.from(bucket).createSignedUrl(data.object_path,60);
  if(signed.error||!signed.data)return NextResponse.json({error:'Photo is temporarily unavailable'},{status:503});
  return NextResponse.json({id:data.id,url:signed.data.signedUrl,expires_in:60},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return managerReadError(error);}
}
