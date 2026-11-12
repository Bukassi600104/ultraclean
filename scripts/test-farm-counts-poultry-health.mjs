import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite,asRole} from '../tests/helpers/manager-db.mjs';

const db=await managerDatabase();
const date=await scalar(db,"select (now() at time zone 'Africa/Lagos')::date::text");
const json=value=>JSON.stringify(value);
const stores=actor=>scalar(db,'select farm_store_read($1,null,$2)',[actor,date]);
const store=(actor,op,payload,id=null,retry=crypto.randomUUID())=>scalar(db,'select farm_store_write($1,$2,$3::jsonb,$4,$5)',[actor,op,json(payload),id,retry]);
const health=(actor,payload,item=null,retry=crypto.randomUUID())=>scalar(db,"select farm_health_write($1,'note',$2::jsonb,$3,$4)",[actor,json(payload),item,retry]);
const reports=(actor,area,observations)=>scalar(db,'select farm_daily_report_submit($1,$2::jsonb,$3)',[actor,json({report_date:date,sections:{template_version:3,area,observations},decision_required:false}),crypto.randomUUID()]);
try{
  await periodWrite(db,ids.admin,'activate');
  const period=await scalar(db,"select id from manager_periods where manager_id=$1 and business='farm'",[ids.farm]);
  await scalar(db,"select farm_v2_write($1,'inventory_transaction','create',$2::jsonb,null,null,$3)",[ids.admin,json({date,product:'chicken',action:'add',quantity:9}),crypto.randomUUID()]);
  const id=await scalar(db,"select id from farm_inventory where product='chicken'");
  await periodWrite(db,ids.admin,'assign',{period_id:period,assets:[{resource:'farm_inventory',record_id:id}]});
  const count={resource:'animals',date,stock_id:id,quantity:3,unit:'animals'};
  await assert.rejects(()=>store(ids.farm,'count',{...count,quantity:0.5}),e=>e.code==='22023');
  const stock=async()=>Number(await scalar(db,'select current_stock from farm_inventory where id=$1',[id]));
  const before=await stock();
  const first=await store(ids.farm,'count',count),stale=await store(ids.farm,'count',{...count,quantity:0});
  assert.equal(await stock(),before);
  assert.equal((await stores(ids.farm)).animal_assets.find(a=>a.id===id).quantity,before);
  assert.equal((await stores(ids.admin)).counts.find(c=>c.id===first.id).quantity,3);
  assert.ok(!(await stores(ids.admin)).assets.some(a=>a.resource==='animals'),'Older store clients retain their original asset shape');
  await assert.rejects(()=>store(ids.farm,'decide_count',{decision:'approve',reason:'Unprivileged'},first.id));
  const retry=crypto.randomUUID(),decision={decision:'approve',reason:'Verified physical count'};
  const posted=await store(ids.admin,'decide_count',decision,first.id,retry);
  assert.deepEqual(await store(ids.admin,'decide_count',decision,first.id,retry),posted);
  assert.equal(await stock(),3);
  await assert.rejects(()=>store(ids.admin,'decide_count',decision,stale.id),e=>e.code==='40001');
  assert.equal((await stores(ids.admin)).animal_assets.find(a=>a.id===id).quantity,3);
  const zero=await store(ids.farm,'count',{...count,quantity:0});
  await store(ids.admin,'decide_count',decision,zero.id);assert.equal(await stock(),0);
  assert.equal((await stores(ids.farm)).counts.find(n=>n.id===zero.id).decision.decision,'approve');

  await assert.rejects(()=>reports(ids.farm,'poultry_a',{animal_count:1.5}),e=>e.code==='22023');
  await assert.rejects(()=>reports(ids.farm,'crops',{animal_count:2}),e=>e.code==='22023');
  const pen=await reports(ids.farm,'poultry_a',{animal_count:13,eggs:0,feed_kg:2.1});
  const pond=await reports(ids.farm,'farm1_pond1',{animal_count:9});
  for(const actor of [ids.farm,ids.admin]){
    const s=await stores(actor);
    assert.deepEqual(s.area_observations.find(r=>r.id===pen.id).observations,{animal_count:13,eggs:0,feed_kg:2.1});
    assert.equal(s.area_observations.find(r=>r.id===pond.id).observations.animal_count,9);
    assert.equal(s.egg_movements.length,0);
    const perf=await scalar(db,'select farm_performance_read($1,null,$2,$2)',[actor,date]);
    assert.deepEqual(perf.poultry_observations.map(r=>r.id),[pen.id]);
    assert.equal(perf.batches.length,0);
  }
  assert.equal(await stock(),0,'Pen and pond observations never post livestock or egg movements');

  const details={date,title:'Check the flock',area:'Pen A',details:'Supervisor counted birds at inspection',follow_up:date};
  const noteKey=crypto.randomUUID(),note=await health(ids.farm,details,null,noteKey);
  assert.deepEqual(await health(ids.farm,details,null,noteKey),note);
  for(const actor of [ids.farm,ids.admin]){
    const read=await scalar(db,'select farm_health_read($1,null,$2)',[actor,date]);
    assert.equal(read.notes[0].details,details.details);assert.equal(read.notes[0].period_id,period);
    assert.equal(read.tasks.length,0);assert.equal(read.completions.length,0);
  }
  await health(ids.admin,{...details,period_id:period,title:'MD follow-up'});
  assert.equal((await scalar(db,'select farm_health_read($1,null,$2)',[ids.farm,date])).notes.length,2);
  await assert.rejects(()=>health(ids.property,details));
  await assert.rejects(()=>health(ids.admin,details),e=>e.code==='42501');
  await assert.rejects(()=>health(ids.farm,{...details,period_id:crypto.randomUUID()}),e=>e.code==='42501');
  await assert.rejects(()=>asRole(db,'authenticated',ids.farm,()=>db.query('select * from farm_health_notes')));
  console.log('PASS species recount, stale and duplicate decisions, zero, no-batch pen observations and isolated health details.');
}finally{await db.close();}
