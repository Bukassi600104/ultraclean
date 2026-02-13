const { Client } = require('pg');
const dns = require('dns');
const fs = require('fs');
const path = require('path');

// Force IPv6 resolution (Supabase DB host is IPv6-only)
dns.setDefaultResultOrder('verbatim');

async function main() {
  const client = new Client({
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.gsxqrjywtugeuexrjcln',
    password: process.env.SUPABASE_DB_PASSWORD || '',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });

  console.log('Connecting to Supabase Postgres...');
  await client.connect();
  console.log('Connected!\n');
  await runMigration(client);
}

async function runMigration(client) {
  console.log('\nRunning migration...');
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', 'full_migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await client.query(sql);
    console.log('Migration executed successfully!\n');
  } catch (err) {
    console.error('Migration error:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
  }

  // Verify tables
  const result = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log('Tables in public schema:');
  result.rows.forEach(r => console.log('  ✓ ' + r.table_name));

  // Check RLS
  const rls = await client.query(
    "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true"
  );
  console.log('\nRLS enabled on:');
  rls.rows.forEach(r => console.log('  ✓ ' + r.tablename));

  // Check triggers
  const triggers = await client.query(
    "SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public'"
  );
  console.log('\nTriggers:');
  triggers.rows.forEach(r => console.log('  ✓ ' + r.trigger_name + ' on ' + r.event_object_table));

  // Check functions
  const funcs = await client.query(
    "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'"
  );
  console.log('\nFunctions:');
  funcs.rows.forEach(r => console.log('  ✓ ' + r.routine_name));

  await client.end();
}

main();
