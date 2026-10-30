import 'server-only';
import {Resend} from 'resend';
export type SummaryChannel='email'|'whatsapp';
export type SummarySetting={id:string;actor_id:string;channel:SummaryChannel;enabled:boolean;recipient:string;sender:string;timezone:string;delivery_time:string;created_at:string};
type WhatsAppTemplate={id:string;name:string;language:string;status:string;components:{type:string;text?:string}[]};
function whatsappConfig(){
 const token=process.env.FARM_WHATSAPP_TOKEN,phone=process.env.FARM_WHATSAPP_PHONE_ID,template=process.env.FARM_WHATSAPP_TEMPLATE_ID,version=process.env.FARM_WHATSAPP_API_VERSION;
 if(!token||!phone||!template||!version||!/^\d+$/.test(phone)||!/^\d+$/.test(template)||!/^v\d+\.\d+$/.test(version))throw Error('WhatsApp sender connection is not configured');
 return {token,phone,template,base:'https://graph.facebook.com/'+version};
}
export async function verifySummarySender(channel:SummaryChannel):Promise<string>{
 if(channel==='email'){
  const key=process.env.RESEND_API_KEY,sender=process.env.FARM_SUMMARY_FROM,domainId=process.env.FARM_SUMMARY_RESEND_DOMAIN_ID;
  if(!key||!sender||!domainId||!/^\S+@\S+\.\S+$/.test(sender))throw Error('Farm summary email sender is not configured');
  const {data,error}=await new Resend(key).domains.get(domainId);
  if(error||data?.status!=='verified'||data.name.toLowerCase()!==sender.split('@')[1].toLowerCase())throw Error('The configured email sender domain is not verified');return sender;
 }
 const c=whatsappConfig(),headers={Authorization:'Bearer '+c.token};
 const [phone,template]=await Promise.all([fetch(`${c.base}/${c.phone}?fields=id,verified_name`,{headers,cache:'no-store',signal:AbortSignal.timeout(15000)}),fetch(`${c.base}/${c.template}?fields=id,name,language,status,components`,{headers,cache:'no-store',signal:AbortSignal.timeout(15000)})]);
 if(!phone.ok||!template.ok)throw Error('WhatsApp sender or approved template could not be verified');
 const p=await phone.json(),t=await template.json() as WhatsAppTemplate;
 const body=t.components?.find(v=>v.type==='BODY');
 if(p.id!==c.phone||!p.verified_name||t.status!=='APPROVED'||!body?.text?.includes('{{1}}')||/\{\{(?:[2-9]|\d{2,})\}\}/.test(body.text)||t.components.some(v=>!['BODY','FOOTER'].includes(v.type)))throw Error('Use an approved text-only summary template with one body parameter');return c.phone;
}
export async function deliverFarmSummary(setting:SummarySetting,job:{id:string;summary:string;report_date:string}):Promise<{status:'sent'|'failed'|'unknown';provider:string|null;error:string|null}>{
 try{
  if(await verifySummarySender(setting.channel)!==setting.sender)return {status:'failed',provider:null,error:'Sender changed; Bimbo must approve the new connection'};
 }catch{return {status:'failed',provider:null,error:'Sender verification unavailable; no message sent'};}
 try{
  if(setting.channel==='email'){
   const {data,error}=await new Resend(process.env.RESEND_API_KEY!).emails.send({from:setting.sender,to:setting.recipient,subject:'Primefield Farm daily report · '+job.report_date,text:job.summary},{idempotencyKey:'farm-summary/'+job.id});
   if(error)return {status:'failed',provider:null,error:'Email provider rejected the request; check sender configuration'};
   return data?.id?{status:'sent',provider:data.id,error:null}:{status:'unknown',provider:null,error:'Provider receipt missing; check provider before retrying'};
  }
  const c=whatsappConfig(),headers={Authorization:'Bearer '+c.token,'Content-Type':'application/json'},template=await fetch(`${c.base}/${c.template}?fields=name,language`,{headers,cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!template.ok)return {status:'failed',provider:null,error:'Approved template unavailable; no message sent'};
  const t=await template.json() as WhatsAppTemplate;
  // shortcut: One approved body parameter, add a document template if summaries exceed 1024 characters.
  if(job.summary.length>1024)return {status:'failed',provider:null,error:'Complete summary exceeds WhatsApp template length. Use email or copy the summary.'};
  const response=await fetch(`${c.base}/${c.phone}/messages`,{method:'POST',headers,signal:AbortSignal.timeout(20000),body:JSON.stringify({messaging_product:'whatsapp',to:setting.recipient.replace(/^\+/,''),type:'template',template:{name:t.name,language:{code:t.language},components:[{type:'body',parameters:[{type:'text',text:job.summary.replaceAll('\n','; ')}]}]}})});
  if(!response.ok)return {status:response.status>=500?'unknown':'failed',provider:null,error:'WhatsApp provider did not confirm acceptance'};
  const result=await response.json();return result.messages?.[0]?.id?{status:'sent',provider:result.messages[0].id,error:null}:{status:'unknown',provider:null,error:'Provider receipt missing; verify before another send'};
 }catch{return {status:'unknown',provider:null,error:'Connection interrupted; check provider before another send'};}
}
