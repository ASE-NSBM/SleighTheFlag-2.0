import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";

/**
 * Storage: libSQL.
 *  • No configuration → a local SQLite file at ./data/sleigh-the-flag.db
 *    (perfect for `npm run dev` and for a single VPS / Docker volume).
 *  • DATABASE_URL=libsql://…  + DATABASE_AUTH_TOKEN → a hosted Turso database
 *    (needed on serverless hosts such as Vercel, where the disk is not persistent).
 */

type Store = { client: Client; ready: Promise<void> };

const globalStore = globalThis as unknown as { __stfDb?: Store };

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS teams (
     id          TEXT PRIMARY KEY,
     code        TEXT NOT NULL UNIQUE,
     name        TEXT NOT NULL,
     name_key    TEXT NOT NULL UNIQUE,
     university  TEXT NOT NULL,
     status      TEXT NOT NULL DEFAULT 'pending',
     notes       TEXT NOT NULL DEFAULT '',
     source      TEXT NOT NULL DEFAULT 'public',
     created_at  TEXT NOT NULL,
     updated_at  TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS members (
     id          TEXT PRIMARY KEY,
     team_id     TEXT NOT NULL,
     position    INTEGER NOT NULL,
     full_name   TEXT NOT NULL,
     student_id  TEXT NOT NULL,
     email       TEXT NOT NULL,
     email_key   TEXT NOT NULL,
     phone       TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_members_team ON members(team_id, position)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email ON members(email_key)`,
  `CREATE INDEX IF NOT EXISTS idx_teams_created ON teams(created_at)`,
  `CREATE TABLE IF NOT EXISTS settings (
     key    TEXT PRIMARY KEY,
     value  TEXT NOT NULL
   )`,
];

function resolveConnection(): { url: string; authToken?: string } {
  const configured = (process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "").trim();
  const authToken = (process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || "").trim() || undefined;

  if (configured && !configured.startsWith("file:")) return { url: configured, authToken };

  const file = configured
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), configured.slice("file:".length))
    : path.join(/* turbopackIgnore: true */ process.cwd(), "data", "sleigh-the-flag.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return { url: `file:${file}` };
}

function open(): Store {
  const client = createClient(resolveConnection());
  const ready = client.batch(SCHEMA, "write").then(() => undefined);
  return { client, ready };
}

/** Returns a ready-to-use client (tables are created on first use). */
export async function db(): Promise<Client> {
  const store = (globalStore.__stfDb ??= open());
  try {
    await store.ready;
  } catch (error) {
    // Don't cache a broken connection — the next request retries from scratch.
    if (globalStore.__stfDb === store) globalStore.__stfDb = undefined;
    throw error;
  }
  return store.client;
}
