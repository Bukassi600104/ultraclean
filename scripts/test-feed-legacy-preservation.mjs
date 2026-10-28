import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {managerDatabase,ids,scalar} from '../tests/helpers/manager-db.mjs';
const db=await managerDatabase({through:'20261028131020_manager_handover.sql'});
try{
 await scalar(db,"select farm_v2_write($1,'daily_feed','create','{\"date\":\"2026-10-20\",\"feed_type\":\"fish\",\"feed_source\":\"local\",\"num_bags\":2,\"notes\":\"Original feeding entry\"}')",[ids.farm]);
 const before=await scalar(db,"select jsonb_agg(to_jsonb(t) order by id)::text from farm_daily_feed t");
 const users=await scalar(db,"select jsonb_agg(to_jsonb(t) order by id)::text from profiles t");
 await db.exec(await readFile(new URL('../supabase/migrations/20261028140421_manager_feed_activity.sql',import.meta.url),'utf8'));
 assert.equal(await scalar(db,"select jsonb_agg(to_jsonb(t) order by id)::text from farm_daily_feed t"),before);
 assert.equal(await scalar(db,"select jsonb_agg(to_jsonb(t) order by id)::text from profiles t"),users);
 assert.equal(await scalar(db,"select data_type from information_schema.columns where table_schema='public' and table_name='farm_daily_feed' and column_name='num_bags'"),'numeric');
 assert.equal(await scalar(db,"select data_type from information_schema.columns where table_schema='public' and table_name='farm_feed_stock' and column_name='current_bags'"),'integer');
 assert.equal(await scalar(db,"select count(*)::int from farm_feed_activities"),0);
 console.log('PASS 5 legacy feeding preservation checks: original full-row JSON and profiles identical; only feeding precision widened; unopened counts remain integers');
}finally{await db.close();}
