import { isAdminConfigured, startAdminSession, verifyCredentials } from "@/lib/auth";
import { clientIp, fail, isRecord, isSameOrigin, ok, readJson, tooManyRequests } from "@/lib/http";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-site request blocked.", 403);

  const key = `login:${clientIp(request)}`;
  const limit = rateLimit(key, 8, 15 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  if (!isAdminConfigured()) {
    return fail("The admin panel is locked: set ADMIN_PASSWORD (8+ characters) in the environment and restart the server.", 503);
  }

  const body = await readJson(request, 4_000);
  const username = isRecord(body) && typeof body.username === "string" ? body.username : "";
  const password = isRecord(body) && typeof body.password === "string" ? body.password : "";

  if (!verifyCredentials(username, password)) {
    await wait(450); // take the fun out of guessing
    return fail("Wrong username or password.", 401);
  }

  clearRateLimit(key);
  const user = username.trim();
  await startAdminSession(request, user);
  return ok({ user });
}
