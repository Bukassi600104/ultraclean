import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite,asRole} from '../tests/helpers/manager-db.mjs';

const db=await managerDatabase();
let checks=0;
const eq=(actual,expected)=>{assert.deepEqual(actual,expected);checks++};
const write=(actor,operation,payload)=>scalar(db,
  'select operations_cash_write($1,$2,$3::jsonb,$4::uuid)',
  [actor,operation,JSON.stringify({business:'farm',currency:'NGN',...payload}),crypto.randomUUID()]);
const statement=(actor,{period=null,from='2026-10-28',to='2026-10-30',page=0,limit=20,account=null}={})=>
  scalar(db,"select operations_cash_statement($1,'farm',$2,$3,$4,$5,$6,$7)",[actor,period,from,to,page,limit,account]);
const addSupervisor=async(id,name)=>{
  await db.query('insert into auth.users(id) values($1)',[id]);
  await db.query("insert into profiles(id,role,name) values($1,'manager',$2)",[id,name]);
  const period=await periodWrite(db,ids.admin,'provision',{manager_id:id,business:'farm',starts_on:'2026-10-26'});
  await db.query("update manager_periods set status='active' where id=$1",[period.id]);
  return period.id;
};

try{
  await periodWrite(db,ids.admin,'activate');
  const manager='00000000-0000-4000-8000-000000000082';
  const other='00000000-0000-4000-8000-000000000083';
  const managerPeriod=await addSupervisor(manager,'First supervisor');
  const otherPeriod=await addSupervisor(other,'Second supervisor');
  const direct=await write(ids.admin,'fund',{date:'2026-10-26',amount:'300',recipient:{type:'manager',period_id:managerPeriod}});
  const first=await write(manager,'receive',{event_id:direct.data.id,date:'2026-10-27',amount:'100'});
  const second=await write(manager,'receive',{event_id:direct.data.id,date:'2026-10-29',amount:'200'});
  const carried=await write(ids.admin,'fund',{date:'2026-10-26',amount:'15.25',recipient:{type:'manager',period_id:managerPeriod}});
  const privateFund=await write(ids.admin,'fund',{date:'2026-10-27',amount:'45',recipient:{type:'manager',period_id:otherPeriod}});
  const privateReceipt=await write(other,'receive',{event_id:privateFund.data.id,date:'2026-10-27',amount:'45'});
  const handoff=await write(ids.admin,'handoff',{date:'2026-10-30',amount:'25',source_account_id:first.data.target_account_id,recipient:{type:'manager',period_id:otherPeriod}});

  const waiting='00000000-0000-4000-8000-000000000084';
  const waitingPeriod=await addSupervisor(waiting,'Awaiting handover');
  await db.query("update manager_periods set status='awaiting_handover' where id=$1",[waitingPeriod]);
  eq((await statement(waiting)).accounts,[]);
  const before=await scalar(db,'select count(*)::int from operations_cash_postings');
  const historical=await statement(manager,{to:'2026-10-28'});
  const datedDispatch=historical.dispatches.find(row=>row.id===direct.data.target_account_id);
  eq([datedDispatch.sent,datedDispatch.received,datedDispatch.outstanding,datedDispatch.status],['300','100','200','partial']);
  eq([datedDispatch.sender,datedDispatch.recipient],['MD/Owner','First supervisor']);
  eq(historical.dispatches.find(row=>row.id===carried.data.target_account_id).status,'awaiting');
  eq(historical.movements.length,0);

  const personal=await statement(manager);
  eq(personal.accounts.map(row=>row.name),['First supervisor']);
  const holding=personal.balances[0];
  eq([holding.opening,holding.money_in,holding.money_out,holding.closing],['100','200','25','275']);
  const received=personal.movements.find(row=>row.id.startsWith(second.data.id));
  eq([received.sender,received.recipient,received.amount,received.balance],['MD/Owner','First supervisor','200','300']);
  const outgoing=personal.movements.find(row=>row.id.startsWith(handoff.data.id));
  eq([outgoing.sender,outgoing.recipient,outgoing.amount,outgoing.balance],['First supervisor','Second supervisor','-25','275']);
  eq(personal.dispatches.find(row=>row.id===direct.data.target_account_id).status,'received');
  eq(personal.dispatches.some(row=>row.id===privateFund.data.target_account_id),false);
  eq(personal.dispatches.some(row=>row.id===handoff.data.target_account_id),true);
  eq(personal.total,2);
  eq((await statement(manager,{limit:1,page:0})).movements.map(row=>row.balance),['275']);
  eq((await statement(manager,{limit:1,page:1})).movements.map(row=>row.balance),['300']);
  eq((await statement(manager,{limit:1,page:1})).dispatch_total,3);
  eq((await statement(manager,{limit:1,page:2})).movements.length,0);
  const otherData=await statement(other);
  eq(otherData.accounts.map(row=>row.name),['Second supervisor']);
  eq(otherData.dispatches.some(row=>row.id===handoff.data.target_account_id),true);
  eq(otherData.dispatches.some(row=>row.id===direct.data.target_account_id),false);
  await assert.rejects(()=>statement(manager,{account:privateReceipt.data.target_account_id}),e=>e.code==='42501');checks++;
  await assert.rejects(()=>statement(manager,{period:otherPeriod}),e=>e.code==='42501');checks++;
  await assert.rejects(()=>asRole(db,'authenticated',manager,()=>statement(ids.admin)),e=>e.code==='42501');checks++;
  eq(await scalar(db,'select count(*)::int from operations_cash_postings'),before);

  const procurement=await write(ids.admin,'fund',{date:'2026-10-28',amount:'12.34',recipient:{type:'custodian',name:'Procurement'},confirmed_receipt:true});
  const correction=await write(ids.admin,'correct',{id:procurement.data.id,date:'2026-10-29',amount:'10.12',reason:'Verified cash amount',expected_revision:0});
  const owner=await asRole(db,'service_role',null,()=>statement(ids.admin,{account:procurement.data.target_account_id}));
  eq(owner.total,3);
  eq(owner.balances.map(row=>[row.opening,row.money_in,row.money_out,row.closing]),[['0','22.46','12.34','10.12']]);
  const reversal=owner.movements.find(row=>row.phase==='reversal');
  eq([reversal.date,reversal.sender,reversal.recipient,reversal.amount,reversal.balance],['2026-10-28','Procurement','MD/Owner','-12.34','0.00']);
  const corrected=owner.movements.find(row=>row.id.startsWith(correction.data.id)&&row.phase==='effect');
  eq([corrected.date,corrected.amount,corrected.balance],['2026-10-29','10.12','10.12']);
  eq((await statement(ids.admin,{period:managerPeriod})).accounts.map(row=>row.name),['First supervisor']);
  const allOwner=await statement(ids.admin);
  eq(allOwner.dispatches.some(row=>row.id===privateFund.data.target_account_id),false);
  eq(allOwner.dispatches.some(row=>row.id===handoff.data.target_account_id),true);
  await assert.rejects(()=>statement(ids.admin,{from:'2026-10-31',to:'2026-10-30'}),e=>e.code==='22023');checks++;
  // Exercise the same posting helper as a real sale and a sales-funded expense.
  const businessEffect=(kind,row,payload)=>scalar(db,
    "select operations_private.business_cash_effect($1,'farm_v2_write',$2,'create',$3::jsonb,$4::jsonb,$5,null)",
    [manager,kind,JSON.stringify({id:crypto.randomUUID(),...row}),JSON.stringify(payload),managerPeriod]);
  await businessEffect('sale',{date:'2026-10-28',total_amount:'75.50'},{cash_receiver:{type:'self'}});
  await businessEffect('expense',{date:'2026-10-30',amount:'5.25',expense_source:'sales_cash'},{});
  const separated=await statement(manager);
  eq(separated.balances.map(row=>[row.bucket,Number(row.money_in),Number(row.money_out),Number(row.closing)]),
    [['owner',200,25,275],['sales',75.5,5.25,70.25]]);
  eq(separated.movements.filter(row=>row.bucket==='sales').map(row=>[row.kind,row.amount,row.balance]),
    [['spend','-5.25','70.25'],['inflow','75.50','75.50']]);
  console.log('PASS '+checks+' dated funds statement checks');
}finally{await db.close();}
