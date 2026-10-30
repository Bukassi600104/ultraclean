import assert from 'node:assert/strict';import {load} from './load-pure-typescript.mjs';
const {batchPerformance}=load('lib/farm-batch-performance.ts');
const data={from:'2026-10-28',to:'2026-10-30',batches:[{id:'b',name:'Actual layers',product:'chicken',site_name:'Site',head_count:'10',laying_hens:true}],records:[{id:'r',batch_id:'b',date:'2026-10-30',feed_kg:2,eggs:8,head_count:'10',feed_cost_estimate:null,sample_weight_kg:4,sample_count:2}],sales:[{id:'s',date:'2026-10-30',batch_id:'b',amount:'1000'}],expenses:[{id:'e',date:'2026-10-30',batch_id:'b',amount:'100'}],feed:[{id:'f',date:'2026-10-30',amount:'300'}],payments:[{id:'p',date:'2026-10-30',amount:'200',allocations:[{batch_id:'b',amount:'50'}]}],credits:[],deaths:[]};
const result=batchPerformance(data);
assert.equal(Number(result.pool.expenses),600);assert.equal(Number(result.pool.allocated_expenses),150);assert.equal(Number(result.pool.unallocated_expenses),450);
assert.equal(result.batches[0].trend[0].lay_rate,80);assert.equal(result.batches[0].sample_average_kg,2);assert.equal(result.batches[0].feed_cost_estimate,null);assert.equal(result.batches[0].feed_conversion_estimate,null);
assert.equal(Number(result.batches[0].recorded_result),850,'Consumed-feed estimate is not another paid expense');
const unknown=batchPerformance({...data,batches:[{...data.batches[0],laying_hens:false}],records:[{...data.records[0],eggs:null,feed_kg:null}]});assert.equal(unknown.batches[0].trend[0].lay_rate,null);assert.equal(unknown.batches[0].feed_kg,null);
console.log('PASS batch cost-pool reconciliation, species denominators, actual sample weights and honest missing measurements');

const growth={...data,batches:[{...data.batches[0],laying_hens:false,movement_dates:[]}],records:[{...data.records[0],id:'start',date:'2026-10-28',sample_weight_kg:2,sample_count:1,feed_kg:5},{...data.records[0],id:'middle',date:'2026-10-29',sample_weight_kg:null,sample_count:null,feed_kg:5},{...data.records[0],id:'end',date:'2026-10-30',sample_weight_kg:3,sample_count:1,feed_kg:5}]};
assert.equal(batchPerformance(growth).batches[0].feed_conversion_estimate,1);
assert.equal(batchPerformance({...growth,batches:[{...growth.batches[0],movement_dates:['2026-10-29']}]}).batches[0].feed_conversion_estimate,null);
console.log('PASS measured feed conversion requires a complete window and unchanged population');
