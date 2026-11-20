import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Client } from "@libsql/client";

/**
 * Storage: libSQL (SQLite).
 *
 *  • A server with a disk (`npm run dev`, a VPS, a Docker volume): nothing to
 *    configure — a local file at ./data/sleigh-the-flag.db.
 *  • Serverless hosting (Vercel, Netlify…): there is no persistent disk, so a
 *    hosted Turso database is required:
 *        DATABASE_URL=libsql://your-db.turso.io
 *        DATABASE_AUTH_TOKEN=…
 *    (`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` are accepted too — the names
 *    the Turso integration for Vercel creates.)
 */

/** No usable database is configured. The message is written for an organiser, not for the public. */
export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

type Store = { ready: Promise<Client> };

const globalStore = globalThis as unknown as { __stfDb?: Store };

/** Platforms whose file system is read-only or thrown away between requests. */
const NO_PERSISTENT_DISK = Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

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

function resolveConnection(): { url: string; authToken?: string; remote: boolean } {
  const configured = (process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "").trim();
  const authToken = (process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || "").trim() || undefined;

  if (configured && !configured.startsWith("file:")) return { url: configured, authToken, remote: true };

  if (NO_PERSISTENT_DISK) {
    // Never fall back to a temporary file here: registrations would vanish with the next cold start.
    throw new DatabaseConfigError(
      "No database is configured. This host has no persistent disk, so the site needs a hosted Turso database: set DATABASE_URL (libsql://…) and DATABASE_AUTH_TOKEN in the project's environment variables, then redeploy.",
    );
  }

  const file = configured
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), configured.slice("file:".length))
    : path.join(/* turbopackIgnore: true */ process.cwd(), "data", "sleigh-the-flag.db");
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  } catch (error) {
    throw new DatabaseConfigError(
      `Can't create the database folder (${(error as NodeJS.ErrnoException).code ?? "unknown error"}). If this host has no writable disk, set DATABASE_URL and DATABASE_AUTH_TOKEN to a Turso database.`,
    );
  }
  return { url: `file:${file}`, remote: false };
}

async function open(): Promise<Client> {
  const connection = resolveConnection();
  // A remote database is reached with the fetch-based client: it has no native
  // binary to ship, which is exactly what a serverless function needs. Only a
  // local file loads the native SQLite driver.
  const { createClient } = connection.remote ? await import("@libsql/client/web") : await import("@libsql/client");
  const client = createClient({ url: connection.url, authToken: connection.authToken });
  await client.batch(SCHEMA, "write");
  return client;
}

/** Returns a ready-to-use client (tables are created on first use). */
export async function db(): Promise<Client> {
  const store = (globalStore.__stfDb ??= { ready: open() });
  try {
    return await store.ready;
  } catch (error) {
    // Don't cache a broken connection — the next request retries from scratch.
    if (globalStore.__stfDb === store) globalStore.__stfDb = undefined;
    throw error;
  }
}
