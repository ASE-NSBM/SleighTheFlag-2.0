import { TIMEZONE } from "@/config/event";
import { requireAdmin } from "@/lib/auth";
import { participantsSheet, teamsSheet, toCsv, toJson, toXlsx } from "@/lib/export";
import { fail } from "@/lib/http";
import { listTeams } from "@/lib/teams";
import { isTeamStatus } from "@/lib/types";

function download(body: BodyInit, filename: string, contentType: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * GET /api/admin/export?format=xlsx|csv|json&layout=teams|participants&status=…&ids=a,b,c
 */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (session instanceof Response) return session;

  const params = new URL(request.url).searchParams;
  const format = params.get("format") ?? "xlsx";
  const layout = params.get("layout") === "participants" ? "participants" : "teams";
  const status = params.get("status");
  const ids = new Set((params.get("ids") ?? "").split(",").filter(Boolean));

  try {
    let teams = await listTeams();
    if (isTeamStatus(status)) teams = teams.filter((team) => team.status === status);
    if (ids.size > 0) teams = teams.filter((team) => ids.has(team.id));
    teams.reverse(); // oldest first reads better in a spreadsheet

    const day = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
    const base = `sleigh-the-flag-${isTeamStatus(status) ? `${status}-` : ""}`;

    if (format === "json") {
      return download(toJson(teams), `${base}teams-${day}.json`, "application/json; charset=utf-8");
    }
    if (format === "csv") {
      const sheet = layout === "participants" ? participantsSheet(teams) : teamsSheet(teams);
      return download(toCsv(sheet), `${base}${layout}-${day}.csv`, "text/csv; charset=utf-8");
    }
    if (format === "xlsx") {
      const workbook = toXlsx([teamsSheet(teams), participantsSheet(teams)]);
      return download(new Uint8Array(workbook), `${base}registrations-${day}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }
    return fail("Unknown export format.", 422);
  } catch (error) {
    console.error("[admin/export] failed:", error);
    return fail("Couldn't build the export.", 500);
  }
}
