import { requireAdmin } from "@/lib/auth";
import { fail, isRecord, ok, readJson, serverFailure } from "@/lib/http";
import { ConflictError, createTeam, getRegistrationStatus, getSettings, listTeams } from "@/lib/teams";
import { isTeamStatus } from "@/lib/types";
import { validateTeam } from "@/lib/validation";

/** Everything the admin panel needs in one round trip. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (session instanceof Response) return session;

  try {
    const [teams, settings, status] = await Promise.all([listTeams(), getSettings(), getRegistrationStatus()]);
    return ok({ teams, settings, status, user: session.user });
  } catch (error) {
    console.error("[admin/teams] list failed:", error);
    return serverFailure(error, "Couldn't load the teams.", "admin");
  }
}

/** Add a team by hand (walk-ins, late approvals, fixes). */
export async function POST(request: Request) {
  const session = await requireAdmin(request);
  if (session instanceof Response) return session;

  const body = await readJson(request);
  if (!isRecord(body)) return fail("Invalid request body.");

  const parsed = validateTeam({ teamName: body.teamName, university: body.university, members: body.members }, { strict: false });
  if (!parsed.ok) return fail("Some details need another look.", 422, { fieldErrors: parsed.fieldErrors });

  try {
    const team = await createTeam(parsed.data, {
      source: "admin",
      status: isTeamStatus(body.status) ? body.status : "approved",
      notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : "",
    });
    return ok({ team }, 201);
  } catch (error) {
    if (error instanceof ConflictError) return fail("Some of these details are already registered.", 409, { fieldErrors: error.fieldErrors });
    console.error("[admin/teams] create failed:", error);
    return serverFailure(error, "Couldn't create the team.", "admin");
  }
}
