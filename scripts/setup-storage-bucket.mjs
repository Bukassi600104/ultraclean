/**
 * Script: setup-storage-bucket.mjs
 * Creates the 'config' private Storage bucket in Supabase.
 * This bucket stores the DBA course Stripe price ID (config/dba-settings.json).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

async function main() {
  const env = readEnv();
  const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
  const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log('🔍 Checking Supabase Storage buckets...\n');

  // List existing buckets
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error('❌ Failed to list buckets:', listErr.message);
    process.exit(1);
  }

  const configBucket = buckets.find(b => b.name === 'config');

  if (configBucket) {
    console.log('✅ "config" bucket already exists!');
    console.log('   Public:', configBucket.public ? 'yes (⚠ should be private)' : 'no ✓');
    console.log('');
    await verifyOrCreateSettings(supabase);
    return;
  }

  // Create the bucket
  process.stdout.write('Creating private "config" Storage bucket... ');
  const { data, error } = await supabase.storage.createBucket('config', {
    public: false,
    allowedMimeTypes: ['application/json'],
  });

  if (error) {
    console.log('❌');
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('✅ Created!');
  console.log('');
  await verifyOrCreateSettings(supabase);
}

async function verifyOrCreateSettings(supabase) {
  console.log('🔍 Checking for existing DBA settings file...');

  // Try to download existing settings
  const { data: existing, error: downloadErr } = await supabase.storage
    .from('config')
    .download('dba-settings.json');

  if (!downloadErr && existing) {
    const text = await existing.text();
    const config = JSON.parse(text);
    console.log('✅ Settings file exists:', JSON.stringify(config));
    console.log('');
    console.log('Step 2 complete! The config bucket is ready.');
    console.log('Use the Admin Dashboard → Courses page to set your Stripe Price ID.');
    return;
  }

  // Create default empty settings
  process.stdout.write('Creating default dba-settings.json... ');
  const defaultConfig = JSON.stringify({ stripe_price_id: '' });
  const { error: uploadErr } = await supabase.storage
    .from('config')
    .upload('dba-settings.json', defaultConfig, {
      contentType: 'application/json',
      upsert: false,
    });

  if (uploadErr && !uploadErr.message?.includes('already')) {
    console.log('❌');
    console.error('Error creating settings file:', uploadErr.message);
    return;
  }

  console.log('✅ Created (empty — Stripe Price ID not set yet)');
  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log('  Step 2 COMPLETE');
  console.log('══════════════════════════════════════════════════════');
  console.log('');
  console.log('✅ "config" bucket created (private)');
  console.log('✅ dba-settings.json initialised');
  console.log('');
  console.log('Next: Set your Stripe Price ID via the Admin Dashboard');
  console.log('  → Dashboard → Courses → Paste price_xxxx → Save');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
