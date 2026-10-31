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
