import { endAdminSession } from "@/lib/auth";
import { fail, isSameOrigin, ok } from "@/lib/http";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Cross-site request blocked.", 403);
  await endAdminSession();
  return ok({});
}
