import type { FieldErrors } from "@/lib/types";

/** A failed admin API call, with whatever detail the server gave. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * JSON fetch for the admin panel. Resolves with the response body (minus the
 * `ok` flag), throws ApiError otherwise. An expired session sends the browser
 * back to the login screen.
 */
export async function adminApi<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? "GET",
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  const data = (await response.json().catch(() => null)) as ({ ok?: boolean; error?: string; fieldErrors?: FieldErrors } & T) | null;

  if (response.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload on purpose: sign-in/out must drop every cached admin screen
    window.location.assign("/admin/login?expired=1");
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }
  if (!response.ok || !data || data.ok === false) {
    throw new ApiError(data?.error ?? `Request failed (${response.status}).`, response.status, data?.fieldErrors);
  }
  return data;
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.");
