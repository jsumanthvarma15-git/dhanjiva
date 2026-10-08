import { bigint, index, pgTable, text } from "drizzle-orm/pg-core";

export const enquiries = pgTable(
  "enquiries",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    hospital: text("hospital").notNull(),
    interest: text("interest").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("enquiries_email_created").on(table.email, table.createdAt)],
);
