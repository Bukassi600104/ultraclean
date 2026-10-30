import assert from 'node:assert/strict';
import sharp from 'sharp';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
const id='00000000-0000-4000-8000-000000000001';
let denied=false,failUpload=false,uploaded=false,stored,conflict=false;
const storage={upload:async(path,bytes)=>{if(failUpload)return {error:{statusCode:'500'}};if(conflict)return {error:{statusCode:'409'}};stored=bytes;return {error:null}},download:async()=>({data:new Blob([stored]),error:null}),createSignedUrl:async()=>({data:{signedUrl:'https://example.test/short-lived'},error:null})};
const db={storage:{from:name=>{assert.equal(name,'farm-evidence');return storage}},rpc:async(name,args)=>{
 if(denied)return {error:{code:'42501',message:'Forbidden'}};
 if(name==='farm_evidence_read')return {data:{id,status:'uploaded',object_path:'private/photo.jpg'}};
 if(args.p_operation==='uploaded'){uploaded=true;return {data:{id,status:'uploaded'}};}
 return {data:{id,status:'pending',object_path:'private/photo.jpg',sha256:args.p_payload.sha256}};
}};
const load=typescriptLoader({'@/lib/auth':{requireManager:async()=>({id,role:'manager'})},'@/lib/supabase/server':{createServerClient:()=>db},'@/lib/manager-read-api':{requestManagerScope:async()=>({actorId:id,periodId:id}),managerReadError:()=>Response.json({error:'Forbidden'},{status:403})},'@/lib/manager-write-api':{withManagerWrite:async(r,b,fn)=>fn(),managerRpc:(d,n,a)=>d.rpc(n,a)}});
const api=load('app/api/farm/evidence/route.ts');
const png=await sharp({create:{width:2,height:2,channels:3,background:'#fff'}}).png().toBuffer();
const request=()=>{const form=new FormData();form.set('file',new Blob([png],{type:'image/png'}),'proof.png');form.set('request_id',id);form.set('activity_date','2026-10-30');form.set('target_resource','farm_inventory_transactions');return new Request('http://localhost/api/farm/evidence',{method:'POST',body:form});};
failUpload=true;assert.equal((await api.POST(request())).status,503);assert.equal(uploaded,false);
failUpload=false;assert.equal((await api.POST(request())).status,201);assert.equal(uploaded,true);
conflict=true;assert.equal((await api.POST(request())).status,201);
stored=Buffer.from('different contents');assert.equal((await api.POST(request())).status,409);
denied=true;assert.equal((await api.GET(new Request('http://localhost/api/farm/evidence?id='+id))).status,403);
denied=false;const read=await api.GET(new Request('http://localhost/api/farm/evidence?id='+id));assert.equal(read.status,200);assert.equal(read.headers.get('Cache-Control'),'private, no-store');assert.equal('object_path' in await read.json(),false);
console.log('PASS evidence API: failed upload retained, same-byte retry, conflict rejection and authorized private reads');
