import "server-only";
import type { FieldErrors } from "./types";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

export function ok<T extends Record<string, unknown>>(data: T, status = 200): Response {
  return Response.json({ ok: true, ...data }, { status, headers: NO_STORE });
}

export function fail(error: string, status = 400, extra: { fieldErrors?: FieldErrors; headers?: Record<string, string> } = {}): Response {
  return Response.json(
    { ok: false, error, ...(extra.fieldErrors ? { fieldErrors: extra.fieldErrors } : {}) },
    { status, headers: { ...NO_STORE, ...extra.headers } },
  );
}

export function tooManyRequests(retryAfter: number): Response {
  return fail("Too many requests — slow down and try again in a moment.", 429, {
    headers: { "Retry-After": String(retryAfter) },
  });
}

/** Best-effort client address. Behind a proxy make sure it sets X-Forwarded-For. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return (request.headers.get("x-real-ip") || "local").slice(0, 64);
}

export function isHttps(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0]?.trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * CSRF guard for state-changing requests: when the browser tells us where the
 * request came from, it must be our own origin. (Non-browser clients send no
 * Origin header and are covered by the SameSite=Strict session cookie.)
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0]?.trim();
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Reads a JSON body with a hard size cap. Returns undefined when it is not valid JSON. */
export async function readJson(request: Request, maxBytes = 48_000): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) return undefined;
  try {
    const text = await request.text();
    if (text.length > maxBytes) return undefined;
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
