import assert from 'node:assert/strict';
import {managerDatabase,ids,scalar,periodWrite,asRole} from '../tests/helpers/manager-db.mjs';
const farm='ca7d7137-72dc-4cbc-848d-beb56d951344',emmanuel='a1e4ad6e-a565-4330-ae4c-3a0bc92081d1',db=await managerDatabase({legacyManagers:[{id:farm,name:'Farm Manager'},{id:emmanuel,name:'Emmanuel Adeolu'}]});
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++},snapshot=(actor,target)=>scalar(db,'select manager_legacy_export_snapshot($1,$2)',[actor,target]);
try{
 // All source fixtures are isolated, before feature activation, and never seed runtime data.
 await db.query("insert into farm_sales(date,product,quantity,unit_price,total_amount,created_by) select '2026-10-01','other',1,.01,.01,$1 from generate_series(1,501)",[farm]);
 const sale=await scalar(db,'select id from farm_sales order by id limit 1');
 await db.query("update farm_sales set voided_at=now(),voided_by=$1,void_reason='Saved historical void' where id=$2",[ids.admin,sale]);
 await db.query("insert into farm_expenses(date,category,amount,created_by,notes) values('2026-10-01','equipment',9007199254740993.12345,$1,'=HYPERLINK(\"https://example.invalid\",\"literal only\")')",[farm]);
 await db.query("insert into farm_fund_transfers(date,amount,created_by) values('2026-10-01',1000000,$1)",[ids.admin]);
 await db.query("insert into farm_sales(date,product,quantity,unit_price,total_amount,created_by) values('2026-10-01','other',1,99,99,$1),('2026-10-01','other',1,7,7,null)",[ids.farm]);
 await db.query("insert into farm_activity(record_type,record_id,operation,actor_id,reason,before_value,after_value) values('sale',$1,'update',$2,'Saved administrative correction','{}','{}')",[sale,ids.admin]);
 const sourceHash=()=>scalar(db,"select md5(string_agg(value::text,',' order by value::text)) from (select to_jsonb(t) value from farm_sales t union all select to_jsonb(t) from farm_expenses t union all select to_jsonb(t) from farm_fund_transfers t union all select to_jsonb(t) from profiles t) t");
 await periodWrite(db,ids.admin,'activate');const before=await sourceHash(),a=await snapshot(ids.admin,farm),own=await snapshot(farm,farm);
 eq(a.target.id,farm);eq(a.sheets.find(s=>s.name==='Sales').rows.length,501);eq(a.sheets.find(s=>s.name==='Owner transfers').rows.length,0);eq(a.sheets.find(s=>s.name==='Activity history').rows.length,1);eq(a.sheets.find(s=>s.name==='Expenses').rows[0].amount_exact,'9007199254740993.12345');
 assert.match(a.sheets.find(s=>s.name==='Expenses').rows[0]._source_json,/9007199254740993\.12345/);checks++;
 eq(own.sheets,a.sheets);eq(await sourceHash(),before);eq(a.summary['Active sales · NGN'],'5.00');eq(a.summary['General expenses · NGN'],'9007199254740993.12345');assert.match(a.attributionNotes.join(' '),/recipient|opening cash/i);checks++;
 // Starting another period does not erase this eligible account's earlier export history.
 const previous=await scalar(db,'select id from manager_periods where manager_id=$1 and ended_at is null',[farm]);await periodWrite(db,ids.admin,'close',{period_id:previous,reason:'Isolated explicit lifecycle check'});const next=await periodWrite(db,ids.admin,'provision',{manager_id:farm,business:'farm',starts_on:'2026-10-01'});await db.query("update manager_periods set status='active' where id=$1",[next.id]);
 await db.query("select set_config('operations.actor',$1,false),set_config('operations.period',$2,false)",[farm,next.id]);
 await db.query("insert into farm_sales(date,product,quantity,unit_price,total_amount,created_by) values('2026-10-02','other',1,12,12,$1)",[farm]);
 eq((await snapshot(farm,farm)).sheets.find(s=>s.name==='Sales').rows.length,502);
 await db.exec("select set_config('operations.actor','',false),set_config('operations.period','',false)");
 const empty=await snapshot(ids.admin,emmanuel);eq(empty.sheets.filter(s=>s.name!=='Periods').reduce((n,s)=>n+s.rows.length,0),0);eq(empty.sheets.find(s=>s.name==='Periods').rows.length,1);
 for(const [actor,target]of [[ids.admin,ids.farm],[ids.farm,farm],[farm,emmanuel],[ids.property,farm],[ids.suspended,farm]]){await assert.rejects(()=>snapshot(actor,target),e=>e.code==='42501');checks++;}
 await db.query('update profiles set suspended=true where id=$1',[emmanuel]);await assert.rejects(()=>snapshot(emmanuel,emmanuel),e=>e.code==='42501');checks++;eq((await snapshot(ids.admin,emmanuel)).target.id,emmanuel);
 await assert.rejects(()=>asRole(db,'authenticated',farm,()=>snapshot(farm,farm)),e=>e.code==='42501');checks++;
 // Export itself never changes the source; compare around the final read after intentional fixtures/lifecycle changes.
 const finalBefore=await sourceHash();await snapshot(ids.admin,farm);eq(await sourceHash(),finalBefore);assert.notEqual(before,finalBefore);checks++;
 console.log('PASS '+checks+' export database checks: two-ID boundary, complete account history, related admin corrections, literal exact source, empty Emmanuel, no unallocated transfers or source mutations');
}finally{await db.close();}
