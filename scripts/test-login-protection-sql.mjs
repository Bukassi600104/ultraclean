import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {managerDatabase,scalar,asRole,ids} from '../tests/helpers/manager-db.mjs';
// Synthetic PGlite only. Never reads environment connection strings or contacts Auth.
const db=await managerDatabase({through:'0'});
try {
 await db.exec('create role supabase_auth_admin');
 const original=await scalar(db,'select jsonb_agg(x) from (select * from profiles order by id)x');
 const sql=await readFile(new URL('../docs/security/login-protection-preparation.sql',import.meta.url),'utf8');
 await db.exec(sql.replace(/rollback;[^\n]*$/m,'commit;'));
 const hook=(valid,id=ids.farm)=>scalar(db,'select login_security.password_verification($1::jsonb)',[JSON.stringify({user_id:id,valid})]);
 for(let cycle=0;cycle<3;cycle++) {
  for(let n=0;n<4;n++) assert.equal((await hook(false)).decision,'continue');
  const result=await hook(false);assert.equal(result.decision,'reject');assert.equal(result.should_logout_user,false);
  const row=(await db.query("select *, extract(epoch from blocked_until-clock_timestamp()) seconds from login_security.subject_state where subject=$1",['user:'+ids.farm])).rows[0];
  assert.ok(row.seconds>[900,1800,3600][cycle]-10 && row.seconds<=[900,1800,3600][cycle]);
  await hook(true);assert.deepEqual(await scalar(db,'select blocked_until from login_security.subject_state where subject=$1',['user:'+ids.farm]),row.blocked_until);
  await db.query("update login_security.subject_state set blocked_until=clock_timestamp()-interval '1 second' where subject=$1",['user:'+ids.farm]);
  assert.equal((await hook(true)).decision,'continue');
  assert.equal(await scalar(db,'select cardinality(events) from login_security.subject_state where subject=$1',['user:'+ids.farm]),0);
  assert.equal(await scalar(db,'select cardinality(escalations) from login_security.subject_state where subject=$1',['user:'+ids.farm]),cycle+1);
 }
 assert.equal((await hook(true,ids.property)).decision,'continue');
 await db.query("update login_security.subject_state set events=array[clock_timestamp()-interval '16 minutes'],escalations=array[clock_timestamp()-interval '25 hours'] where subject=$1",['user:'+ids.farm]);
 await hook(false);assert.equal(await scalar(db,'select cardinality(events)+cardinality(escalations) from login_security.subject_state where subject=$1',['user:'+ids.farm]),1);
 const ip='a'.repeat(64),account='b'.repeat(64);
 const window=(prefix,max,seconds,block=0)=>scalar(db,'select login_security.consume_window($1,$2,$3,$4)',[prefix+':'+ip,max,seconds,block]);
 const attempts=await Promise.all(Array.from({length:24},()=>window('login-ip',20,60)));
 assert.equal(attempts.filter(x=>x.allowed).length,20);
 for(let n=0;n<49;n++)assert.equal((await window('failure-ip',50,900,900)).allowed,true);
 assert.equal((await window('failure-ip',50,900,900)).allowed,false);
 const until=await scalar(db,'select blocked_until from login_security.subject_state where subject=$1',['failure-ip:'+ip]);
 await window('failure-ip',50,900,900);assert.deepEqual(await scalar(db,'select blocked_until from login_security.subject_state where subject=$1',['failure-ip:'+ip]),until);
 const recovery=(a=account,i=ip)=>scalar(db,'select login_security.reserve_recovery($1,$2)',[a,i]);
 for(let n=0;n<3;n++)assert.equal((await recovery()).allowed,true);
 assert.equal((await recovery()).allowed,false);
 assert.equal(await scalar(db,'select cardinality(events) from login_security.subject_state where subject=$1',['recovery-ip:'+ip]),3);
 for(let n=0;n<7;n++)assert.equal((await recovery(n.toString(16).repeat(64))).allowed,true);
 const newAccount='e'.repeat(64);assert.equal((await recovery(newAccount)).allowed,false);
 assert.equal(await scalar(db,'select cardinality(events) from login_security.subject_state where subject=$1',['recovery-account:'+newAccount]),0);
 await db.exec("update login_security.subject_state set events=array[clock_timestamp()-interval '61 minutes'] where subject like 'recovery-%'");
 assert.equal((await recovery()).allowed,true);
 await assert.rejects(window('login-ip',50,900,900),/UNAVAILABLE/);
 for(const role of ['anon','authenticated','service_role'])await assert.rejects(asRole(db,role,ids.farm,()=>hook(false)),/permission denied/);
 await asRole(db,'supabase_auth_admin',null,async()=>assert.equal((await hook(true,ids.content)).decision,'continue'));
 await assert.rejects(asRole(db,'supabase_auth_admin',null,()=>db.query('select * from login_security.subject_state')),/permission denied/);
 assert.deepEqual(await scalar(db,'select jsonb_agg(x) from (select * from profiles order by id)x'),original);
 console.log('PASS isolated security SQL: syntax, hook grants/isolation, fifth-failure escalation, expiry, session flag, 20 IP reservations, 50 failures, paired recovery limits/expiry, unchanged profiles. PGlite serializes connections: not a multi-connection contention proof.');
} catch(error) {console.error(error.message);process.exitCode=1;} finally {await db.close();}
