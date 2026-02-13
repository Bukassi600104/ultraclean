import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try pooler connection (session mode)
const client = new pg.Client({
  host: "aws-0-us-east-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: "postgres.gsxqrjywtugeuexrjcln",
  password: "$Arianna600104#",
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log("Connecting to Supabase database...");
  await client.connect();
  console.log("Connected!\n");

  const migrationFile = path.join(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "full_migration.sql"
  );
  const sql = fs.readFileSync(migrationFile, "utf-8");

  console.log("Running migrations...");
  await client.query(sql);
  console.log("All migrations completed successfully!\n");

  // Verify tables
  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log("Tables created:");
  rows.forEach((r) => console.log(`  - ${r.table_name}`));

  // Verify RLS
  const { rows: rlsRows } = await client.query(`
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = true
    ORDER BY tablename;
  `);
  console.log(`\nRLS enabled on ${rlsRows.length} tables:`);
  rlsRows.forEach((r) => console.log(`  - ${r.tablename}`));

  // Verify policies
  const { rows: policyRows } = await client.query(`
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
  console.log(`\n${policyRows.length} RLS policies created:`);
  policyRows.forEach((r) => console.log(`  - ${r.tablename}: ${r.policyname}`));

  await client.end();
  console.log("\nDone! Database is fully set up.");
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  client.end();
  process.exit(1);
});
