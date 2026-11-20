import { requireAdmin } from "@/lib/auth";
import { fail, isRecord, ok, readJson, serverFailure } from "@/lib/http";
import { deleteTeams, setTeamsStatus } from "@/lib/teams";
import type { TeamStatus } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_ACTIONS: Record<string, TeamStatus> = { approve: "approved", reject: "rejected", pending: "pending" };

/** Approve / reject / reset / delete many teams at once. */
export async function POST(request: Request) {
  const session = await requireAdmin(request);
  if (session instanceof Response) return session;

  const body = await readJson(request, 200_000);
  if (!isRecord(body) || !Array.isArray(body.ids) || typeof body.action !== "string") return fail("Invalid request body.");

  const ids = [...new Set(body.ids.filter((id): id is string => typeof id === "string" && UUID.test(id)))].slice(0, 500);
  if (ids.length === 0) return fail("Select at least one team.");

  try {
    if (body.action === "delete") return ok({ affected: await deleteTeams(ids) });
    const status = STATUS_ACTIONS[body.action];
    if (!status) return fail("Unknown action.", 422);
    return ok({ affected: await setTeamsStatus(ids, status) });
  } catch (error) {
    console.error("[admin/teams] bulk action failed:", error);
    return serverFailure(error, "Couldn't apply that action.", "admin");
  }
}
