import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "drizzle-orm";

import { getDb } from "../../../db/index.js";

export const getGreeting = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().min(1) }))
  .handler(async ({ data }) => {
    const result = await getDb().execute<{ n: number }>(sql`SELECT 1 AS n`);
    return { greeting: `Hello, ${data.name}!`, env: "netlify", count: result.rows[0]?.n ?? 0 };
  });
