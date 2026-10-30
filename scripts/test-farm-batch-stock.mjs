import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite} from '../tests/helpers/manager-db.mjs';
const db=await managerDatabase().catch(error=>{console.error(error.message,error.where);process.exit(1);});
const configure=(op,payload)=>scalar(db,'select farm_batch_write($1,$2,$3::jsonb,$4)',[ids.admin,op,JSON.stringify(payload),crypto.randomUUID()]);
const write=(op,payload,id=null,retry=crypto.randomUUID())=>scalar(db,"select farm_v2_write($1,'sale',$2,$3::jsonb,$4,'Verified batch correction',$5)",[ids.admin,op,JSON.stringify(payload),id,retry]);
try{
 await db.exec("insert into farm_inventory(product,current_stock) values('catfish',80)");
 await periodWrite(db,ids.admin,'activate');
 const site=await configure('site',{name:'Isolated farm'}),batches=[];
 for(const name of ['Pond A','Pond B']){
  const batch=await configure('batch',{site_id:site.id,name,kind:'pond',product:'catfish'});batches.push(batch);
  await configure('allocate',{batch_id:batch.id,quantity:40,date:'2026-10-30',reason:'Verified physical allocation'});
 }
 const balance=bid=>scalar(db,'select sum(quantity)::int from farm_batch_movements where batch_id=$1',[bid]);
 const retry=crypto.randomUUID(),payload={date:'2026-10-30',product:'catfish',quantity:40,weight_kg:72,unit_price:3000,pricing_basis:'per_kg',batch_id:batches[0].id};
 const sale=await write('create',payload,null,retry);
 assert.equal(sale.total_amount,216000);assert.equal(sale.batch_id,batches[0].id);
 assert.equal(await balance(batches[0].id),0);
 assert.equal(await scalar(db,"select current_stock::int from farm_inventory where product='catfish'"),40);
 assert.deepEqual(await write('create',payload,null,retry),sale);
 assert.equal(await scalar(db,'select count(*)::int from farm_inventory_transactions'),1);
 await assert.rejects(()=>write('create',{...payload,batch_id:batches[1].id},null,retry));
 const corrected=await write('update',{batch_id:batches[1].id,expected_revision:0},sale.id);
 assert.equal(corrected.batch_id,batches[1].id);assert.equal(await balance(batches[0].id),40);assert.equal(await balance(batches[1].id),0);
 await write('void',{expected_revision:1},sale.id);
 assert.equal(await balance(batches[0].id),40);assert.equal(await balance(batches[1].id),40);
 assert.equal(await scalar(db,"select current_stock::int from farm_inventory where product='catfish'"),80);
 const mortality={product:'catfish',action:'mortality',quantity:1,date:'2026-10-30',batch_id:batches[0].id};
 const recordMortality=(payload)=>scalar(db,"select farm_v2_write($1,'inventory_transaction','create',$2::jsonb,null,null,$3)",[ids.admin,JSON.stringify(payload),crypto.randomUUID()]);
 await assert.rejects(()=>recordMortality(mortality),e=>e.code==='23514','New mortality requires uploaded evidence');
 const photoRequest=crypto.randomUUID();
 const photo=await scalar(db,"select farm_evidence_write($1,'reserve',$2::jsonb,$3)",[ids.admin,JSON.stringify({sha256:'a'.repeat(64),bytes:100,mime:'image/jpeg',activity_date:'2026-10-30',batch_id:batches[0].id,target_resource:'farm_inventory_transactions'}),photoRequest]);
 await scalar(db,"select farm_evidence_write($1,'uploaded',$2::jsonb,$3)",[ids.admin,JSON.stringify({id:photo.id}),photoRequest]);
 const death=await recordMortality({...mortality,evidence_ids:[photo.id]});
 assert.equal(await balance(batches[0].id),39);
 assert.equal(await scalar(db,'select record_id from farm_evidence where id=$1',[photo.id]),death.id);
 console.log('PASS batch stock: persisted sale, exact fish pricing, one deduction, retry conflict, batch correction and original-batch void');
}catch(error){console.error(error.message);process.exitCode=1;}finally{await db.close();}
