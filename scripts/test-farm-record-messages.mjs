import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite,asRole} from '../tests/helpers/manager-db.mjs';
const db=await managerDatabase().catch(error=>{console.error(error.message);process.exit(1);});
const send=(actor,payload,retry=crypto.randomUUID())=>scalar(db,'select farm_record_message_write($1,$2::jsonb,$3)',[actor,JSON.stringify(payload),retry]);
try{
 assert.ok(await scalar(db,"select to_regprocedure('farm_record_message_write(uuid,jsonb,uuid)')"),'Record discussions required');
 const unknown=await scalar(db,"insert into farm_sales(date,product,quantity,unit_price,total_amount,created_by) values('2026-01-01','other',1,10,10,null) returning id");
 await periodWrite(db,ids.admin,'activate');
 await assert.rejects(()=>scalar(db,"select farm_record_messages_read($1,'farm_sales',$2)",[ids.farm,unknown]),e=>e.code==='42501','Unknown historical attribution cannot grant thread participation');
 const sale=await scalar(db,"select farm_v2_write($1,'sale','create',$2::jsonb,null,null,$3)",[ids.farm,JSON.stringify({date:'2026-10-30',product:'other',quantity:1,unit_price:100,pricing_basis:'per_unit'}),crypto.randomUUID()]);
 const original=await scalar(db,'select to_jsonb(t) from farm_sales t where id=$1',[sale.id]);
 const question={resource:'farm_sales',record_id:sale.id,kind:'question',body:'Which customer received this?'},retry=crypto.randomUUID();
 const posted=await send(ids.admin,question,retry);assert.deepEqual(await send(ids.admin,question,retry),posted);
 const reply=await send(ids.farm,{...question,kind:'reply',reply_to:posted.id,body:'The recorded customer received it.'});
 assert.equal(reply.actor_id,ids.farm);
 const thread=await scalar(db,"select farm_record_messages_read($1,'farm_sales',$2)",[ids.farm,sale.id]);assert.equal(thread.length,2);
 await assert.rejects(()=>send(ids.property,question),e=>e.code==='42501');
 await assert.rejects(()=>asRole(db,'authenticated',ids.farm,()=>send(ids.admin,question)),e=>e.code==='42501');
 await assert.rejects(()=>send(ids.farm,{...question,kind:'reply',reply_to:crypto.randomUUID()}));
 await scalar(db,"select farm_v2_write($1,'day','close','{\"date\":\"2026-10-30\"}')",[ids.farm]);
 await send(ids.farm,{...question,kind:'comment',body:'Clarification after closing.'});
 assert.deepEqual(await scalar(db,'select to_jsonb(t) from farm_sales t where id=$1',[sale.id]),original);
 console.log('PASS record discussions: authorized question/reply, retries, immutable source figures and clarification after day closure');
}catch(error){console.error(error.message);process.exitCode=1;}finally{await db.close();}
