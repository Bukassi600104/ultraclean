import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite,asRole} from '../tests/helpers/manager-db.mjs';
const db=await managerDatabase();
const write=(op,payload)=>scalar(db,'select farm_batch_write($1,$2,$3::jsonb,$4)',[ids.admin,op,JSON.stringify(payload),crypto.randomUUID()]);
const report=(actor=ids.admin,period=null)=>scalar(db,"select farm_performance_read($1,$2,'2026-10-01','2026-10-30')",[actor,period]);
try{
 await db.exec("insert into farm_inventory(product,current_stock) values('catfish',40)");
 await periodWrite(db,ids.admin,'activate');
 const site=await write('site',{name:'Isolated actual site'}),batch=await write('batch',{site_id:site.id,name:'New pond',kind:'pond',product:'catfish'}),empty=await write('batch',{site_id:site.id,name:'Not stocked',kind:'pond',product:'catfish'});
 await write('allocate',{batch_id:batch.id,quantity:20,date:'2026-10-28',reason:'Actual backdated stocking'});
 let result=await report();
 assert.deepEqual(result.batches.find(b=>b.id===batch.id).expected_dates,['2026-10-28','2026-10-29','2026-10-30']);
 assert.deepEqual(result.batches.find(b=>b.id===empty.id).expected_dates,[]);
 await write('transfer',{batch_id:batch.id,to_batch_id:empty.id,quantity:20,date:'2026-10-29',reason:'Actual removal from this group'});
 result=await report();assert.deepEqual(result.batches.find(b=>b.id===batch.id).expected_dates,['2026-10-28','2026-10-29'],'Final stocked day counts but later empty days do not');
 await write('allocate',{batch_id:batch.id,quantity:10,date:'2026-10-30',reason:'Actual new stocking'});
 const manager='00000000-0000-4000-8000-000000000081';
 await db.query('insert into auth.users(id) values($1)',[manager]);await db.query("insert into profiles(id,role,name) values($1,'manager','Isolated supervisor')",[manager]);
 const period=await periodWrite(db,ids.admin,'provision',{manager_id:manager,business:'farm',starts_on:'2026-10-29'});
 await periodWrite(db,ids.admin,'assign',{period_id:period.id,assets:[{resource:'farm_batches',record_id:batch.id}]});
 await db.query("update manager_asset_assignments set assigned_at='2026-10-29T00:00:00+01' where period_id=$1",[period.id]);
 result=await report(ids.admin,period.id);assert.deepEqual(result.batches.find(b=>b.id===batch.id).expected_dates,['2026-10-29','2026-10-30']);
 assert.ok(!result.batches.some(b=>b.id===empty.id),'Another unassigned group is not exposed');
 // Isolated fixture metadata only; production writes remain guarded.
 await db.exec("alter table farm_batches disable trigger user");
 await db.query("update farm_batches set archived_at='2026-10-29T23:00:00+01' where id=$1",[batch.id]);
 await db.exec('alter table farm_batches enable trigger user');
 result=await report();assert.deepEqual(result.batches.find(b=>b.id===batch.id).expected_dates,['2026-10-28','2026-10-29']);
 await assert.rejects(()=>asRole(db,'authenticated',manager,()=>report(ids.admin)),e=>e.code==='42501');
 const before=await scalar(db,'select jsonb_agg(to_jsonb(t)) from farm_inventory t');await report();assert.deepEqual(await scalar(db,'select jsonb_agg(to_jsonb(t)) from farm_inventory t'),before);
 console.log('PASS performance operational dates: backdated stocking, empty groups, sold-out days, responsibility, archive, permissions and unchanged stock');
}catch(e){console.error(e.message,e.code,e.where,e.query);process.exitCode=1;}finally{await db.close();}
