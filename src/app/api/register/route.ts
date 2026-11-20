import { organizer } from "@/config/event";
import { clientIp, fail, isRecord, ok, readJson, tooManyRequests } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { ConflictError, createTeam, getRegistrationStatus } from "@/lib/teams";
import type { RegistrationReason } from "@/lib/types";
import { validateTeam } from "@/lib/validation";

const CLOSED_MESSAGE: Record<Exclude<RegistrationReason, "open">, string> = {
  paused: "Registrations are paused right now. Check back soon.",
  "not-yet": "Registrations haven't opened yet.",
  deadline: "Registrations have closed.",
  full: "All team slots have been taken.",
};

/** Public team registration. */
export async function POST(request: Request) {
  // Generous on purpose: a whole campus can sit behind one Wi-Fi address, and
  // launch day sends everyone here at once. This only has to stop scripted floods.
  const limit = rateLimit(`register:${clientIp(request)}`, 150, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const body = await readJson(request);
  if (!isRecord(body)) return fail("We couldn't read that request. Refresh the page and try again.");

  // Honeypot: hidden from people, irresistible to form-filling bots.
  if (typeof body.fax === "string" && body.fax.trim() !== "") {
    return fail("We couldn't process that submission. Refresh the page and try again.");
  }

  if (body.consent !== true) {
    return fail("Please confirm the declaration before submitting.", 422, {
      fieldErrors: { consent: "Tick the box to confirm your details and accept the rules." },
    });
  }

  try {
    const status = await getRegistrationStatus();
    if (!status.open) return fail(CLOSED_MESSAGE[status.reason as Exclude<RegistrationReason, "open">], 403);

    const parsed = validateTeam({ teamName: body.teamName, university: body.university, members: body.members });
    if (!parsed.ok) return fail("Some details need another look.", 422, { fieldErrors: parsed.fieldErrors });

    const team = await createTeam(parsed.data, { source: "public" });
    return ok(
      {
        code: team.code,
        teamName: team.name,
        university: team.university,
        members: team.members.map((member) => ({ fullName: member.fullName, isLeader: member.isLeader })),
      },
      201,
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      return fail("Some of these details are already registered.", 409, { fieldErrors: error.fieldErrors });
    }
    console.error("[register] unexpected failure:", error);
    return fail(`Something went wrong on our side. Please try again, or email ${organizer.email}.`, 500);
  }
}
