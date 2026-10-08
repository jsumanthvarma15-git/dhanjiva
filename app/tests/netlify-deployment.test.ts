import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("Netlify deployment", () => {
  test("builds the nested application and publishes its client assets", () => {
    const configuration = source("../../netlify.toml");
    expect(configuration).toContain('base = "app"');
    expect(configuration).toContain('command = "bun run build"');
    expect(configuration).toContain('publish = "dist/client"');
    expect(configuration).toContain('command = "bun run --cwd app dev"');
  });

  test("uses the Netlify server adapter instead of a Workers build", () => {
    const configuration = source("../vite.config.ts");
    expect(configuration).toContain('import netlify from "@netlify/vite-plugin-tanstack-start"');
    expect(configuration).toContain("netlify()");
    expect(configuration).toContain('server: { entry: "server" }');
    expect(configuration).not.toContain('target: "webworker"');
    expect(configuration).not.toContain("cloudflare:workers");
  });

  test("keeps server functions independent of Cloudflare bindings", () => {
    for (const path of [
      "../src/lib/api/enquiry.functions.ts",
      "../src/lib/api/example.functions.ts",
    ]) {
      const serverFunction = source(path);
      expect(serverFunction).toContain("getDb()");
      expect(serverFunction).not.toContain("bindings.server");
      expect(serverFunction).not.toContain("DB.prepare");
    }
  });

  test("initializes the database on demand and provides deploy-time migrations", () => {
    const client = source("../db/index.ts");
    expect(client).toContain("export function getDb()");
    expect(client).toContain("client: getDatabase()");
    expect(source("../drizzle.config.ts")).toContain('out: "netlify/database/migrations"');
    expect(source("../db/schema.ts")).toContain('index("enquiries_email_created")');
    const migrations = new URL("../netlify/database/migrations/", import.meta.url);
    const migrationDirectory = readdirSync(migrations).find((name) =>
      name.endsWith("_create_enquiries"),
    );
    expect(migrationDirectory).toBeDefined();
    const migration = readFileSync(
      new URL(`${migrationDirectory}/migration.sql`, migrations),
      "utf8",
    );
    expect(migration).toContain('CREATE TABLE "enquiries"');
    expect(migration).toContain('CREATE INDEX "enquiries_email_created"');
  });
});
