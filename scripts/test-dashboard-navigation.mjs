import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),mod={exports:{}};
new Function('module','exports',ts.transpileModule(readFileSync('lib/dashboard-navigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod,mod.exports);
const {dashboardBackLink,isDashboardDestinationActive}=mod.exports;
const {operationalBackLink}=mod.exports;
assert.equal(typeof operationalBackLink,'function','Operational pages need deterministic parent links');
for(const prefix of ['', '/manager']) {
 for(const page of ['sales','expenses','daily-report','operational-requests','inventory','daily-feed','feed-stock','stock','mortality','supplies','records','cash'])assert.equal(operationalBackLink(prefix+'/'+page,'manager').href,prefix||'/');
 for(const [page,parent]of [['sales/catfish','sales'],['expenses/feed','expenses'],['daily-report/history','daily-report']])assert.equal(operationalBackLink(prefix+'/'+page,'manager').href,prefix+'/'+parent);
 assert.equal(operationalBackLink(prefix||'/','manager'),null);assert.equal(operationalBackLink(prefix+'/login','manager'),null);
}
for(const app of ['property','content']) {assert.equal(operationalBackLink('/'+app,app),null);assert.equal(operationalBackLink('/'+app+'/login',app),null);assert.equal(operationalBackLink('/'+app+'/history',app).href,'/'+app);}
assert.equal(dashboardBackLink('/dashboard'),null);
assert.equal(dashboardBackLink('/dashboard/farm/control').href,'/dashboard');assert.equal(dashboardBackLink('/dashboard/farm').href,'/dashboard/farm/control');
for(const route of ['appointments','leads','blog','courses','dba','managers','settings','ultratidy','properties','content'])assert.equal(dashboardBackLink('/dashboard/'+route).href,'/dashboard');
for(const route of ['sales','expenses','inventory','supplies','feed-stock','daily-feed','daily-reports','operational-requests'])assert.equal(dashboardBackLink('/dashboard/farm/'+route).href,'/dashboard/farm/control');
for(const route of ['inflow','expenses','inventory'])assert.equal(dashboardBackLink('/dashboard/ultratidy/'+route).href,'/dashboard/ultratidy');
for(const route of ['products','sales'])assert.equal(dashboardBackLink('/dashboard/dba/'+route).href,'/dashboard/dba');
for(const route of ['new','edit/abc']){assert.equal(dashboardBackLink('/dashboard/blog/'+route).href,'/dashboard/blog');assert.equal(dashboardBackLink('/dashboard/dba/products/'+route).href,'/dashboard/dba/products');}
assert.equal(dashboardBackLink('/dashboard/leads/abc').href,'/dashboard/leads');
const destinations=['/dashboard','/dashboard/farm','/dashboard/farm/supplies','/dashboard/farm/feed-stock','/dashboard/farm/daily-reports','/dashboard/farm/operational-requests'];
for(const route of destinations)assert.deepEqual(destinations.filter(href=>isDashboardDestinationActive(route,href,destinations)),[route]);
console.log('PASS 27 dashboard parent routes, home and single active destination');

const farmDestinations=["/dashboard","/dashboard/farm/control","/dashboard/farm/supplies"];
for(const route of ["sales","expenses","inventory","today","configuration","support"])assert.deepEqual(farmDestinations.filter(href=>isDashboardDestinationActive("/dashboard/farm/"+route,href,farmDestinations)),["/dashboard/farm/control"]);

const {farmPerformanceBackLink}=mod.exports;
const filters={from:'2026-10-01',to:'2026-11-10',period_id:'period',site_id:'site',batch_id:'batch'};
for(const [page,destination] of [['/dashboard/farm/today','/dashboard/farm/performance'],['/manager/today','/manager/performance'],['/today','/performance']]){
 const query=new URLSearchParams({...filters,return_to:destination,date:'2026-11-09'}),back=farmPerformanceBackLink(page,query.toString()),url=new URL(back.href,'https://example.invalid');
 assert.equal(back.label,'Back to Batch Performance');assert.equal(url.pathname,destination);assert.deepEqual(Object.fromEntries(url.searchParams),filters);
 for(const invalid of ['https://evil.invalid/performance','//evil.invalid/performance','javascript:alert(1)','/dashboard/farm/performance?x=1','/dashboard/farm/performance#x','/manager/../performance','/property','/performance/','\\evil.invalid'])assert.equal(farmPerformanceBackLink(page,new URLSearchParams({return_to:invalid}).toString()),null);
}
assert.equal(farmPerformanceBackLink('/dashboard/farm/today','return_to=/manager/performance'),null);
assert.equal(farmPerformanceBackLink('/manager/today','return_to=/dashboard/farm/performance'),null);
assert.equal(farmPerformanceBackLink('/dashboard/farm/health','return_to=/dashboard/farm/performance'),null);
assert.equal(farmPerformanceBackLink('/manager/today',''),null);
console.log('PASS performance return links preserve scope and reject external, cross-role and unrelated destinations');
