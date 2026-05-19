// Run schema.sql against Neon.
// Usage: npm run db:setup
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, "..", "lib", "schema.sql");

if (!process.env.DATABASE_URL) {
  console.error("✗ DATABASE_URL missing in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// 1) Create enums idempotently (Neon HTTP can't run DO $$ blocks).
const ENUMS = [
  { name: "plan_t", values: ["free", "starter", "pro"] },
  { name: "credit_txn_t", values: ["purchase", "use", "bonus", "refund"] },
];

for (const e of ENUMS) {
  const exists = await sql`SELECT 1 FROM pg_type WHERE typname = ${e.name}`;
  if (exists.length === 0) {
    const valuesSql = e.values.map((v) => `'${v}'`).join(", ");
    await sql.query(`CREATE TYPE ${e.name} AS ENUM (${valuesSql})`);
    console.log(`+ enum ${e.name}`);
  } else {
    console.log(`= enum ${e.name} (exists)`);
  }
}

// 2) Run schema.sql statements (split on top-level `;`).
const schema = readFileSync(sqlPath, "utf8");
// Strip line comments, then split on `;`. No semicolons inside string literals
// in this schema, so a plain split is safe.
const statements = schema
  .split("\n")
  .filter((line) => !/^\s*--/.test(line))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`→ Running ${statements.length} schema statements...`);
let ok = 0;
for (const stmt of statements) {
  try {
    await sql.query(stmt);
    ok++;
  } catch (e) {
    console.error("\n✗ Statement failed:\n", stmt.slice(0, 220), "\n", e.message);
    process.exit(1);
  }
}

const [{ now }] = await sql`SELECT now() as now`;
const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`;

console.log(`✓ ${ok} statements OK at ${now}`);
console.log(`✓ Tables: ${tables.map((t) => t.table_name).join(", ")}`);
