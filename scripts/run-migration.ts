// Run a SQL migration file against the Neon database.
// Usage: bun run scripts/run-migration.ts <path-to-sql-file>
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const migrationPath = process.argv[2];
if (!migrationPath) {
  console.error("Usage: bun run scripts/run-migration.ts <path-to-sql-file>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const db = neon(url);
const sql = readFileSync(migrationPath, "utf-8");

// Split on semicolons and execute each statement individually via the
// tagged-template interface. db.unsafe() does not work as expected with
// multi-statement SQL in this version of @neondatabase/serverless.
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  try {
    // Use tagged template literal for proper Neon protocol handling
    await db([stmt, ""] as any);
    console.log(`  [${i + 1}/${statements.length}] OK`);
  } catch (err: any) {
    console.error(`  [${i + 1}/${statements.length}] FAILED: ${err.message}`);
    process.exit(1);
  }
}

console.log(`Migration applied: ${migrationPath} (${statements.length} statements)`);
