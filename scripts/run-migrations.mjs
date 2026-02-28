/**
 * Supabase Migration Runner
 * Uses the Supabase Management API (SUPABASE_ACCESS_TOKEN) to run SQL migrations.
 * Falls back to direct pg connection (SUPABASE_DB_PASSWORD) if token not set.
 *
 * Usage:
 *   node scripts/run-migrations.mjs              # run all migrations
 *   node scripts/run-migrations.mjs 010          # run specific migration by prefix
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load .env.local
const envFile = readFileSync(join(ROOT, ".env.local"), "utf8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
const accessToken = env["SUPABASE_ACCESS_TOKEN"] ?? "";
const dbPassword = env["SUPABASE_DB_PASSWORD"] ?? "";

if (!accessToken && !dbPassword) {
  console.error("\n❌ Neither SUPABASE_ACCESS_TOKEN nor SUPABASE_DB_PASSWORD is set in .env.local\n");
  process.exit(1);
}

const filter = process.argv[2] ?? null;

// ── Run SQL via Management API (preferred) ─────────────────────────────────

async function runSqlViaApi(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json();
}

// ── Run SQL via direct pg connection (fallback) ────────────────────────────

async function runSqlViaPg(sql) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: dbPassword,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const useApi = !!accessToken;
  console.log(`\n🔗 Using ${useApi ? "Management API" : "direct pg connection"}\n`);

  // Verify connectivity
  if (useApi) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.error(`❌ Management API auth failed (${res.status}). Check SUPABASE_ACCESS_TOKEN.`);
      process.exit(1);
    }
    console.log(`✅ Connected to project ${projectRef}\n`);
  }

  const migrationsDir = join(ROOT, "supabase", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql") && f !== "full_migration.sql")
    .sort();

  const toRun = filter ? files.filter((f) => f.startsWith(filter)) : files;

  if (toRun.length === 0) {
    console.log("No matching migration files found.");
    return;
  }

  for (const file of toRun) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Running ${file}...`);
    try {
      if (useApi) {
        await runSqlViaApi(sql);
      } else {
        await runSqlViaPg(sql);
      }
      console.log(`  ✅ ${file} applied\n`);
    } catch (err) {
      const msg = err.message ?? "";
      // Ignore idempotent errors
      if (
        msg.includes("already exists") ||
        msg.includes("duplicate") ||
        msg.includes("42701") ||
        msg.includes("42P07") ||
        msg.includes("42710")
      ) {
        console.log(`  ⚠️  ${file} already applied (skipped)\n`);
      } else {
        console.error(`  ❌ ${file} failed: ${msg}`);
        process.exit(1);
      }
    }
  }

  console.log("All done.");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
