import { clientIp, fail, ok, serverFailure, tooManyRequests } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { isTeamNameTaken } from "@/lib/teams";
import { validateTeamName } from "@/lib/validation";

/** Live "is this team name free?" check for the registration form. */
export async function GET(request: Request) {
  const limit = rateLimit(`team-name:${clientIp(request)}`, 300, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const name = new URL(request.url).searchParams.get("name") ?? "";
  const parsed = validateTeamName(name);
  if (!parsed.ok) return fail(parsed.fieldErrors.teamName, 422);

  try {
    return ok({ name: parsed.data, available: !(await isTeamNameTaken(parsed.data)) });
  } catch (error) {
    console.error("[team-name] unexpected failure:", error);
    return serverFailure(error, "Couldn't check that name right now.", "public");
  }
}
