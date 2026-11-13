import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {managerDatabase,ids,scalar,periodWrite,asRole} from '../tests/helpers/manager-db.mjs';

const db=await managerDatabase();
const actor=randomUUID(),date='2026-11-09',prior='2026-11-08';
const farm=(who,kind,payload,request=randomUUID(),op='create',reason=null)=>scalar(db,'select farm_v2_write($1,$2,$3,$4::jsonb,null,$5,$6)',[who,kind,op,JSON.stringify(payload),reason,request]);
const decision=(who,id,payload,retry=randomUUID())=>scalar(db,'select operations_pending_expense_write($1,$2,$3::jsonb,$4)',[who,id,JSON.stringify({business:'farm',action:'post',reason:'Checked actual payment on the expense date',expected_revision:0,...payload}),retry]);
const dated=(who,period,asOf)=>scalar(db,'select operations_cash_summary($1,\'farm\',$2,$3,$3,0,1)',[who,period,asOf]);
const facts=id=>scalar(db,"select to_jsonb(e)-array['revision','resolved_by','resolved_at','resolution_reason','payer_account_id','posted_record_id','status'] from manager_pending_expenses e where e.id=$1",[id]);
const sale=(period,saleDate,amount,who=ids.admin)=>farm(who,'sale',{date:saleDate,manager_period_id:period,product:'other',other_product_name:'Recorded produce',quantity:1,pricing_basis:'per_unit',unit_price:amount,cash_receiver:{type:'self'}});
try {
 await periodWrite(db,ids.admin,'activate');
 await db.query('insert into auth.users(id) values($1)',[actor]);
 await db.query("insert into profiles(id,role,name) values($1,'manager','Assigned supervisor')",[actor]);
 const {id:period}=await periodWrite(db,ids.admin,'provision',{manager_id:actor,business:'farm',starts_on:prior});
 await db.query("update manager_periods set status='active' where id=$1",[period]);

 const payload={date,category:'labor',amount:1000,expense_source:'bimbo_transfer',payment_method:'cash',notes:'Paid for work'};
 const submitted=await farm(actor,'expense',payload);assert.equal(submitted.status,'pending_funding');
 const original=await facts(submitted.id);
 // Receipts after the expense date cannot fund the earlier payment.
 await sale(period,'2026-11-11',3000);
 const atDate=await dated(ids.admin,period,date);
 assert.equal(atDate.business,'farm');assert.equal(atDate.periodId,period);assert.equal(atDate.from,date);assert.equal(atDate.to,date);
 const source=atDate.sources.find(x=>x.holder_type==='ceo'&&x.bucket==='sales');assert.ok(source);assert.equal(Number(source.available),0);
 assert.ok(!atDate.sources.some(x=>x.bucket==='owner'&&Number(x.available)>0));
 const confirmed={payer_account_id:source.id,funding_source:'sales'};
 let result=await decision(ids.admin,submitted.id,confirmed);assert.equal(result.status,'pending_funding');
 assert.equal(await scalar(db,'select count(*)::int from farm_expenses'),0);
 await sale(period,prior,1000);
 const pool=await dated(ids.admin,period,date);assert.equal(Number(pool.sources.find(x=>x.id===source.id).available),1000);
 const otherActor=randomUUID();
 await db.query('insert into auth.users(id) values($1)',[otherActor]);
 await db.query("insert into profiles(id,role,name) values($1,'manager','Different supervisor')",[otherActor]);
 const {id:otherPeriod}=await periodWrite(db,ids.admin,'provision',{manager_id:otherActor,business:'farm',starts_on:prior});
 await db.query("update manager_periods set status='active' where id=$1",[otherPeriod]);
 await sale(otherPeriod,prior,5000,otherActor);
 const otherManager=await scalar(db,"select id from operations_cash_accounts where period_id=$1 and holder_type='manager' and bucket='sales'",[otherPeriod]);
 assert.equal(Number(await scalar(db,'select operations_private.cash_available($1,$2)',[otherManager,date])),5000);
 await assert.rejects(()=>decision(ids.admin,submitted.id,{...confirmed,payer_account_id:otherManager}),e=>e.code==='42501'&&/different supervisor period/.test(e.message));
 assert.equal(await scalar(db,'select count(*)::int from farm_expenses'),0);
 await assert.rejects(()=>decision(ids.admin,submitted.id,{payer_account_id:source.id}),e=>e.code==='42501');
 await assert.rejects(()=>decision(ids.admin,submitted.id,{...confirmed,funding_source:'owner'}),e=>e.code==='42501');
 await assert.rejects(()=>decision(ids.admin,submitted.id,{...confirmed,funding_source:'bad'}),e=>e.code==='22023');
 await assert.rejects(()=>decision(actor,submitted.id,confirmed),e=>e.code==='42501');
 await assert.rejects(()=>asRole(db,'authenticated',actor,()=>decision(ids.admin,submitted.id,confirmed)),e=>e.code==='42501');
 await assert.rejects(()=>decision(ids.admin,submitted.id,{...confirmed,expected_revision:1}),e=>e.code==='40001');
 await assert.rejects(()=>decision(ids.admin,submitted.id,{...confirmed,reason:''}),e=>e.code==='22023');
 await farm(actor,'day',{date},randomUUID(),'close');
 const retry=randomUUID();result=await decision(ids.admin,submitted.id,confirmed,retry);
 assert.equal(result.status,'posted');assert.equal(result.pending_id,submitted.id);assert.equal(result.data.expense_source,'sales_cash');
 assert.deepEqual(await decision(ids.admin,submitted.id,confirmed,retry),result);
 assert.deepEqual(await facts(submitted.id),original);
 const checked=await scalar(db,"select to_jsonb(e) from operations_cash_events e where resource='farm_expenses' and record_id=$1",[result.data.id]);
 assert.equal(checked.bucket,'sales');assert.equal(checked.source_account_id,source.id);assert.equal(checked.event_date,date);assert.equal(checked.period_id,period);
 assert.equal(await scalar(db,'select count(*)::int from farm_expenses'),1);
 assert.equal(await scalar(db,'select count(*)::int from manager_pending_decisions where pending_id=$1',[submitted.id]),1);
 assert.equal(await scalar(db,"select after_value->>'verified_funding_source' from manager_pending_decisions where pending_id=$1",[submitted.id]),'sales');
 assert.equal(Number((await dated(ids.admin,period,date)).sources.find(x=>x.id===source.id).available),0);
 await assert.rejects(()=>decision(ids.admin,submitted.id,{...confirmed,funding_source:'owner'},retry),e=>e.code==='23514');
 await assert.rejects(()=>decision(ids.admin,submitted.id,confirmed),e=>e.code==='40001');

 // Feed retains its existing owner-funds rule. Leaving the decision pending does not move stock.
 const feed=await farm(actor,'feed',{date:'2026-11-10',feed_type:'fish',feed_source:'local',weight_unit:'kg',weight_amount:10,num_bags:1,cost:1000,delivery_received:false});
 assert.equal(feed.status,'pending_funding');
 await assert.rejects(()=>decision(ids.admin,feed.id,confirmed),e=>e.code==='22023');
 assert.equal(await scalar(db,'select count(*)::int from farm_feed_purchases'),0);
 assert.equal(await scalar(db,"select count(*)::int from operations_cash_events where cash_kind='spend'"),1);

 // An actual owner contribution can cover a direct MD payment, once, using the normal transfer workflow.
 const nextDate='2026-11-10',ownerRequest=await farm(actor,'expense',{...payload,date:nextDate});
 assert.equal(ownerRequest.status,'pending_funding');
 const fundingKey=randomUUID(),ownerFunding={business:'farm',currency:'NGN',date:nextDate,amount:'1000',recipient:{type:'ceo'},confirmed_receipt:true};
 const countTransfers=()=>scalar(db,'select count(*)::int from farm_fund_transfers');
 const transfersBefore=await countTransfers();
 const transfer=()=>scalar(db,"select operations_cash_write($1,'fund',$2::jsonb,$3::uuid)",[ids.admin,JSON.stringify(ownerFunding),fundingKey]);
 const actualFunding=await transfer();assert.equal(actualFunding.status,'posted');
 assert.deepEqual(await transfer(),actualFunding);assert.equal(await countTransfers(),transfersBefore+1);
 const ownerAccount=actualFunding.data.target_account_id;
 const recorded=await decision(ids.admin,ownerRequest.id,{payer_account_id:ownerAccount});
 assert.equal(recorded.status,'posted');assert.equal(recorded.data.expense_source,'bimbo_transfer');
 assert.equal(Number((await dated(ids.admin,period,nextDate)).sources.find(x=>x.id===ownerAccount).available),0);
 assert.equal(await countTransfers(),transfersBefore+1);
 // The supervisor for this expense can legitimately be the actual payer, including a source change.
 const managerRequest=await farm(actor,'expense',{...payload,date:nextDate});
 assert.equal(managerRequest.status,'pending_funding');
 await sale(period,nextDate,1000,actor);
 const owned=await scalar(db,"select id from operations_cash_accounts where period_id=$1 and holder_type='manager' and bucket='sales'",[period]);
 const scoped=await dated(ids.admin,period,nextDate);
 assert.ok(scoped.accounts.some(x=>x.id===owned&&x.period_id===period));
 assert.ok(!scoped.accounts.some(x=>x.id===otherManager));
 const fromManager=await decision(ids.admin,managerRequest.id,{...confirmed,payer_account_id:owned});
 assert.equal(fromManager.status,'posted');assert.equal(fromManager.data.expense_source,'sales_cash');
 assert.equal(Number(await scalar(db,'select operations_private.cash_available($1,$2)',[otherManager,nextDate])),5000);
 console.log('PASS pending expense: original-date funds, explicit changed source and actual payer, direct MD funding, original payload, paired posted expense/custody, closed day, roles, audit, same-ID replay and feed fence');
} finally{await db.close();}
