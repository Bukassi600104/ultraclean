import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';
const id='00000000-0000-4000-8000-000000000001';
const scope={actorId:'admin',periodId:id,business:'farm'},from='2026-11-01',to='2026-11-11',date='2026-11-09';
const records={
 farm_sales:[{date,product:'other',egg_batch_id:id,other_product_name:'Eggs',invoice_id:id,total_amount_exact:'100000.00',quantity:200,unit_price:500,customer_name:'=1+1'},{date,product:'goat',total_amount_exact:'50.00',quantity:1},{date:'2026-10-01',total_amount_exact:'9000'},{date,voided_at:date,total_amount:'999'}],
 farm_expenses:[{date,amount:'5.20',paid_to:'=2+2',item_name:'Isolated pump',category:'equipment'}],
 farm_feed_purchases:[{date,cost:'10.10',feed_type:'fish'}],
 farm_purchase_payments:[{date,amount_exact:'5.05',category:'feed',recipient:'Supplier'},{date,amount_exact:'0.50',category:'repair',recipient:'Technician'},{date,amount:'12',voided_at:date}],
 farm_customer_receipts:[{id,date,amount_exact:'40000.00'}],farm_customer_refunds:[{receipt_id:id,date,amount_exact:'2.00'}],farm_credit_notes:[{invoice_id:id,date,amount_exact:'10.50'}],
};
let reads=0,allowed=true;
const data={asOf:'2026-11-11T17:00:00Z',report:{scope,manager:{name:'Isolated manager'},from,to,records,assets:{},farm:{}},credit:{invoices:[{id,number:'PF-TEST',customer_name:'=1+1'}],receipts:[{id,customer_name:'=1+1'}]}};
const load=typescriptLoader({'server-only':{},'@/lib/supabase/server':{createServerClient:()=>null},'@/lib/farm-control':{getFarmControl:async(s,f,t)=>{reads++;assert.deepEqual(s,scope);assert.equal(f,from);assert.equal(t,to);return data;}},
 '@/lib/manager-read-api':{requestManagerScope:async(req,b,adminOnly)=>{assert.equal(b,'farm');assert.equal(adminOnly,true);assert.equal(new URL(req.url).searchParams.get('period_id'),id);if(!allowed)throw Error('Forbidden');return scope;},managerReadError:()=>Response.json({}, {status:403})}});
const route=load('app/api/farm/control/export/route.ts');
const download=async kind=>route.GET(new Request('https://isolated.invalid/export?from='+from+'&to='+to+'&period_id='+id+'&report='+kind));
for(const [kind,totalKey,total] of [['sales','Revenue after credits','100039.50'],['expenditure','Total expenditure','20.85'],['revenue','Net collections','40048.00']]){
 const response=await download(kind);assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),new RegExp(kind+'-'+from+'-'+to));assert.match(response.headers.get('cache-control'),/private, no-store/);
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
 const summary=new Map();workbook.getWorksheet('Summary').eachRow(row=>summary.set(row.getCell(1).value,row.getCell(2).value));assert.equal(summary.get(totalKey),total);assert.equal(summary.get("Reporting scope"),"Manager period · Isolated manager");assert.equal(summary.has("Account ID"),false);assert.equal(summary.has("Manager"),false);
 const sheet=workbook.getWorksheet(kind==='expenditure'?'Paid expenses':'Sales');
 assert.equal(sheet.actualRowCount,kind==='expenditure'?5:3);const cells=sheet.getRow(2).values;
 assert.ok(cells.includes(kind==='expenditure'?'=2+2':'=1+1'));
 sheet.eachRow(row=>row.eachCell(cell=>assert.notEqual(cell.type,ExcelJS.ValueType.Formula)));
 if(kind!=='expenditure')assert.ok(cells.includes('Eggs'));
}
const {farmExportScope}=load('lib/farm-financial-download.ts');
assert.equal(farmExportScope({...data.report,scope:{...scope,periodId:null},manager:null}),'Whole farm');
assert.equal(farmExportScope({...data.report,manager:null}),'Selected manager period');
const {calculateFarmFinance}=load('lib/farm-finance-calculations.ts');
const breakdown=calculateFarmFinance({transfers:[],expenses:[],feed:[],sales:[
 {date:'2026-10-25',product:'other',invoice_id:'prior',egg_batch_id:'batch',total_amount:'150'},
 {date,product:'other',invoice_id:id,egg_batch_id:'batch',total_amount:'100'},
 {date,product:'other',other_product_name:'Pump',invoice_id:'unrelated',total_amount:'20'}
],credits:[{date,product:'other',invoice_id:'prior',amount:'25'},{date,product:'other',invoice_id:'unrelated',amount:'10'}]},{date:to,from,to});
assert.deepEqual(breakdown.sales_by_product,[{name:'eggs',value:75},{name:'other',value:10}]);
assert.equal(breakdown.revenue,85);
const count=reads;assert.equal((await download('invalid')).status,400);allowed=false;assert.equal((await download('sales')).status,403);assert.equal(count,reads);
console.log('PASS three private scoped XLSX downloads, dates, exact reconciled totals, literal text cells, invalid kind and admin gate');
