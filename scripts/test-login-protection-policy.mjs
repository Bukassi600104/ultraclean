import assert from 'node:assert/strict';
import { load } from './load-pure-typescript.mjs';
const p = load('lib/login-protection-policy.ts');
const { protectionSubject } = load('lib/login-protection-identity.ts');
const minute=60000; let now=1_800_000, state=p.emptyAccountProtection();
assert.equal(p.LOGIN_PROTECTION_ACTIVE,false);
for(let cycle=0;cycle<4;cycle++) {
  for(let i=0;i<4;i++) { const result=p.accountPasswordAttempt(state,false,now+i); assert.equal(result.allowed,true);state=result.state; }
  let result=p.accountPasswordAttempt(state,false,now+4);state=result.state;
  assert.equal(result.allowed,false);assert.equal(result.shouldLogoutUser,false);
  assert.equal(result.retryAfterSeconds,[900,1800,3600,3600][cycle]);
  const until=state.blockedUntil;
  result=p.accountPasswordAttempt(state,true,now+5);assert.equal(result.allowed,false);assert.equal(result.state.blockedUntil,until);
  now=until; result=p.accountPasswordAttempt(state,true,now);state=result.state;
  assert.equal(result.allowed,true);assert.equal(state.failures.length,0);assert.equal(state.lockouts.length,cycle+1);
}
state=p.accountPasswordAttempt(state,false,now+24*60*minute).state;
assert.equal(state.lockouts.length,0);
state={failures:[now-15*minute,now-1],lockouts:[],blockedUntil:0};
assert.deepEqual(p.accountPasswordAttempt(state,false,now).state.failures,[now-1,now]);
let window={events:[],blockedUntil:0};
for(let i=0;i<20;i++) {const result=p.consumeWindow(window,now,20,minute);assert.equal(result.allowed,true);window=result.state;}
assert.equal(p.consumeWindow(window,now,20,minute).allowed,false);
assert.equal(p.consumeWindow(window,now+minute,20,minute).allowed,true);
for(const limit of [3,10]) {window={events:[],blockedUntil:0};for(let i=0;i<limit;i++)window=p.consumeWindow(window,now,limit,60*minute).state;assert.equal(p.consumeWindow(window,now,limit,60*minute).allowed,false);}
window={events:[],blockedUntil:0};
for(let i=0;i<49;i++){const result=p.recordIpFailure(window,now);assert.equal(result.allowed,true);window=result.state;}
const blocked=p.recordIpFailure(window,now);assert.equal(blocked.allowed,false);assert.equal(blocked.retryAfterSeconds,900);
assert.equal(p.recordIpFailure(blocked.state,now+100).state.blockedUntil,blocked.state.blockedUntil);
await assert.rejects(p.requireProtectionDecision(async()=>{throw Error('secret storage detail');}),/LOGIN_PROTECTION_UNAVAILABLE/);
await assert.rejects(p.requireProtectionDecision(async()=>({allowed:true,retryAfterSeconds:NaN})),/LOGIN_PROTECTION_UNAVAILABLE/);
const unlock={actorRole:'admin',actorSuspended:false,targetRole:'manager',reauthenticatedAt:now,now};
assert.equal(p.canUnlockStaff(unlock),true);
for(const override of [{targetRole:'admin'},{actorRole:'manager'},{actorSuspended:true},{reauthenticatedAt:now-300001},{reauthenticatedAt:now+1}])assert.equal(p.canUnlockStaff({...unlock,...override}),false);
const secret='x'.repeat(32);
assert.equal(protectionSubject('account',' USER@example.com ',secret),protectionSubject('account','user@example.com',secret));
assert.notEqual(protectionSubject('account','same',secret),protectionSubject('ip','same',secret));
assert.throws(()=>protectionSubject('account','x','short'),/UNAVAILABLE/);
console.log('PASS inactive login protection policy: thresholds, rolling windows, escalation, expiry, blocked timer, success, IP, recovery, fail closed, unlock eligibility and keyed identifiers. No database/auth calls.');
