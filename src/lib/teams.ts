import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { InStatement, Row } from "@libsql/client";
import { event } from "@/config/event";
import { db } from "./db";
import { emailKey, teamNameKey } from "./validation";
import type { AdminSettings, FieldErrors, Member, RegistrationStatus, Team, TeamInput, TeamStatus } from "./types";

/** Thrown when a team name or an email is already taken. */
export class ConflictError extends Error {
  constructor(public fieldErrors: FieldErrors) {
    super("conflict");
    this.name = "ConflictError";
  }
}

/* ───────────────────────────── mapping ──────────────────────────────── */

function toMember(row: Row): Member {
  const position = Number(row.position);
  return {
    id: String(row.id),
    position,
    isLeader: position === 0,
    fullName: String(row.full_name),
    studentId: String(row.student_id),
    email: String(row.email),
    phone: String(row.phone),
  };
}

function toTeam(row: Row, members: Member[]): Team {
  const status = String(row.status);
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    university: String(row.university),
    status: status === "approved" || status === "rejected" ? status : "pending",
    notes: String(row.notes ?? ""),
    source: String(row.source) === "admin" ? "admin" : "public",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    members,
  };
}

// No I, L, O, 0 or 1 — codes get read out loud and typed from screenshots.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeCode(): string {
  let out = "";
  for (const byte of randomBytes(6)) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `${event.codePrefix}-${out}`;
}

function constraintOf(error: unknown): "name" | "email" | "code" | null {
  const message = error instanceof Error ? error.message : String(error);
  if (!/constraint/i.test(message)) return null;
  if (message.includes("teams.name_key")) return "name";
  if (message.includes("members.email_key")) return "email";
  if (message.includes("teams.code")) return "code";
  return null;
}

const placeholders = (count: number) => Array.from({ length: count }, () => "?").join(", ");

function memberInserts(teamId: string, members: TeamInput["members"]): InStatement[] {
  return members.map((member, position) => ({
    sql: `INSERT INTO members (id, team_id, position, full_name, student_id, email, email_key, phone)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [randomUUID(), teamId, position, member.fullName, member.studentId, member.email, emailKey(member.email), member.phone],
  }));
}

/* ───────────────────────────── queries ──────────────────────────────── */

export async function listTeams(): Promise<Team[]> {
  const client = await db();
  const [teams, members] = await Promise.all([
    client.execute("SELECT * FROM teams ORDER BY created_at DESC"),
    client.execute("SELECT * FROM members ORDER BY team_id, position"),
  ]);
  const byTeam = new Map<string, Member[]>();
  for (const row of members.rows) {
    const key = String(row.team_id);
    const list = byTeam.get(key);
    if (list) list.push(toMember(row));
    else byTeam.set(key, [toMember(row)]);
  }
  return teams.rows.map((row) => toTeam(row, byTeam.get(String(row.id)) ?? []));
}

export async function getTeam(id: string): Promise<Team | null> {
  const client = await db();
  const [team, members] = await Promise.all([
    client.execute({ sql: "SELECT * FROM teams WHERE id = ?", args: [id] }),
    client.execute({ sql: "SELECT * FROM members WHERE team_id = ? ORDER BY position", args: [id] }),
  ]);
  const row = team.rows[0];
  return row ? toTeam(row, members.rows.map(toMember)) : null;
}

export async function isTeamNameTaken(name: string, exceptTeamId?: string): Promise<boolean> {
  const client = await db();
  const result = await client.execute({
    sql: "SELECT id FROM teams WHERE name_key = ? AND id != ? LIMIT 1",
    args: [teamNameKey(name), exceptTeamId ?? ""],
  });
  return result.rows.length > 0;
}

/**
 * Friendly, field-level duplicate detection. The unique indexes remain the
 * real guard against two requests racing each other.
 */
async function findConflicts(input: TeamInput, exceptTeamId?: string): Promise<FieldErrors> {
  const client = await db();
  const errors: FieldErrors = {};

  if (await isTeamNameTaken(input.teamName, exceptTeamId)) {
    errors.teamName = "That team name is already taken — pick another one.";
  }

  const keys = input.members.map((member) => emailKey(member.email));
  if (keys.length > 0) {
    const taken = await client.execute({
      sql: `SELECT email_key FROM members WHERE email_key IN (${placeholders(keys.length)}) AND team_id != ?`,
      args: [...keys, exceptTeamId ?? ""],
    });
    const takenKeys = new Set(taken.rows.map((row) => String(row.email_key)));
    keys.forEach((key, index) => {
      if (takenKeys.has(key)) errors[`members.${index}.email`] = "This email is already registered with another team.";
    });
  }
  return errors;
}

function conflictFromConstraint(kind: "name" | "email"): ConflictError {
  return new ConflictError(
    kind === "name"
      ? { teamName: "That team name was just taken — pick another one." }
      : { "members.0.email": "One of these emails was just registered with another team." },
  );
}

export async function createTeam(
  input: TeamInput,
  options: { source: "public" | "admin"; status?: TeamStatus; notes?: string },
): Promise<Team> {
  const conflicts = await findConflicts(input);
  if (Object.keys(conflicts).length > 0) throw new ConflictError(conflicts);

  const client = await db();
  const id = randomUUID();
  const now = new Date().toISOString();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await client.batch(
        [
          {
            sql: `INSERT INTO teams (id, code, name, name_key, university, status, notes, source, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [id, makeCode(), input.teamName, teamNameKey(input.teamName), input.university, options.status ?? "pending", options.notes ?? "", options.source, now, now],
          },
          ...memberInserts(id, input.members),
        ],
        "write",
      );
      const team = await getTeam(id);
      if (!team) throw new Error("Team vanished right after it was created.");
      return team;
    } catch (error) {
      const kind = constraintOf(error);
      if (kind === "code") continue; // one-in-a-billion code collision: roll again
      if (kind) throw conflictFromConstraint(kind);
      throw error;
    }
  }
  throw new Error("Could not allocate a registration code.");
}

