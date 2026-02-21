/**
 * Supabase Migration Runner
 * Connects directly to the Supabase PostgreSQL database and runs all
 * pending migrations from supabase/migrations/ in filename order.
 *
 * Requires SUPABASE_DB_PASSWORD in .env.local
 * Get it from: Supabase dashboard → Settings → Database → Connection string
 *
 * Usage:
 *   node scripts/run-migrations.mjs              # run all migrations
 *   node scripts/run-migrations.mjs 009          # run specific migration
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load .env.local manually
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
const dbPassword = env["SUPABASE_DB_PASSWORD"] ?? "";
const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

if (!dbPassword) {
  console.error("\n❌ SUPABASE_DB_PASSWORD is not set in .env.local");
  console.error(
    "   Get it from: Supabase dashboard → Settings → Database → Connection string\n"
  );
  process.exit(1);
}

const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;

const filter = process.argv[2] ?? null; // optional: "009" filters to 009_*.sql

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  console.log("✅ Connected to Supabase database\n");

  const migrationsDir = join(ROOT, "supabase", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql") && f !== "full_migration.sql")
    .sort();

  const toRun = filter ? files.filter((f) => f.startsWith(filter)) : files;

  if (toRun.length === 0) {
    console.log("No matching migration files found.");
    await client.end();
    return;
  }

  for (const file of toRun) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Running ${file}...`);
    try {
      await client.query(sql);
      console.log(`  ✅ ${file} applied\n`);
    } catch (err) {
      // Ignore "already exists" / "duplicate column" errors — idempotent
      if (
        err.code === "42701" || // duplicate_column
        err.code === "42P07" || // duplicate_table
        err.code === "42710"    // duplicate_object (index etc)
      ) {
        console.log(`  ⚠️  ${file} already applied (skipped)\n`);
      } else {
        console.error(`  ❌ ${file} failed: ${err.message}`);
        await client.end();
        process.exit(1);
      }
    }
  }

  await client.end();
  console.log("All done.");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
