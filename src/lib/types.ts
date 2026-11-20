/** Shared types — safe to import from both server and client code. */

export type TeamStatus = "pending" | "approved" | "rejected";
export const TEAM_STATUSES: readonly TeamStatus[] = ["pending", "approved", "rejected"];

export function isTeamStatus(value: unknown): value is TeamStatus {
  return typeof value === "string" && (TEAM_STATUSES as readonly string[]).includes(value);
}

export interface Member {
  id: string;
  position: number;
  isLeader: boolean;
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
}

export interface Team {
  id: string;
  /** Human-friendly reference, e.g. STF-7KQ2MX */
  code: string;
  name: string;
  university: string;
  status: TeamStatus;
  notes: string;
  source: "public" | "admin";
  createdAt: string;
  updatedAt: string;
  /** members[0] is always the team leader. */
  members: Member[];
}

export interface PersonInput {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
}

export interface TeamInput {
  teamName: string;
  university: string;
  /** members[0] is the team leader. */
  members: PersonInput[];
}

export type RegistrationReason = "open" | "paused" | "not-yet" | "deadline" | "full";

export interface RegistrationStatus {
  open: boolean;
  reason: RegistrationReason;
  teams: number;
  players: number;
  universities: number;
  opensAt: string;
  closesAt: string;
}

export interface AdminSettings {
  /** Master switch. When false the public form is closed regardless of dates. */
  registrationOpen: boolean;
  /** Stop accepting teams after this many (null = no cap). */
  maxTeams: number | null;
  /** Ignore the configured opening/closing dates. */
  ignoreDeadline: boolean;
}

/** Keys are dotted paths, e.g. "teamName" or "members.1.email". */
export type FieldErrors = Record<string, string>;

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string; fieldErrors?: FieldErrors };