export async function updateTeam(
  id: string,
  patch: { team?: TeamInput; status?: TeamStatus; notes?: string },
): Promise<Team | null> {
  const existing = await getTeam(id);
  if (!existing) return null;

  if (patch.team) {
    const conflicts = await findConflicts(patch.team, id);
    if (Object.keys(conflicts).length > 0) throw new ConflictError(conflicts);
  }

  const client = await db();
  const now = new Date().toISOString();
  const statements: InStatement[] = [];

  const sets: string[] = ["updated_at = ?"];
  const args: (string | number)[] = [now];
  if (patch.team) {
    sets.push("name = ?", "name_key = ?", "university = ?");
    args.push(patch.team.teamName, teamNameKey(patch.team.teamName), patch.team.university);
  }
  if (patch.status) {
    sets.push("status = ?");
    args.push(patch.status);
  }
  if (typeof patch.notes === "string") {
    sets.push("notes = ?");
    args.push(patch.notes);
  }
  statements.push({ sql: `UPDATE teams SET ${sets.join(", ")} WHERE id = ?`, args: [...args, id] });

  if (patch.team) {
    statements.push({ sql: "DELETE FROM members WHERE team_id = ?", args: [id] });
    statements.push(...memberInserts(id, patch.team.members));
  }

  try {
    await client.batch(statements, "write");
  } catch (error) {
    const kind = constraintOf(error);
    if (kind === "name" || kind === "email") throw conflictFromConstraint(kind);
    throw error;
  }
  return getTeam(id);
}

export async function setTeamsStatus(ids: string[], status: TeamStatus): Promise<number> {
  if (ids.length === 0) return 0;
  const client = await db();
  const result = await client.execute({
    sql: `UPDATE teams SET status = ?, updated_at = ? WHERE id IN (${placeholders(ids.length)})`,
    args: [status, new Date().toISOString(), ...ids],
  });
  return result.rowsAffected;
}

export async function deleteTeams(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const client = await db();
  const marks = placeholders(ids.length);
  const results = await client.batch(
    [
      { sql: `DELETE FROM members WHERE team_id IN (${marks})`, args: ids },
      { sql: `DELETE FROM teams WHERE id IN (${marks})`, args: ids },
    ],
    "write",
  );
  return results[1]?.rowsAffected ?? 0;
}

/* ───────────────────────────── settings ─────────────────────────────── */

const DEFAULT_SETTINGS: AdminSettings = { registrationOpen: true, maxTeams: null, ignoreDeadline: false };

export async function getSettings(): Promise<AdminSettings> {
  const client = await db();
  const result = await client.execute("SELECT key, value FROM settings");
  const map = new Map(result.rows.map((row) => [String(row.key), String(row.value)]));
  const maxTeams = Number.parseInt(map.get("max_teams") ?? "", 10);
  return {
    registrationOpen: map.has("registration_open") ? map.get("registration_open") === "1" : DEFAULT_SETTINGS.registrationOpen,
    maxTeams: Number.isFinite(maxTeams) && maxTeams > 0 ? maxTeams : null,
    ignoreDeadline: map.get("ignore_deadline") === "1",
  };
}

export async function updateSettings(patch: Partial<AdminSettings>): Promise<AdminSettings> {
  const client = await db();
  const rows: [string, string][] = [];
  if (typeof patch.registrationOpen === "boolean") rows.push(["registration_open", patch.registrationOpen ? "1" : "0"]);
  if (typeof patch.ignoreDeadline === "boolean") rows.push(["ignore_deadline", patch.ignoreDeadline ? "1" : "0"]);
  if (patch.maxTeams === null) rows.push(["max_teams", ""]);
  else if (typeof patch.maxTeams === "number") rows.push(["max_teams", String(Math.max(1, Math.floor(patch.maxTeams)))]);

  if (rows.length > 0) {
    await client.batch(
      rows.map(([key, value]) => ({
        sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        args: [key, value],
      })),
      "write",
    );
  }
  return getSettings();
}

/* ─────────────────────────── registration gate ──────────────────────── */

export async function getRegistrationStatus(): Promise<RegistrationStatus> {
  const client = await db();
  const [settings, counts, players] = await Promise.all([
    getSettings(),
    client.execute("SELECT COUNT(*) AS teams, COUNT(DISTINCT lower(university)) AS universities FROM teams WHERE status != 'rejected'"),
    client.execute("SELECT COUNT(*) AS players FROM members WHERE team_id IN (SELECT id FROM teams WHERE status != 'rejected')"),
  ]);

  const teams = Number(counts.rows[0]?.teams ?? 0);
  const now = Date.now();
  const opensAt = new Date(event.dates.registrationOpens).getTime();
  const closesAt = new Date(event.dates.registrationCloses).getTime();

  let reason: RegistrationStatus["reason"] = "open";
  if (!settings.registrationOpen) reason = "paused";
  else if (!settings.ignoreDeadline && now < opensAt) reason = "not-yet";
  else if (!settings.ignoreDeadline && now > closesAt) reason = "deadline";
  else if (settings.maxTeams !== null && teams >= settings.maxTeams) reason = "full";

  return {
    open: reason === "open",
    reason,
    teams,
    players: Number(players.rows[0]?.players ?? 0),
    universities: Number(counts.rows[0]?.universities ?? 0),
    opensAt: event.dates.registrationOpens,
    closesAt: event.dates.registrationCloses,
  };
}
