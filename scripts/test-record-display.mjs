import assert from 'node:assert/strict';
import {load} from './load-pure-typescript.mjs';
const {displayFieldName,displayRecordValue,isInternalField,isTechnicalMessage}=load('lib/record-display.ts');
const {farmErrorResponse}=load('lib/farm-v2.ts');
const {cashError}=load('lib/operations-cash.ts');
const id='00000000-0000-4000-8000-000000000097';
assert.equal(displayRecordValue('Bimbo signed for the pens'),'Bimbo signed for the pens');
assert.equal((await farmErrorResponse({code:'42501',message:'Only Bimbo approves stock discrepancies'}).json()).error,'Only the MD/Owner approves stock discrepancies');
assert.equal((await cashError({code:'42501',message:'Bimbo must confirm the actual payer'}).json()).error,'The MD/Owner must confirm the actual payer');
assert.equal(displayRecordValue(id),'Linked record (name unavailable)');
assert.equal(displayRecordValue(0),'0');
assert.equal(displayRecordValue('250000.00'),'250000.00');
assert.equal(displayRecordValue(false),'No');
assert.equal(displayFieldName('expense_source'),'Paid from');
assert.equal(displayRecordValue('sales_cash'),'Sales money');
const details=displayRecordValue({id,item_name:'Feed scoop',current_quantity:0,unit:'pieces',actor_id:id,details:{request_id:id,amount:'250000.00'}});
assert.match(details,/Feed scoop/);assert.match(details,/250000\.00/);assert.doesNotMatch(details,/00000000|actor_id|request_id|[{}]/);
for(const key of ['id','record_id','evidence_ids','created_by','revision','fingerprint'])assert.ok(isInternalField(key));
for(const key of ['item_name','unit_price','amount','customer_name'])assert.ok(!isInternalField(key));
for(const [code,message,status] of [
 ['22P02',`invalid input syntax for type uuid: "${id}"`,400],
 ['23502','null value in column "manager_id" violates not-null constraint',400],
 ['23505','duplicate key value violates unique constraint "farm_request_key"',409],
 ['23514','new row violates check constraint "farm_sales_product_check"',409],
 ['42501','permission denied for relation farm_sales',403],
 ['500','private provider detail',500],
]){
 const response=farmErrorResponse({code,message});assert.equal(response.status,status);
 const body=await response.json();assert.equal(body.code,code);assert.ok(body.error);assert.equal(isTechnicalMessage(body.error),false);
 assert.doesNotMatch(body.error,/private provider|farm_sales|farm_request|manager_id/);
}
const businessMessage='This date is closed. Ask Bimbo to review the saved entry.';
const roleMessage='This date is closed. Ask the MD/Owner to review the saved entry.';
assert.equal((await farmErrorResponse({code:'23514',message:businessMessage}).json()).error,roleMessage);
assert.equal((await cashError({code:'23514',message:businessMessage}).json()).error,roleMessage);
for(const code of ['22P02','23505','42501']){
 const response=cashError({code,message:`invalid input syntax for type uuid: "${id}"`});
 assert.equal(response.status,code==='42501'?403:code==='23505'?409:400);
 assert.equal(isTechnicalMessage((await response.json()).error),false);
}
console.log('PASS readable record values and safe database errors; amounts and actionable business messages preserved.');

const {farmTimestamp}=load("lib/farm-products.ts");
assert.equal(farmTimestamp(null),"Not recorded");
assert.equal(farmTimestamp("invalid"),"Not recorded");
assert.equal(farmTimestamp("2026-11-08T23:30:00Z"),"9 Nov 2026, 00:30 (Nigeria time)");
