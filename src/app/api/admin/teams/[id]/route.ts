import { requireAdmin } from "@/lib/auth";
import { fail, isRecord, ok, readJson, serverFailure } from "@/lib/http";
import { ConflictError, deleteTeams, updateTeam } from "@/lib/teams";
import { isTeamStatus, type TeamInput, type TeamStatus } from "@/lib/types";
import { validateTeam } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Edit details, change status or update notes — any combination. */
export async function PATCH(request: Request, context: RouteContext<"/api/admin/teams/[id]">) {
  const session = await requireAdmin(request);
  if (session instanceof Response) return session;

  const { id } = await context.params;
  if (!UUID.test(id)) return fail("Unknown team.", 404);

  const body = await readJson(request);
  if (!isRecord(body)) return fail("Invalid request body.");

  const patch: { team?: TeamInput; status?: TeamStatus; notes?: string } = {};

  if ("teamName" in body || "university" in body || "members" in body) {
    const parsed = validateTeam({ teamName: body.teamName, university: body.university, members: body.members }, { strict: false });
    if (!parsed.ok) return fail("Some details need another look.", 422, { fieldErrors: parsed.fieldErrors });
    patch.team = parsed.data;
  }
  if ("status" in body) {
    if (!isTeamStatus(body.status)) return fail("Unknown status.", 422);
    patch.status = body.status;
  }
  if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 2000);

  if (!patch.team && !patch.status && patch.notes === undefined) return fail("Nothing to update.");

  try {
    const team = await updateTeam(id, patch);
    if (!team) return fail("That team no longer exists.", 404);
    return ok({ team });
  } catch (error) {
    if (error instanceof ConflictError) return fail("Some of these details are already registered.", 409, { fieldErrors: error.fieldErrors });
    console.error("[admin/teams] update failed:", error);
    return serverFailure(error, "Couldn't save the changes.", "admin");
  }
}

export async function DELETE(request: Request, context: RouteContext<"/api/admin/teams/[id]">) {
  const session = await requireAdmin(request);
  if (session instanceof Response) return session;

  const { id } = await context.params;
  if (!UUID.test(id)) return fail("Unknown team.", 404);

  try {
    const removed = await deleteTeams([id]);
    if (removed === 0) return fail("That team no longer exists.", 404);
    return ok({ removed });
  } catch (error) {
    console.error("[admin/teams] delete failed:", error);
    return serverFailure(error, "Couldn't remove the team.", "admin");
  }
}
