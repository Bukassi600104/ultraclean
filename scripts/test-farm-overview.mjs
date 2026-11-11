import assert from 'node:assert/strict';
import { managerDatabase, ids, scalar, periodWrite, asRole } from '../tests/helpers/manager-db.mjs';
import { typescriptLoader } from '../tests/helpers/load-typescript.mjs';

const db=await managerDatabase();
try {
  await db.exec("insert into farm_inventory(product,current_stock) values ('catfish',150),('goat',3)");
  await periodWrite(db,ids.admin,'activate');
  const today=await scalar(db,"select ((now() at time zone 'Africa/Lagos')::date)::text");
  const supervisor=crypto.randomUUID();
  await db.query('insert into auth.users(id) values($1)',[supervisor]);
  await db.query("insert into profiles(id,role,name) values($1,'manager','Isolated supervisor')",[supervisor]);
  const own=await periodWrite(db,ids.admin,'provision',{business:'farm',manager_id:supervisor,starts_on:today});
  await db.query("update manager_periods set status='active' where id=$1",[own.id]);
  const old=await scalar(db,"select id from manager_periods where manager_id=$1 and business='farm'",[ids.farm]);
  const args=[supervisor,own.id,today], sql='select farm_supervisor_overview_read($1::uuid,$2::uuid,$3::date)';
  const original=await scalar(db,"select md5(jsonb_agg(to_jsonb(t) order by t.id)::text) from farm_inventory t");
  const staff=await asRole(db,'service_role',supervisor,()=>scalar(db,sql,args));
  assert.deepEqual(staff.report.assets.farm_inventory,[]);
  await assert.rejects(()=>scalar(db,sql,[supervisor,old,today]),e=>e.code==='42501');
  for(const role of ['anon','authenticated'])await assert.rejects(()=>asRole(db,role,supervisor,()=>scalar(db,sql,args)),e=>e.code==='42501');
  let actor=supervisor;
  const client={rpc:async(name,params)=>{
    try{
      const data=name==='manager_context'?await scalar(db,'select manager_context($1,$2,$3)',[params.p_actor,params.p_business,params.p_period_id]):
        await scalar(db,sql,[params.p_actor,params.p_period,params.p_today]);
      return {data,error:null};
    }catch(error){return {data:null,error};}
  }};
  const load=typescriptLoader({'@/lib/supabase/server':{createServerClient:()=>client},'@/lib/auth':{requireManager:async()=>({id:actor,role:actor===ids.admin?'admin':'manager'})}});
  const overviewRoute=load('app/api/farm/overview/route.ts');
  const request=(suffix='')=>overviewRoute.GET(new Request('http://local/api/farm/overview'+suffix));
  const personal=await request();assert.equal(personal.status,200);assert.match(personal.headers.get('cache-control'),/private.*no-store/);
  assert.deepEqual((await personal.json()).overview.produce,[]);
  assert.equal((await request('?period_id='+old)).status,403);
  actor=ids.admin;
  const whole=await (await request()).json();assert.deepEqual(whole.overview.produce.map(p=>[p.label,p.amount]),[['Catfish',150],['Goat',3]]);
  assert.equal(whole.overview.sales,0);assert.equal(whole.overview.debt,'0');assert.deepEqual(Object.keys(whole).sort(),['alerts','overview']);
  const {farmOverview}=load('lib/farm-overview.ts'),{summarizeManagerSnapshot}=load('lib/manager-reports.ts');
  const stock=await scalar(db,sql,[ids.admin,null,today]),report=summarizeManagerSnapshot(stock.report);
  stock.currentPerformance.batches=[{id:'batch',product:'catfish',name:'Isolated Pond',head_count:'20'},{id:'pig',product:'pig',name:'Isolated Sty',head_count:'12'}];
  stock.stores.assets=[{resource:'feed',label:'fish (local)',quantity:0},{resource:'feed',label:'goat (local)',quantity:null},{resource:'eggs',quantity:10,opening_verified:false}];
  report.records.farm_feed_purchases=[{feed_type:'fish',feed_source:'local',date:today,num_bags:200}];
  report.records.farm_daily_feed=[{feed_type:'fish',feed_source:'foreign',date:today,num_bags:3}];
  stock.purchases.purchases=[{id:'order',request_id:'paired',status:'pending',total_exact:'25.50'}];
  report.decisions.operational_requests=[{id:'paired',status:'pending'},{id:'request',status:'pending'},{id:'cancelled',status:'cancelled'}];
  report.records.farm_inventory_transactions=[
    {id:'m1',product:'catfish',action:'mortality',date:today,quantity:3},
    {id:'undo',correction_of:'m1',correction_role:'reversal',action:'add',date:today},
    {id:'m2',product:'catfish',action:'mortality',date:today,quantity:2},
  ];
  const result=farmOverview({...stock,report,today,owed:'50.20',newerFeed:[{feed_type:'pig',feed_source:'local',date:today}],dailyReports:[{id:'log',report_date:today,status:'submitted',sections:{template_version:3,area:'farm1_pond2'}},{id:'draft',report_date:today,status:'draft'}]});
  assert.equal(result.produce.find(p=>p.label==='Catfish').amount,150,'Category stock already contains its batch');
  assert.equal(result.produce.find(p=>p.label==='Pig').amount,12,'Assigned batch without a category grant remains visible');
  assert.equal(result.produce.find(p=>p.label==='Eggs in store').amount,null);
  assert.deepEqual(result.feed.map(r=>[r.label,r.amount]),[['fish (foreign)',null],['fish (local)',0],['goat (local)',null],['pig (local)',null]]);
  assert.equal(result.debt,'50.20');
  assert.equal(result.requestCount,1);assert.equal(result.purchaseCount,1);assert.equal(result.purchaseAmount,'25.50');
  assert.equal(result.mortality.total,2);assert.deepEqual(result.dailyReports.map(r=>r.area),['farm1_pond2']);
  const {farmAlerts}=load('lib/farm-summary.ts');
  const reportExpense=(id,extra={})=>({id,date:today,supplier:'Isolated electrician',amount_exact:'4500.00',resolution:null,...extra});
  stock.purchases.exceptions=[reportExpense('new'),reportExpense('approved',{approval:{category:'labor'}}),reportExpense('funding',{funding_status:'pending',pending_funding_id:'linked'}),reportExpense('closed',{resolution:{decision:'link'}})];
  report.cash.pending_expenses=[{id:'linked',status:'pending',shortfall:'4500',currency:'NGN',activity_date:today},{id:'unrelated',status:'pending',shortfall:'10',currency:'NGN',activity_date:today}];
  const alerts=farmAlerts({...stock,report,config:null,currentCredit:stock.credit});
  assert.deepEqual(alerts.filter(a=>a.href.includes('#expense-')).map(a=>[a.id,a.title]).sort(),[['approved','Confirm expense funding'],['funding','Confirm expense funding'],['new','Review reported expense']]);
  const supervisorAlerts = farmAlerts({...stock,report,config:null,currentCredit:stock.credit},true);
  assert.equal(supervisorAlerts.find(a=>a.id==='new').title,'Awaiting expense approval');
  assert.equal(supervisorAlerts.find(a=>a.id==='funding').title,'Awaiting funding confirmation');
  assert.ok(alerts.some(a=>a.id==='unrelated'));assert.ok(!alerts.some(a=>a.id==='linked'||a.id==='closed'));
  assert.equal(await scalar(db,"select md5(jsonb_agg(to_jsonb(t) order by t.id)::text) from farm_inventory t"),original);
  console.log('PASS scoped read-only overview SQL and API, service-only grant, manager isolation, current product/feed quantities, linked requests, corrected deaths and daily area logs');
} finally { await db.close(); }
