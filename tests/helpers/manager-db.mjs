import {readFile,readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
export const ids={admin:'00000000-0000-4000-8000-000000000001',farm:'00000000-0000-4000-8000-000000000002',property:'00000000-0000-4000-8000-000000000003',content:'00000000-0000-4000-8000-000000000004',suspended:'00000000-0000-4000-8000-000000000005'};
export async function managerDatabase({through,legacyManagers=[]}={}){
 const {PGlite}=await import(pathToFileURL(process.env.FARM_V2_PGLITE_PATH||path.join(os.tmpdir(),'primefield-v2-test-runtime/node_modules/@electric-sql/pglite/dist/index.js')));
 const db=new PGlite();await db.exec(await readFile(new URL('../fixtures/farm-v2-schema.sql',import.meta.url),'utf8'));
 await db.exec("alter table profiles add constraint profiles_role_check check(role in ('admin','manager'))");
 for(const [name,id]of Object.entries(ids)){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into profiles(id,role,name,suspended) values($1,$2,$3,$4)',[id,name==='admin'?'admin':'manager',name,name==='suspended']);}
 for(const {id,name}of legacyManagers){await db.query('insert into auth.users(id) values($1)',[id]);await db.query("insert into profiles(id,role,name) values($1,'manager',$2)",[id,name]);}
 const names=(await readdir(new URL('../../supabase/migrations/',import.meta.url))).filter(n=>n==='012_primefield_v2.sql'||n==='013_primefield_v2_write_boundary.sql'||/^2026\d{10}_/.test(n)).sort();
 for(const name of names){if(through&&name>through)break;await db.exec(await readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8'));}
 await db.query("update profiles set role='property_manager' where id=$1",[ids.property]);await db.query("update profiles set role='content_manager' where id=$1",[ids.content]);
 return db;
}
export const scalar=async(db,sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
export async function asRole(db,role,id,fn){await db.exec(`set role ${role}`);try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);return await fn();}finally{await db.exec('reset role');}}
export const periodWrite=(db,actor,operation,payload={})=>scalar(db,'select manager_period_write($1::uuid,$2,$3::jsonb)',[actor,operation,JSON.stringify(payload)]);
