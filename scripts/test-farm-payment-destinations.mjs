import assert from 'node:assert/strict';
import {ids,managerDatabase,periodWrite,scalar} from '../tests/helpers/manager-db.mjs';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';

const {cashReceiver,accountCashReceiver}=typescriptLoader()('lib/operations-cash-validation.ts');
const bank={type:'farm_destination',destination:'primefield_account'};
const sales={type:'farm_destination',destination:'sales_and_procurement'};
const supervisor=period_id=>({type:'farm_supervisor',period_id});
for(const party of [bank,sales,supervisor(ids.farm)]){
 assert.ok(cashReceiver.safeParse(party).success);
 assert.equal(accountCashReceiver.safeParse(party).success,false);
}
assert.equal(cashReceiver.safeParse({type:'farm_supervisor'}).success,false);
assert.equal(cashReceiver.safeParse({...bank,destination:'unknown'}).success,false);

const db=await managerDatabase();
const day='2026-11-09';
const read=(sql,params=[])=>scalar(db,sql,params);
const write=(actor,operation,payload,id=null,key=crypto.randomUUID())=>
 read('select farm_credit_write($1,$2,$3::jsonb,$4,$5)',[actor,operation,JSON.stringify(payload),id,key]);
const totals=()=>db.query('select (select count(*) from farm_customer_receipts) receipts,(select count(*) from operations_cash_events) events,(select count(*) from operations_cash_postings) postings').then(r=>r.rows[0]);
const summary=(actor,period=null,date=day,business='farm')=>read('select operations_cash_summary($1,$2,$3,$4,$4)',[actor,business,period,date]);
const savedTarget=id=>read("select to_jsonb(a) from operations_cash_events e join operations_cash_accounts a on a.id=e.target_account_id where e.resource='farm_customer_receipts' and e.record_id=$1 and e.operation='inflow'",[id]);
const balance=id=>read('select operations_private.cash_balance($1,$2)::text',[id,day]);
async function personal(name,startsOn){
 const manager=crypto.randomUUID();
 await db.query('insert into auth.users(id) values($1)',[manager]);
 await db.query("insert into profiles(id,role,name) values($1,'manager',$2)",[manager,name]);
 const period=await periodWrite(db,ids.admin,'provision',{manager_id:manager,business:'farm',starts_on:startsOn});
 await db.query("update manager_periods set status='active' where id=$1",[period.id]);
 return {manager,period:period.id};
}
try{
 await periodWrite(db,ids.admin,'activate');
 const current=await personal('On duty','2026-11-05');
 const other=await personal('Second location','2026-11-06');
 const prior=await personal('Earlier supervisor','2026-10-01');
 await db.query("update manager_periods set status='closed',ended_at='2026-11-04 23:30:00+00' where id=$1",[prior.period]);
 const pending=await personal('Awaiting handover','2026-11-01');
 await db.query("update manager_periods set status='awaiting_handover' where id=$1",[pending.period]);

 assert.deepEqual(new Set((await summary(ids.admin)).farm_supervisor_receivers.map(r=>r.period_id)),new Set([current.period,other.period]));
 assert.deepEqual((await summary(current.manager)).farm_supervisor_receivers,[{name:'On duty',period_id:current.period}]);
 assert.deepEqual((await summary(ids.admin,current.period)).farm_supervisor_receivers,[{name:'On duty',period_id:current.period}]);
 assert.deepEqual((await summary(ids.admin,null,'2026-11-04')).farm_supervisor_receivers,[{name:'Earlier supervisor',period_id:prior.period}]);
 assert.ok((await summary(ids.admin,null,'2026-11-05')).farm_supervisor_receivers.some(s=>s.period_id===prior.period));
 assert.equal((await summary(ids.admin,null,day,'property')).farm_supervisor_receivers,undefined);
 const legacy=await read("select id from manager_periods where manager_id=$1 and business='farm' and mode='legacy'",[ids.farm]);
 assert.deepEqual((await summary(ids.farm)).farm_supervisor_receivers,[]);
 assert.deepEqual((await summary(ids.admin,legacy)).farm_supervisor_receivers,[]);
 assert.deepEqual((await summary(ids.admin,null,'2026-09-01')).farm_supervisor_receivers,[]);
 assert.equal(await read("select count(*)::int from operations_cash_accounts where holder_type='custodian'"),0);
 const privileges=await db.query("select has_function_privilege(role,'operations_private.farm_payment_supervisors(uuid,uuid,date)','execute') allowed from unnest(array['anon','authenticated','service_role']) role");
 assert.ok(privileges.rows.every(r=>!r.allowed));

 const customer=await write(current.manager,'customer',{name:'Destinations fixture'});
 const receipt=(actor,party,amount,extra={},key)=>write(actor,'receipt',{date:day,customer_id:customer.id,amount,cash_receiver:party,...extra},null,key);
 const oldReceipt=await receipt(current.manager,{type:'ceo',profile_id:ids.admin},'10.00');
 const oldTarget=await savedTarget(oldReceipt.id);
 assert.equal(oldTarget.holder_type,'ceo');

 // Earlier named custody uses the same unique key. The next payment must reuse that account.
 const registered=await read("select operations_private.cash_account($1,'farm','NGN','sales','custodian','primefield account','Primefield Account')",[ids.admin]);
 const bankKey=crypto.randomUUID();
 const first=await receipt(current.manager,bank,'175.25',{},bankKey);
 assert.deepEqual(await receipt(current.manager,bank,'175.25',{},bankKey),first);
 assert.equal((await savedTarget(first.id)).id,registered);
 const second=await receipt(ids.admin,bank,'24.75');
 assert.equal((await savedTarget(second.id)).id,registered);
 assert.equal(Number(await balance(registered)),200);
 const department=await receipt(current.manager,sales,'31.85'),departmentAccount=await savedTarget(department.id);
 assert.equal(departmentAccount.name,'Sales and Procurement');
 assert.equal(departmentAccount.holder_type,'custodian');
 assert.equal(departmentAccount.period_id,null);
 assert.notEqual(departmentAccount.id,registered);
 assert.equal(await read("select count(*)::int from operations_cash_accounts where business='farm' and currency='NGN' and bucket='sales' and holder_type='custodian'"),2);
 const own=await receipt(current.manager,supervisor(current.period),'41.00');
 const onBehalf=await receipt(ids.admin,supervisor(current.period),'5.22');
 const personalAccount=await savedTarget(own.id);
 assert.equal(personalAccount.period_id,current.period);
 assert.equal(personalAccount.holder_type,'manager');
 assert.equal((await savedTarget(onBehalf.id)).id,personalAccount.id);
 assert.equal(Number(await balance(personalAccount.id)),46.22);

 const before=await totals();
 const denied=async(action,code='42501')=>assert.rejects(action,e=>e.code===code);
 await denied(()=>receipt(current.manager,supervisor(other.period),'1'));
 await denied(()=>receipt(ids.admin,supervisor(other.period),'1',{manager_period_id:current.period}));
 await denied(()=>receipt(ids.admin,supervisor(prior.period),'1'));
 await denied(()=>receipt(ids.admin,supervisor(pending.period),'1'));
 await denied(()=>receipt(ids.admin,{type:'farm_supervisor'},'1'));
 await denied(()=>receipt(ids.admin,{...bank,destination:'other'},'1'),'22023');
 await denied(()=>receipt(ids.admin,{...sales,account_id:registered},'1'),'22023');
 await denied(()=>receipt(current.manager,sales,'175.25',{},bankKey),'23514');
 const propertyRow={id:crypto.randomUUID(),currency:'CAD',payment_date:day,amount:1};
 await denied(()=>read("select operations_private.business_cash_effect($1,'property_write','rent_payment','create',$2::jsonb,$3::jsonb,null,null)",[ids.admin,JSON.stringify(propertyRow),JSON.stringify({cash_receiver:bank})]));
 assert.deepEqual(await totals(),before);

 const earlierCustomer=await write(ids.admin,'customer',{name:'Earlier customer'});
 const earlier=party=>write(ids.admin,'receipt',{date:'2026-11-04',customer_id:earlierCustomer.id,amount:'3.50',cash_receiver:party});
 await denied(()=>earlier(supervisor(current.period)));
 const historic=await earlier(supervisor(prior.period));
 assert.equal((await savedTarget(historic.id)).period_id,prior.period);
 const saleCustomer=await write(current.manager,'customer',{name:'Paid farm sale'});
 const invoice=await write(current.manager,'invoice',{date:day,customer_id:saleCustomer.id,credit:false,cash_receiver:bank,sale:{date:day,product:'other',other_product_name:'Produce',quantity:1,unit_price:65,pricing_basis:'per_unit'}});
 assert.equal(Number(await read('select operations_private.invoice_due($1)',[invoice.id])),0);
 assert.equal(Number(await balance(registered)),265);
 assert.equal(await read("select count(*)::int from operations_cash_events where resource='farm_sales' and record_id=$1",[invoice.sale_id]),0);
 const reversalKey=crypto.randomUUID();
 const reverse=()=>write(ids.admin,'void_receipt',{reason:'Private test of incorrect receipt'},first.id,reversalKey);
 const reversed=await reverse();
 assert.deepEqual(await reverse(),reversed);
 assert.equal(Number(await balance(registered)),89.75);
 assert.equal(Number(await balance(departmentAccount.id)),31.85);
 assert.equal(Number(await balance(oldTarget.id)),10);
 assert.deepEqual(await savedTarget(oldReceipt.id),oldTarget);

 const directSale=(actor,operation,payload,id=null,reason=null,key=crypto.randomUUID())=>
  read("select farm_v2_write($1,'sale',$2,$3::jsonb,$4,$5,$6)",[actor,operation,JSON.stringify(payload),id,reason,key]);
 const walkIn=await directSale(current.manager,'create',{date:day,product:'other',other_product_name:'Produce',quantity:1,unit_price:6.77,pricing_basis:'per_unit',cash_receiver:sales});
 assert.equal(Number(await balance(departmentAccount.id)),38.62);
 await directSale(ids.admin,'update',{expected_revision:0,cash_receiver:supervisor(current.period)},walkIn.id,'Checked who actually received the sale payment');
 assert.equal(Number(await balance(departmentAccount.id)),31.85);
 assert.equal(Number(await balance(personalAccount.id)),52.99);
 assert.equal(await read("select count(*)::int from operations_cash_events where resource='farm_sales' and record_id=$1",[walkIn.id]),2);

 const legacyCustomer=await write(ids.farm,'customer',{name:'Customer in an earlier operating period'});
 const legacyReceipt=party=>write(ids.farm,'receipt',{date:day,customer_id:legacyCustomer.id,amount:'2.50',cash_receiver:party});
 const beforeLegacy=await totals();
 await denied(()=>legacyReceipt(supervisor(legacy)));
 await denied(()=>legacyReceipt(supervisor(current.period)));
 await denied(()=>write(ids.admin,'receipt',{date:day,customer_id:legacyCustomer.id,amount:'2.50',cash_receiver:supervisor(legacy),manager_period_id:legacy}));
 assert.deepEqual(await totals(),beforeLegacy);
 for(const [party,target] of [[bank,registered],[sales,departmentAccount.id]]){
  const recorded=await legacyReceipt(party);
  assert.equal((await savedTarget(recorded.id)).id,target);
  assert.equal(recorded.actor_id,ids.farm);
 }
 assert.equal(await read("select count(*)::int from operations_cash_accounts where period_id=$1 and holder_type='manager'",[legacy]),0);
 const newStarter=await personal('Newly assigned supervisor',day);
 assert.deepEqual((await summary(ids.admin,newStarter.period)).farm_supervisor_receivers,[{name:'Newly assigned supervisor',period_id:newStarter.period}]);
 assert.deepEqual((await summary(ids.admin,newStarter.period,'2026-11-08')).farm_supervisor_receivers,[]);
 assert.equal(await read("select count(*)::int from operations_cash_accounts where period_id=$1",[newStarter.period]),0);
 await db.query('update profiles set suspended=true where id=any($1::uuid[])',[[prior.manager,newStarter.manager]]);
 assert.deepEqual((await summary(ids.admin,newStarter.period)).farm_supervisor_receivers,[]);
 assert.deepEqual((await summary(ids.admin,prior.period,'2026-11-04')).farm_supervisor_receivers,[]);
 assert.equal(await read('select count(*)::int from (select event_id from operations_cash_postings group by event_id having sum(amount)<>0) unbalanced'),0);
 console.log('PASS farm payment destinations, role and date selection, account reuse, prior receipts, duplicate submission, reversal, and balanced invoice collections');
}finally{await db.close();}
