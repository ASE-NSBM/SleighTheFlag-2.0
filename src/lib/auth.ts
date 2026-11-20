import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { fail, isHttps, isSameOrigin } from "./http";

/**
 * Admin authentication.
 *
 * One shared organiser account, configured through environment variables:
 *   ADMIN_USERNAME   (default "admin")
 *   ADMIN_PASSWORD   (required — the panel stays locked until it is set)
 *   SESSION_SECRET   (optional; derived from the password when missing, so
 *                     changing the password also signs everybody out)
 *
 * The session is a signed, HTTP-only, SameSite=Strict cookie.
 */

export const SESSION_COOKIE = "stf_admin";
const SESSION_HOURS = 8;
const TOKEN_VERSION = "v1";

export interface AdminSession {
  user: string;
  expiresAt: number;
}

const adminUsername = () => (process.env.ADMIN_USERNAME || "admin").trim();
const adminPassword = () => process.env.ADMIN_PASSWORD || "";

/** False until ADMIN_PASSWORD is set — the login endpoint refuses everything. */
export function isAdminConfigured(): boolean {
  return adminPassword().length >= 8;
}

function signingKey(): Buffer {
  const explicit = (process.env.SESSION_SECRET || "").trim();
  const material = explicit.length >= 16 ? explicit : `stf.session.${TOKEN_VERSION}:${adminUsername()}:${adminPassword()}`;
  return createHash("sha256").update(material).digest();
}

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/** Constant-time comparison (hashing first equalises the lengths). */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

export function verifyCredentials(username: string, password: string): boolean {
  if (!isAdminConfigured()) return false;
  // Evaluate both so timing does not reveal which half was wrong.
  const userOk = safeEqual(username.trim().toLowerCase(), adminUsername().toLowerCase());
  const passOk = safeEqual(password, adminPassword());
  return userOk && passOk;
}

const sign = (payload: string) => createHmac("sha256", signingKey()).update(payload).digest("base64url");

export function createSessionToken(user: string): { token: string; maxAge: number } {
  const maxAge = SESSION_HOURS * 60 * 60;
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ u: user, iat: now, exp: now + maxAge })).toString("base64url");
  return { token: `${TOKEN_VERSION}.${payload}.${sign(payload)}`, maxAge };
}

export function readSessionToken(token: string | undefined | null): AdminSession | null {
  if (!token || !isAdminConfigured()) return null;
  const [version, payload, signature, ...rest] = token.split(".");
  if (version !== TOKEN_VERSION || !payload || !signature || rest.length > 0) return null;
  if (!safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u?: unknown; exp?: unknown };
    if (typeof data.u !== "string" || typeof data.exp !== "number") return null;
    if (data.exp * 1000 <= Date.now()) return null;
    return { user: data.u, expiresAt: data.exp * 1000 };
  } catch {
    return null;
  }
}

/** Reads the session from the request cookies (Server Components & Route Handlers). */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  // Checking the expiry needs the current time, so this is strictly per-request work:
  // tell Next.js not to attempt it while prerendering.
  await connection();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function startAdminSession(request: Request, user: string): Promise<void> {
  const { token, maxAge } = createSessionToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: isHttps(request),
    path: "/",
    maxAge,
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Gate for every admin Route Handler:
 *
 *   const session = await requireAdmin(request);
 *   if (session instanceof Response) return session;
 */
export async function requireAdmin(request: Request): Promise<AdminSession | Response> {
  if (request.method !== "GET" && request.method !== "HEAD" && !isSameOrigin(request)) {
    return fail("Cross-site request blocked.", 403);
  }
  const session = await getAdminSession();
  if (!session) return fail("You need to sign in.", 401);
  return session;
}
