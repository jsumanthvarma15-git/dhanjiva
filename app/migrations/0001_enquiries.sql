CREATE TABLE IF NOT EXISTS enquiries (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 email TEXT NOT NULL,
 hospital TEXT NOT NULL,
 interest TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS enquiries_email_created ON enquiries(email,created_at);
