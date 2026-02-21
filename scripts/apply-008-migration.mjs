/**
 * Script: apply-008-migration.mjs
 * Applies the appointments table migration to Supabase.
 * Uses the Supabase Management API (requires personal access token)
 * OR falls back to checking table existence via REST API.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=<your-token> node scripts/apply-008-migration.mjs
 *
 * Get your access token at: https://supabase.com/dashboard/account/tokens
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Read env vars ────────────────────────────────────────────────────────────
function readEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = readEnv();
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

// Extract project ref from URL: https://{ref}.supabase.co
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// ── Step 1: Check if appointments table already exists ────────────────────────
async function checkTableExists() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments?select=id&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  if (res.ok || res.status === 406) {
    // 406 = PostgREST "Not Acceptable" but table exists
    return true;
  }

  const body = await res.json().catch(() => ({}));
  // PostgREST returns 404 + "relation does not exist" when table is missing
  if (res.status === 404 || (body.message && body.message.includes('relation'))) {
    return false;
  }

  // Unexpected — assume exists to be safe
  console.warn('  ⚠ Unexpected response checking table:', res.status, JSON.stringify(body));
  return null;
}

// ── Step 2: Run migration via Management API ──────────────────────────────────
async function runMigrationViaManagementAPI(sql) {
  if (!ACCESS_TOKEN) {
    return { success: false, error: 'No SUPABASE_ACCESS_TOKEN provided' };
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const body = await res.json().catch(() => ({}));
  if (res.ok) return { success: true };
  return { success: false, error: body.message || JSON.stringify(body) };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Checking Supabase project:', PROJECT_REF);
  console.log('');

  // Check table existence
  process.stdout.write('Checking if appointments table exists... ');
  const exists = await checkTableExists();

  if (exists === true) {
    console.log('✅ Already exists! Nothing to do.');
    console.log('\nYou can proceed to Step 2 (create config Storage bucket).');
    return;
  }

  if (exists === false) {
    console.log('❌ Table does not exist — migration needed.');
  } else {
    console.log('⚠ Could not determine — attempting migration anyway.');
  }

  // Read migration SQL
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '008_create_appointments.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('');

  // Try Management API first
  if (ACCESS_TOKEN) {
    console.log('🚀 Running migration via Supabase Management API...');
    const result = await runMigrationViaManagementAPI(sql);
    if (result.success) {
      console.log('✅ Migration applied successfully!');
      console.log('');

      // Verify
      process.stdout.write('Verifying table was created... ');
      const nowExists = await checkTableExists();
      if (nowExists) {
        console.log('✅ Confirmed — appointments table is live.');
      } else {
        console.log('⚠ Could not verify. Check Supabase dashboard.');
      }
      return;
    } else {
      console.log('❌ Management API failed:', result.error);
    }
  }

  // Fallback: print instructions
  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log('  MANUAL STEP REQUIRED');
  console.log('══════════════════════════════════════════════════════');
  console.log('');
  console.log('Run the following SQL in the Supabase SQL Editor:');
  console.log(`👉 https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
  console.log('');
  console.log('─── SQL to paste ────────────────────────────────────');
  console.log(sql);
  console.log('─────────────────────────────────────────────────────');
  console.log('');
  console.log('After running it, re-run this script to verify:');
  console.log('  node scripts/apply-008-migration.mjs');
  console.log('');
  console.log('OR provide your Supabase access token to auto-apply:');
  console.log('  Get it at: https://supabase.com/dashboard/account/tokens');
  console.log('  SUPABASE_ACCESS_TOKEN=sbp_xxxx node scripts/apply-008-migration.mjs');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
