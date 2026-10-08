CREATE TABLE "enquiries" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"hospital" text NOT NULL,
	"interest" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "enquiries_email_created" ON "enquiries" ("email","created_at");