// Read-only production catalog/baseline capture. Never executes migrations.
import { readFileSync, writeFileSync } from 'node:fs';
const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const project = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
if (project !== 'gsxqrjywtugeuexrjcln') throw new Error('Unexpected configured project; stop and verify identity.');
const queries = {
  columns: `SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,is_generated,generation_expression FROM information_schema.columns WHERE table_schema='public' AND (table_name LIKE 'farm_%' OR table_name='profiles') ORDER BY table_name,ordinal_position`,
  constraints: `SELECT conrelid::regclass::text AS table_name,conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace AND conrelid::regclass::text LIKE 'farm_%'`,
  triggers: `SELECT c.relname AS table_name,pg_get_triggerdef(t.oid) AS definition,pg_get_functiondef(t.tgfoid) AS function FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='public'::regnamespace AND c.relname LIKE 'farm_%' AND NOT t.tgisinternal`,
  policies: `SELECT tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'farm_%'`,
  totals: `SELECT (SELECT sum(total_amount) FROM farm_sales) AS sales,(SELECT sum(amount) FROM farm_expenses) AS expenses,(SELECT sum(cost) FROM farm_feed_purchases) AS feed,(SELECT sum(amount) FROM farm_fund_transfers) AS transfers,(SELECT count(*) FROM farm_daily_records WHERE status='closed') AS closed_days`,
  inventory_quantities: `SELECT jsonb_object_agg(product,current_stock) AS quantities FROM farm_inventory`,
  supply_quantities: `SELECT jsonb_object_agg(id::text,current_quantity) AS quantities FROM farm_supply_inventory`,
};
const baseline = { project, captured_at: new Date().toISOString(), read_only: true };
async function read(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, read_only: true }),
  });
  if (!response.ok) throw new Error(`Read-only audit failed: HTTP ${response.status}`);
  return response.json();
}
for (const [key, sql] of Object.entries(queries)) baseline[key] = await read(sql);
baseline.fingerprints = [];
for (const table of [...new Set(baseline.columns.map(c => c.table_name))]) {
  if (!/^farm_[a-z_]+$|^profiles$/.test(table)) throw new Error('Unexpected table identifier');
  const rows = await read(`SELECT count(*) AS rows,md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY id),'')) AS fingerprint FROM public.${table} t`);
  baseline.fingerprints.push({ table, ...rows[0] });
}
const output = process.argv[2];
if (!output) throw new Error('Supply a private output path outside tracked files.');
writeFileSync(output, JSON.stringify(baseline, null, 2));
console.log(`Read-only baseline captured for ${project}: ${baseline.fingerprints.length} tables. Credentials and raw records excluded.`);
