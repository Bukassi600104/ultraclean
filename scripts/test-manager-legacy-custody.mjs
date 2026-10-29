import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite} from '../tests/helpers/manager-db.mjs';
const db=await managerDatabase();let checks=0;
const cash=(actor,operation,payload)=>scalar(db,'select operations_cash_write($1,$2,$3::jsonb,$4::uuid)',[actor,operation,JSON.stringify(payload),crypto.randomUUID()]);
try{
 await periodWrite(db,ids.admin,'activate');
 for(const [actor,business,currency] of [[ids.farm,'farm','NGN'],[ids.property,'property','CAD'],[ids.content,'content','USD']]){
  const period=await scalar(db,'select id from manager_periods where manager_id=$1',[actor]);
  await assert.rejects(()=>cash(ids.admin,'fund',{business,currency,date:'2026-10-28',amount:'300000',recipient:{type:'manager',period_id:period}}),e=>e.code==='42501');checks++;
  const funding=await cash(ids.admin,'fund',{business,currency,date:'2026-10-28',amount:'300000',recipient:{type:'custodian',name:'Isolated prospective procurement'},confirmed_receipt:true});
  await assert.rejects(()=>cash(actor,'handoff',{business,currency,date:'2026-10-28',amount:'300000',source_account_id:funding.data.target_account_id}),e=>e.code==='42501');checks++;
  const summary=await scalar(db,'select operations_cash_summary($1,$2)',[ids.admin,business]);assert.equal(summary.manager_receivers.some(r=>r.period_id===period),false);checks++;
 }
 await assert.rejects(()=>scalar(db,"select farm_v2_write($1,'sale','create',$2::jsonb,null,null,$3::uuid)",[ids.farm,JSON.stringify({date:'2026-10-28',product:'other',other_product_name:'Isolated produce',quantity:1,unit_price:1,pricing_basis:'per_unit',cash_receiver:{type:'self'}}),crypto.randomUUID()]),e=>e.code==='42501');checks++;
 assert.equal(await scalar(db,'select count(*)::int from farm_sales'),0);checks++;
 assert.equal(await scalar(db,"select count(*)::int from operations_cash_accounts where holder_type in ('manager','awaiting')"),0);checks++;
 const legacy=await scalar(db,"select farm_v2_write($1,'expense','create','{\"date\":\"2026-10-28\",\"category\":\"labor\",\"amount\":300000}')",[ids.farm]);assert.equal(Number(legacy.amount),300000);checks++;
 console.log('PASS '+checks+' legacy custody boundaries: original spending remains legacy; new verified receipts require an explicit personal period in all three businesses');
}finally{await db.close();}
