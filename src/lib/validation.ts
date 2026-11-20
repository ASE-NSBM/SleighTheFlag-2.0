/**
 * Validation shared by the browser (instant feedback) and the server
 * (the only check that counts). Never trust the client copy.
 */
import { z } from "zod";
import { event } from "@/config/event";
import type { FieldErrors, PersonInput, TeamInput } from "./types";

/* ───────────────────────────── helpers ──────────────────────────────── */

const FREE_MAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "ymail.com", "rocketmail.com",
  "outlook.com", "hotmail.com", "hotmail.co.uk", "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.net", "mail.com", "zoho.com",
  "yandex.com", "tutanota.com", "tuta.io", "hey.com", "fastmail.com", "duck.com", "rediffmail.com",
  "qq.com", "163.com", "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
]);

const EMAIL_RE = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
const NAME_RE = /^\p{L}[\p{L}\p{M}‌‍'’. -]*$/u;
const STUDENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/;
const TEAM_NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} _.\-!&'’#+@$*()[\]{}:/?=~^%|]*$/u;
const UNIVERSITY_RE = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} .,&'’()/-]*$/u;
const RESERVED_TEAM_NAMES = new Set(["admin", "administrator", "organizer", "organizers", "organiser", "organisers", "ase", "staff", "moderator"]);

/** Collapse whitespace and normalise look-alike unicode forms. */
export function cleanText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

const cleanIfString = (value: unknown) => (typeof value === "string" ? cleanText(value) : value);
const lowerIfString = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : value);
const trimIfString = (value: unknown) => (typeof value === "string" ? value.trim() : value);

export function isUniversityEmail(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  return domain.length > 0 && !FREE_MAIL_DOMAINS.has(domain);
}

/**
 * Accepts the ways people actually type Sri Lankan numbers
 * (077 123 4567, 0771234567, +94 77 123 4567, 94771234567, 771234567)
 * plus any international number in +E.164 form. Returns E.164 or null.
 */
export function normalizePhone(raw: string): string | null {
  const v = raw.replace(/[\s().-]/g, "");
  let m: RegExpMatchArray | null;
  if ((m = v.match(/^0([1-9]\d{8})$/))) return `+94${m[1]}`;
  if ((m = v.match(/^(?:\+|00)94([1-9]\d{8})$/))) return `+94${m[1]}`;
  if ((m = v.match(/^94([1-9]\d{8})$/))) return `+94${m[1]}`;
  if ((m = v.match(/^(7\d{8})$/))) return `+94${m[1]}`;
  if ((m = v.match(/^\+([1-9]\d{7,14})$/))) return `+${m[1]}`;
  return null;
}

/** +94771234567 → +94 77 123 4567 (other countries are left untouched). */
export function formatPhone(e164: string): string {
  const m = e164.match(/^\+94(\d{2})(\d{3})(\d{4})$/);
  return m ? `+94 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

export const teamNameKey = (name: string) => cleanText(name).toLowerCase();
export const emailKey = (email: string) => email.trim().toLowerCase();
const studentIdKey = (id: string) => id.replace(/[\s._/-]/g, "").toLowerCase();

/* ───────────────────────────── schemas ──────────────────────────────── */

const { minSize, maxSize } = event.team;

function personSchema(strict: boolean) {
  return z.object({
    fullName: z.preprocess(
      cleanIfString,
      z
        .string({ error: "Enter the full name." })
        .min(3, "Enter the full name (at least 3 characters).")
        .max(80, "That name is too long — 80 characters max.")
        .regex(NAME_RE, "Names can only contain letters, spaces, dots, hyphens and apostrophes."),
    ),
    studentId: z.preprocess(
      cleanIfString,
      z
        .string({ error: "Enter the student ID." })
        .min(3, "Enter the student ID (at least 3 characters).")
        .max(24, "That student ID is too long — 24 characters max.")
        .regex(STUDENT_ID_RE, "Student IDs can only contain letters, numbers, spaces and . / - _"),
    ),
    email: z.preprocess(
      lowerIfString,
      z
        .string({ error: "Enter the university email." })
        .min(1, "Enter the university email.")
        .max(120, "That email is too long — 120 characters max.")
        .regex(EMAIL_RE, "That doesn't look like a valid email address.")
        .refine(
          (value) => !strict || !event.requireUniversityEmail || isUniversityEmail(value),
          "Use a university email — personal inboxes like Gmail or Outlook aren't accepted.",
        ),
    ),
    phone: z.preprocess(
      trimIfString,
      z
        .string({ error: "Enter a contact number." })
        .min(1, "Enter a contact number.")
        .max(24, "That number is too long.")
        .refine((value) => normalizePhone(value) !== null, "Enter a valid number, e.g. 077 123 4567 or +94 77 123 4567.")
        .transform((value) => normalizePhone(value) as string),
    ),
  });
}

const teamFields = {
  teamName: z.preprocess(
    cleanIfString,
    z
      .string({ error: "Give your team a name." })
      .min(3, "Team names need at least 3 characters.")
      .max(32, "Team names can be 32 characters at most.")
      .regex(TEAM_NAME_RE, "Start with a letter or number. Emoji and the characters < > \" , ; \\ ` aren't allowed.")
      .refine((value) => !RESERVED_TEAM_NAMES.has(value.toLowerCase()), "That name is reserved — pick another one."),
  ),
  university: z.preprocess(
    cleanIfString,
    z
      .string({ error: "Choose or type your university." })
      .min(2, "Choose or type your university.")
      .max(120, "That university name is too long — 120 characters max.")
      .regex(UNIVERSITY_RE, "University names can only contain letters, numbers and . , & ' ( ) / -"),
  ),
};

