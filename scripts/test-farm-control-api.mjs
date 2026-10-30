import assert from 'node:assert/strict';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
const id='00000000-0000-4000-8000-000000000001';let called=0,allowed=true,args;
const load=typescriptLoader({'@/lib/manager-read-api':{requestManagerScope:async(r,b,admin)=>{assert.equal(admin,true);if(!allowed)throw Error();return {actorId:id,periodId:null};},managerReadError:()=>Response.json({error:'Denied'},{status:403})},'@/lib/farm-control':{getFarmControl:async(...a)=>{called++;args=a;return {summary:'Authoritative report'};}},'@/lib/auth':{requireAdmin:async()=>{if(!allowed)throw Error();return {id};}},'@/lib/supabase/server':{createServerClient:()=>({rpc:async(n,a)=>{args=a;return {data:{id},error:null};}})}});
const api=load('app/api/farm/control/route.ts');assert.equal((await api.GET(new Request('http://local/api/farm/control?from=2026-10-01&to=2026-10-30'))).status,200);assert.equal(args[1],'2026-10-01');
assert.equal((await api.GET(new Request('http://local/api/farm/control?from=2026-02-30'))).status,400);assert.equal(called,1);
allowed=false;assert.equal((await api.GET(new Request('http://local/api/farm/control'))).status,403);assert.equal(called,1);
allowed=true;const settings=load('app/api/farm/reporting-settings/route.ts');
const payload={timezone:'Africa/Lagos',mortality_alert_count:null,feed_alert_days:null,display_currency:null,exchange_rate:null,rate_date:null,rate_valid_until:null,rate_source:null,reason:'Owner approved preferences'};
const req=p=>new Request('http://local/api/farm/reporting-settings',{method:'POST',body:JSON.stringify({request_id:id,payload:p})});
assert.equal((await settings.POST(req(payload))).status,200);assert.equal(args.p_actor,id);
assert.equal((await settings.POST(req({...payload,actor_id:id}))).status,400);assert.equal((await settings.POST(req({...payload,timezone:'Unknown/Timezone'}))).status,400);
console.log('PASS CEO report API: administrator required, validated dates, authoritative scope and server-owned settings actor');
let sendMode='success',sends=0;
class Resend{constructor(){this.domains={get:async()=>({data:{name:'example.test',status:'verified'},error:null})};this.emails={send:async(body,options)=>{sends++;assert.equal(options.idempotencyKey,'farm-summary/job');if(sendMode==='network')throw Error('Connection lost');return sendMode==='rejected'?{data:null,error:{message:'Rejected'}}:{data:{id:'provider'},error:null};}};}}
process.env.RESEND_API_KEY='isolated-token';process.env.FARM_SUMMARY_FROM='farm@example.test';process.env.FARM_SUMMARY_RESEND_DOMAIN_ID='isolated-domain';
const delivery=typescriptLoader({'server-only':{},resend:{Resend}})('lib/farm-summary-delivery.ts');
const setting={channel:'email',sender:'farm@example.test',recipient:'owner@example.test'},job={id:'job',summary:'Actual isolated summary',report_date:'2026-10-30'};
assert.equal((await delivery.deliverFarmSummary(setting,job)).status,'sent');sendMode='network';assert.equal((await delivery.deliverFarmSummary(setting,job)).status,'unknown');sendMode='rejected';assert.equal((await delivery.deliverFarmSummary(setting,job)).status,'failed');
assert.equal((await delivery.deliverFarmSummary({...setting,sender:'changed@example.test'},job)).status,'failed');assert.equal(sends,3);
process.env.FARM_WHATSAPP_TOKEN='isolated';process.env.FARM_WHATSAPP_PHONE_ID='123';process.env.FARM_WHATSAPP_TEMPLATE_ID='456';process.env.FARM_WHATSAPP_API_VERSION='v25.0';
const originalFetch=global.fetch;let whatsappCalls=0;
global.fetch=async(url,init)=>{assert.ok(String(url).startsWith('https://graph.facebook.com/'));if(init?.method==='POST'){whatsappCalls++;assert.equal(JSON.parse(init.body).template.components[0].parameters[0].text,job.summary);return Response.json({messages:[{id:'wa-accepted'}]});}return Response.json(String(url).includes('/123?')?{id:'123',verified_name:'Configured sender'}:{id:'456',name:'farm_summary',language:'en',status:'APPROVED',components:[{type:'BODY',text:'Your daily report: {{1}}'}]});};
try{assert.equal((await delivery.deliverFarmSummary({channel:'whatsapp',sender:'123',recipient:'+2348000000000'},job)).status,'sent');assert.equal(whatsappCalls,1);}finally{global.fetch=originalFetch;}
console.log('PASS isolated sender verification, provider acceptance vs uncertain delivery, stable email idempotency and approved WhatsApp template');
