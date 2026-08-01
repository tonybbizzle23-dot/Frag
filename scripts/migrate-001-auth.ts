// Run the auth migration against the Neon database.
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const db = neon(url);

// Run each DDL statement separately via the tagged-template interface.
// db.unsafe() / db.query() do not work reliably in this version of the driver.

console.log("Creating users table...");
await db`
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'none',
    subscription_tier TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )
`;
console.log("  users: OK");

console.log("Creating sessions table...");
await db`
  CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )
`;
console.log("  sessions: OK");

console.log("Creating index on sessions(token)...");
await db`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
console.log("  idx_sessions_token: OK");

console.log("Creating index on sessions(user_id)...");
await db`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`;
console.log("  idx_sessions_user_id: OK");

console.log("Migration 001_auth applied successfully.");
