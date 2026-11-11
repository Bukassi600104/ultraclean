import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {typescriptLoader} from '../tests/helpers/load-typescript.mjs';

const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const deployed=spawnSync('git',['show','81b99425425684c7d35ca4f5a9ae1387005f70cc:components/manager/FarmOperations.tsx'],{encoding:'utf8'});
// Shallow checkouts retain the previous reader's six-section contract.
let render=sections=>['farm1','farm2','livestock','crops','people','problems'].flatMap(name=>Object.values(sections[name])).join('\n');
if(deployed.status===0){
 const source=deployed.stdout,groups=source.slice(source.indexOf('const groups ='),source.indexOf('const blankWater='));
 const component=source.slice(source.indexOf('export function ReportSummary'),source.indexOf('export function ReportFields'));
 const js=ts.transpileModule(groups+component,{fileName:'previous-report.tsx',compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const previous={exports:{}};
 new Function('require','exports',js)(require,previous.exports);
 render=sections=>renderToStaticMarkup(React.createElement(previous.exports.ReportSummary,{sections}));
}

const actor='80000000-0000-4000-8000-000000000001',id='80000000-0000-4000-8000-000000000002';
const area={id,manager_id:actor,manager:{id:actor,name:'Supervisor'},status:'submitted',revision:1,reviewed_by:null,
 sections:{template_version:3,area:'poultry_d',observations:{eggs:17,deaths:0,notes:'Nest checked'}}};
const original=structuredClone(area);let rows=[];
const load=typescriptLoader({
 '@/lib/auth':{requireManager:async()=>({id:actor,role:'admin'}),requireAdmin:async()=>({id:actor,role:'admin'})},
 '@/lib/manager-read-api':{managerReadResponse:async()=>Response.json({data:rows,total:rows.length})},
 '@/lib/manager-write-api':{withManagerWrite:(_r,_b,run)=>run(),managerRpc:async()=>({data:{...area,revision:2,reviewed_by:actor,review_note:'Checked'}})},
 '@/lib/supabase/server':{createServerClient:()=>({})},
});
const {reportSchema}=load('lib/farm-reports.ts');
const whole={...area,id:actor,sections:reportSchema.parse({report_date:'2026-11-10',sections:{people:{supervisor:'Earlier supervisor'}}}).sections};
rows=[area,whole];
const {GET}=load('app/api/farm/daily-reports/route.ts'),{PUT}=load('app/api/farm/daily-reports/[id]/route.ts');
const url='https://example.invalid/api/farm/daily-reports';
assert.throws(()=>render(area.sections));
const old=await GET(new Request(url+'?page=1'));
assert.match(old.headers.get('cache-control'),/no-store/);
const list=await old.json();assert.equal(list.total,2);assert.equal(list.data[0].id,id);assert.deepEqual(list.data[1],whole);
assert.equal(list.data[0].sections.problems.request_category,'');
for(const expected of ['Poultry · Pen D','Eggs collected: 17','Deaths observed: 0','Nest checked'])assert.ok(render(list.data[0].sections).includes(expected));
assert.ok(render(list.data[1].sections).includes('Earlier supervisor'));
const modern=await GET(new Request(url,{headers:{'X-Farm-Report-Format':'3'}}));
assert.deepEqual((await modern.json()).data[0].sections,area.sections);
const reviewRequest=new Request(url+'/'+id,{method:'PUT',headers:{'X-Request-ID':id},body:JSON.stringify({operation:'review',revision:1,reason:'Checked log',review_note:'Checked'})});
const reviewed=await (await PUT(reviewRequest,{params:{id}})).json();
assert.equal(reviewed.data.reviewed_by,actor);assert.ok(render(reviewed.data.sections).includes('Eggs collected: 17'));
assert.deepEqual(area,original);
console.log('PASS previous deployed renderer with a mixed daily-report page and a review response; current format, zero values and original data preserved');
