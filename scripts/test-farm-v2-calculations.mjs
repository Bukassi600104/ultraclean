import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const ts=require('typescript');
function load(file){const module={exports:{}};new Function('module','exports',ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(module,module.exports);return module.exports;}
const {calculateFarmFinance}=load('lib/farm-finance-calculations.ts');
const {activeMortality}=load('lib/farm-inventory.ts');
const day='2026-10-03',prior='2026-10-02';
const totals=calculateFarmFinance({transfers:[{date:prior,amount:500000},{date:day,amount:100000},{date:day,amount:999999,voided_at:day}],expenses:[{date:prior,amount:20000,expense_source:null},{date:day,amount:10000,expense_source:'bimbo_transfer'},{date:day,amount:5000,expense_source:'sales_cash'}],feed:[{date:day,cost:30000}],sales:[{date:day,total_amount:216000},{date:day,total_amount:999999,voided_at:day}]},{date:day});
for(const [key,value] of Object.entries({opening_balance:480000,closing_balance:540000,sales_cash_balance:211000,net_position:751000,today_operational_net:171000,total_expenses:65000,feed_expenses:30000}))assert.equal(totals[key],value,key);
const many=calculateFarmFinance({transfers:[],expenses:Array.from({length:150},()=>({date:day,amount:1,expense_source:'bimbo_transfer'})),feed:[{date:day,cost:20}],sales:[]},{date:day});assert.equal(many.total_expenses,170);assert.equal(many.closing_balance,-170);
const scoped=calculateFarmFinance({transfers:[],expenses:[{date:prior,amount:10},{date:day,amount:5}],feed:[],sales:[]},{date:day,from:day,to:day});assert.equal(scoped.total_expenses,5);
const deaths=activeMortality([{id:'old',product:'catfish',action:'mortality',quantity:10},{id:'rev',product:'catfish',action:'add',quantity:10,correction_of:'old',correction_role:'reversal'},{id:'new',product:'catfish',action:'mortality',quantity:4,correction_of:'old',correction_role:'replacement'},{id:'unrelated',product:'goat',action:'remove',quantity:2}]);assert.deepEqual(deaths.map(d=>d.id),['new']);
console.log('PASS: 11 financial/mortality checks; complete totals, date scopes, legacy NULL sources, feed, voids, negative balances and mortality reversals.');
