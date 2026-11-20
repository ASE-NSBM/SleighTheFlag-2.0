import { connection } from "next/server";
import { fail, ok } from "@/lib/http";
import { getRegistrationStatus } from "@/lib/teams";

/** Is registration open, and how many teams have joined so far? */
export async function GET() {
  // Always answer from live data — never from a build-time prerender.
  await connection();
  try {
    return ok({ ...(await getRegistrationStatus()) });
  } catch (error) {
    console.error("[status] unexpected failure:", error);
    return fail("Status is unavailable right now.", 500);
  }
}
