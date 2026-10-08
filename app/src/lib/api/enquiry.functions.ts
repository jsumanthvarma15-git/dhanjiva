import { createServerFn } from "@tanstack/react-start";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db/index.js";
import { enquiries } from "../../../db/schema.js";

export const submitEnquiry = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(2).max(100),
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
      hospital: z.string().trim().min(2).max(160),
      interest: z.enum(["Complete hospital", "Operations", "Finance", "Pharmacy"]),
      website: z.string().max(200).default(""),
      consent: z.literal(true),
    }),
  )
  .handler(async ({ data }) => {
    if (data.website) {
      return { ok: false, message: "Please leave the website field blank." };
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    try {
      const result = await getDb().execute(sql`
        INSERT INTO ${enquiries} (id, name, email, hospital, interest, created_at)
        SELECT ${id}, ${data.name}, ${data.email}, ${data.hospital}, ${data.interest}, ${now}
        WHERE NOT EXISTS (
          SELECT 1 FROM ${enquiries}
          WHERE ${enquiries.email} = ${data.email} AND ${enquiries.createdAt} > ${now - 60000}
        )
        RETURNING id
      `);
      if (!result.rows.length) {
        return {
          ok: false,
          message:
            "A request was recently saved for this email. Please wait a minute before trying again.",
        };
      }
      return {
        ok: true,
        message: "Your request has been saved.",
        reference: id.slice(0, 8).toUpperCase(),
      };
    } catch {
      return { ok: false, message: "We could not save your request. Please try again." };
    }
  });
