import { requireAdmin } from "@/lib/auth";
import { fail, isRecord, ok, readJson } from "@/lib/http";
import { getRegistrationStatus, updateSettings } from "@/lib/teams";
import type { AdminSettings } from "@/lib/types";

/** Open / pause registration, cap the number of teams, override the deadline. */
export async function PATCH(request: Request) {
  const session = await requireAdmin(request);
  if (session instanceof Response) return session;

  const body = await readJson(request, 4_000);
  if (!isRecord(body)) return fail("Invalid request body.");

  const patch: Partial<AdminSettings> = {};
  if (typeof body.registrationOpen === "boolean") patch.registrationOpen = body.registrationOpen;
  if (typeof body.ignoreDeadline === "boolean") patch.ignoreDeadline = body.ignoreDeadline;
  if (body.maxTeams === null) patch.maxTeams = null;
  else if (typeof body.maxTeams === "number" && Number.isFinite(body.maxTeams)) {
    if (body.maxTeams < 1 || body.maxTeams > 100_000) return fail("The team cap must be between 1 and 100,000.", 422);
    patch.maxTeams = Math.floor(body.maxTeams);
  }

  if (Object.keys(patch).length === 0) return fail("Nothing to update.");

  try {
    const settings = await updateSettings(patch);
    return ok({ settings, status: await getRegistrationStatus() });
  } catch (error) {
    console.error("[admin/settings] update failed:", error);
    return fail("Couldn't save the settings.", 500);
  }
}