function teamSchema(strict: boolean) {
  const min = strict ? minSize : 1;
  return z
    .object({
      ...teamFields,
      members: z
        .array(personSchema(strict), { error: "Add your team members." })
        .min(min, min === 1 ? "A team needs at least a leader." : `A team needs at least ${min} members, including the leader.`)
        .max(maxSize, `A team can have ${maxSize} members at most.`),
    })
    .superRefine((team, ctx) => {
      const emails = new Map<string, number>();
      const ids = new Map<string, number>();
      team.members.forEach((member, index) => {
        const e = emailKey(member.email);
        if (emails.has(e)) {
          ctx.addIssue({ code: "custom", path: ["members", index, "email"], message: "Another member of this team already uses this email." });
        } else emails.set(e, index);

        const s = studentIdKey(member.studentId);
        if (ids.has(s)) {
          ctx.addIssue({ code: "custom", path: ["members", index, "studentId"], message: "Another member of this team already uses this student ID." });
        } else ids.set(s, index);
      });
    });
}

const strictPerson = personSchema(true);
const strictTeamFields = z.object(teamFields);
const strictTeam = teamSchema(true);
const relaxedTeam = teamSchema(false);

/* ───────────────────────────── public API ───────────────────────────── */

export function toFieldErrors(error: z.ZodError, prefix = ""): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = prefix + issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export type Validated<T> = { ok: true; data: T } | { ok: false; fieldErrors: FieldErrors };

/** Just the name — used by the live "is it available?" check. Returns the cleaned name. */
export function validateTeamName(input: unknown): Validated<string> {
  const parsed = teamFields.teamName.safeParse(input);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, fieldErrors: { teamName: parsed.error.issues[0]?.message ?? "Invalid team name." } };
}

/** Step 1 of the form. */
export function validateTeamFields(input: unknown): Validated<Pick<TeamInput, "teamName" | "university">> {
  const parsed = strictTeamFields.safeParse(input);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, fieldErrors: toFieldErrors(parsed.error) };
}

/** One person; `index` positions the error keys (members.<index>.field). */
export function validatePerson(input: unknown, index: number): Validated<PersonInput> {
  const parsed = strictPerson.safeParse(input);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, fieldErrors: toFieldErrors(parsed.error, `members.${index}.`) };
}

/**
 * The whole registration.
 * `strict: false` is used by the admin panel: organisers may add a solo team
 * or accept a personal email as an exception.
 */
export function validateTeam(input: unknown, options: { strict?: boolean } = {}): Validated<TeamInput> {
  const parsed = (options.strict === false ? relaxedTeam : strictTeam).safeParse(input);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, fieldErrors: toFieldErrors(parsed.error) };
}

export const limits = { minSize, maxSize } as const;
