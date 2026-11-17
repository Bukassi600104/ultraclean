import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {managerDatabase,ids,periodWrite,scalar} from '../tests/helpers/manager-db.mjs';

const db=await managerDatabase();
const manager=randomUUID();
const write=(actor,operation,payload,id=null,key=randomUUID())=>
  scalar(db,'select farm_credit_write($1,$2,$3::jsonb,$4,$5)',[actor,operation,JSON.stringify(payload),id,key]);
const report=(actor,period,date)=>scalar(db,'select farm_credit_read($1,$2,$3)',[actor,period,date]);
const rowCounts=()=>scalar(db,`select jsonb_build_array(
  (select count(*) from farm_sales),(select count(*) from farm_inventory_transactions),
  (select count(*) from farm_customer_receipts),(select count(*) from operations_cash_events),
  (select count(*) from farm_customer_terms))`);
const fails=(action,code)=>assert.rejects(action,e=>e.code===code);
try{
  await periodWrite(db,ids.admin,'activate');
  await db.query('insert into auth.users(id) values($1)',[manager]);
  await db.query("insert into profiles(id,role,name) values($1,'manager','Supervisor')",[manager]);
  const period=await periodWrite(db,ids.admin,'provision',{manager_id:manager,business:'farm',starts_on:'2026-10-28'});
  await db.query("update manager_periods set status='active' where id=$1",[period.id]);
  const customer=await write(manager,'customer',{name:'Earlier balance customer'});
  const opening={date:'2026-11-05',customer_id:customer.id,amount:'80.50',reference:'Paper ledger 18'};
  const before=await rowCounts(),key=randomUUID();
  await fails(()=>write(ids.farm,'opening_balance',opening),'42501');
  await fails(()=>write(manager,'opening_balance',{...opening,date:'2026-10-27'}),'42501');
  await fails(()=>write(manager,'opening_balance',{...opening,amount:'0'}),'22023');
  await fails(()=>write(manager,'opening_balance',{...opening,reference:' '}),'22023');
  const initial=await write(manager,'opening_balance',opening,null,key);
  assert.deepEqual(await write(manager,'opening_balance',opening,null,key),initial);
  await fails(()=>write(manager,'opening_balance',{...opening,amount:'81'},null,key),'23514');
  await fails(()=>write(ids.admin,'opening_balance',{...opening,reference:' paper LEDGER 18 '}),'23514');
  assert.deepEqual(await rowCounts(),before,'Entering earlier debt cannot create cash, revenue, stock or credit terms');
  assert.equal((await report(manager,period.id,'2026-11-04')).invoices.length,0);
  for(const [actor,scope] of [[manager,period.id],[ids.admin,null]]){
    const data=await report(actor,scope,opening.date),[entry]=data.invoices;
    assert.equal(data.invoices.length,1);assert.equal(entry.kind,'opening_balance');assert.equal(entry.reference,opening.reference);
    assert.equal(entry.sale_id,null);assert.equal(entry.due_date,null);assert.equal(entry.overdue_days,0);
    assert.equal(data.summary.owed,'80.50');assert.equal(Number(data.summary.collected),0);assert.equal(Number(data.summary.revenue),0);
  }
  const sale={date:'2026-11-06',customer_id:customer.id,credit:true,
    sale:{product:'other',other_product_name:'Produce',quantity:2,unit_price:25,pricing_basis:'per_unit'}};
  await fails(()=>write(manager,'invoice',sale),'23514');
  await write(ids.admin,'terms',{days:14,reason:'Approved for this test'},customer.id);
  const invoice=await write(manager,'invoice',sale);
  await fails(()=>write(manager,'opening_balance',{...opening,reference:invoice.number}),'23514');
  const payment={customer_id:customer.id,date:'2026-11-07',amount:'90.50',amount_owing:'40.00',cash_receiver:{type:'farm_destination',destination:'primefield_account'}};
  await fails(()=>write(manager,'receipt',{...payment,amount_owing:'41'}),'40001');
  const receiptKey=randomUUID(),receipt=await write(manager,'receipt',payment,null,receiptKey);
  assert.deepEqual(await write(manager,'receipt',payment,null,receiptKey),receipt);
  const paid=await report(ids.admin,null,payment.date);
  assert.equal(paid.receipts.length,1);
  const allocation=new Map(paid.receipts[0].allocations.map(a=>[a.invoice_id,Number(a.amount)]));
  assert.equal(allocation.get(initial.id),80.50);assert.equal(allocation.get(invoice.id),10);
  assert.equal(Number(paid.summary.owed),40);assert.equal(Number(paid.summary.revenue),50);assert.equal(Number(paid.summary.collected),90.50);
  assert.equal(Number((await report(manager,period.id,'2026-11-06')).summary.owed),130.50);
  await fails(()=>write(manager,'opening_balance',{...opening,reference:'Another source'}),'23514');
  await fails(()=>write(manager,'void_opening_balance',{reason:'Incorrect entry'},initial.id),'42501');
  await fails(()=>write(ids.admin,'void_opening_balance',{reason:'Check payment first'},initial.id),'23514');
  await fails(()=>write(ids.admin,'credit_note',{date:payment.date,amount:'10',reason:'This is an earlier balance'},initial.id),'23514');
  await write(ids.admin,'void_receipt',{reason:'Isolated reversal of the receipt'},receipt.id);
  assert.equal(Number((await report(ids.admin,null,payment.date)).summary.owed),130.50);
  const reverseKey=randomUUID(),reason={reason:'Original paper balance had already been entered elsewhere'};
  const reversed=await write(ids.admin,'void_opening_balance',reason,initial.id,reverseKey);
  assert.deepEqual(await write(ids.admin,'void_opening_balance',reason,initial.id,reverseKey),reversed);
  await fails(()=>write(ids.admin,'void_opening_balance',reason,initial.id),'40001');
  const final=await report(ids.admin,null,payment.date),old=final.invoices.find(i=>i.id===initial.id);
  assert.ok(old.voided_at);assert.equal(old.reference,opening.reference);assert.equal(Number(old.total),80.50);assert.equal(Number(old.owed),0);
  assert.equal(Number(final.summary.revenue),50);assert.equal(Number(final.summary.owed),50);assert.equal(Number(final.summary.collected),0);
  assert.equal(await scalar(db,"select count(*)::int from farm_operation_events where record_id=$1 and operation in ('opening_balance','void_opening_balance')",[initial.id]),2);
  console.log('PASS earlier debt, allocated and reversed payments, both roles, duplicates, credit terms, dated balances and original sales figures');
}finally{await db.close();}
