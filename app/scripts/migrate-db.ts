import { neon } from "@neondatabase/serverless";
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) throw new Error("Set DATABASE_URL before running db:migrate");
const sql = neon(url);
await sql`CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
  hospital TEXT NOT NULL, interest TEXT NOT NULL, created_at BIGINT NOT NULL
)`;
await sql`CREATE INDEX IF NOT EXISTS enquiries_email_created ON enquiries (email, created_at)`;
console.log("Enquiries schema ready");
