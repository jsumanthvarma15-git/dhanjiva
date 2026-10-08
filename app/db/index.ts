import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

export function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("Database is not configured");
  return drizzle(neon(url), { schema });
}
