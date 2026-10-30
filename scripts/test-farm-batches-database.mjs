import assert from 'node:assert/strict';
import {managerDatabase, ids, scalar, periodWrite, asRole} from '../tests/helpers/manager-db.mjs';
const db = await managerDatabase();
const write = (actor, operation, payload, retry = crypto.randomUUID()) => scalar(db,
  'select farm_batch_write($1::uuid,$2,$3::jsonb,$4::uuid)', [actor, operation, JSON.stringify(payload), retry]);
try {
  assert.ok(await scalar(db, "select to_regprocedure('farm_batch_write(uuid,text,jsonb,uuid)')"), 'Guarded batch writer must exist');
  await db.exec("insert into farm_inventory(product,current_stock) values('catfish',40)");
  const before = await scalar(db, 'select jsonb_agg(to_jsonb(t) order by id) from farm_inventory t');
  await periodWrite(db, ids.admin, 'activate');
  const site = await write(ids.admin, 'site', {name:'Test site'});
  const first = await write(ids.admin, 'batch', {site_id:site.id,name:'Pond A',product:'catfish',kind:'pond'});
  const second = await write(ids.admin, 'batch', {site_id:site.id,name:'Pond B',product:'catfish',kind:'pond'});
  assert.notEqual(first.id, second.id);
  const retry = crypto.randomUUID();
  const payload = {batch_id:first.id,quantity:30,date:'2026-10-30',reason:'Verified physical count'};
  const allocated = await write(ids.admin, 'allocate', payload, retry);
  assert.deepEqual(await write(ids.admin, 'allocate', payload, retry), allocated);
  await assert.rejects(() => write(ids.admin, 'allocate', {...payload,quantity:31}, retry));
  await assert.rejects(() => write(ids.admin, 'allocate', {...payload,batch_id:second.id,quantity:11}));
  await write(ids.admin, 'allocate', {...payload,batch_id:second.id,quantity:10});
  await write(ids.admin, 'transfer', {...payload,to_batch_id:second.id,quantity:5});
  assert.equal(await scalar(db, 'select sum(quantity)::int from farm_batch_movements where batch_id=$1',[first.id]),25);
  assert.equal(await scalar(db, 'select sum(quantity)::int from farm_batch_movements where batch_id=$1',[second.id]),15);
  await assert.rejects(()=>scalar(db,"select farm_v2_write($1,'inventory_transaction','create',$2::jsonb,null,null,$3)",[ids.admin,JSON.stringify({product:'catfish',action:'mortality',quantity:1,date:'2026-10-30'}),crypto.randomUUID()]),e=>e.code==='23514','Unbatched depletion must not consume assigned batch stock');
  assert.deepEqual(await scalar(db, 'select jsonb_agg(to_jsonb(t) order by id) from farm_inventory t'),before);
  assert.equal(await scalar(db, 'select count(*)::int from farm_inventory_transactions'),0);
  await assert.rejects(() => write(ids.farm, 'site', {name:'Forbidden'}), e => e.code==='42501');
  assert.equal(await asRole(db,'authenticated',ids.farm,()=>scalar(db,'select count(*)::int from farm_batches')),0);
  const managers=['00000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000082'];
  const periods=[];
  for (const manager of managers) {
    await db.query('insert into auth.users(id) values($1)',[manager]);
    await db.query("insert into profiles(id,role,name) values($1,'manager','Synthetic batch manager')",[manager]);
    periods.push(await periodWrite(db,ids.admin,'provision',{manager_id:manager,business:'farm',starts_on:'2026-10-30'}));
  }
  await periodWrite(db,ids.admin,'assign',{period_id:periods[0].id,assets:[{resource:'farm_batches',record_id:first.id}]});
  await periodWrite(db,ids.admin,'assign',{period_id:periods[1].id,assets:[{resource:'farm_batches',record_id:second.id}]});
  for (let i=0;i<2;i++) {
    const handover=await scalar(db,"select handover_write($1,'get')",[managers[i]]);
    const items=handover.steps.flatMap(s=>s.items);
    assert.deepEqual(items.map(item=>item.recordId),[i===0?first.id:second.id],'Only explicitly assigned batch is offered for confirmation');
    const result=await scalar(db,"select handover_write($1,'finalize',$2,$3::jsonb,$4)",[managers[i],handover.sessionId,JSON.stringify(items.map(item=>({itemId:item.itemId,version:item.version,status:'confirmed'}))),crypto.randomUUID()]);
    assert.equal(result.status,'active');
    const visible=await asRole(db,'authenticated',managers[i],()=>scalar(db,'select array_agg(id) from farm_batches'));
    assert.deepEqual(visible,[i===0?first.id:second.id]);
  }
  const revoke={period_id:periods[0].id,assets:[{resource:'farm_batches',record_id:first.id}],reason:'Responsibility ended',request_id:crypto.randomUUID()};
  await periodWrite(db,ids.admin,'unassign',revoke);
  await periodWrite(db,ids.admin,'unassign',revoke);
  assert.equal(await asRole(db,'authenticated',managers[0],()=>scalar(db,'select count(*)::int from farm_batches')),0);
  assert.equal(await scalar(db,'select count(*)::int from manager_asset_assignments where period_id=$1',[periods[0].id]),1,'Assignment history retained');
  assert.equal(await scalar(db,"select count(*)::int from farm_activity where record_type='batch_assignment' and operation='unassign'"),1,'Retry does not duplicate audit');
  await periodWrite(db,ids.admin,'assign',{...revoke,reason:'Responsibility resumed',request_id:crypto.randomUUID()});
  assert.equal(await asRole(db,'authenticated',managers[0],()=>scalar(db,'select count(*)::int from farm_batches')),1);
  assert.deepEqual(await scalar(db, 'select jsonb_agg(to_jsonb(t) order by id) from farm_inventory t'),before);
  await assert.rejects(() => asRole(db,'authenticated',ids.farm,()=>write(ids.admin,'site',{name:'Spoofed'})),e=>e.code==='42501');
  console.log('PASS named batches: separate identities, exact allocations, zero-total transfers, retries, permissions and unchanged legacy inventory');
} catch(error) { console.error(error.message);process.exitCode=1; } finally { await db.close(); }
