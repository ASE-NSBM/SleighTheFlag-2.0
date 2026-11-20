import type { RegistrationStatus } from "./types";

/**
 * Browser-side fetch of the public registration status, shared by the hero
 * counter and the registration form so the page asks the server only once.
 */

let pending: Promise<RegistrationStatus | null> | null = null;
let fetchedAt = 0;

export function fetchRegistrationStatus(force = false): Promise<RegistrationStatus | null> {
  const fresh = performance.now() - fetchedAt < 15_000;
  if (pending && fresh && !force) return pending;
  fetchedAt = performance.now();
  pending = fetch("/api/public/status", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = (await response.json()) as { ok: boolean } & RegistrationStatus;
      return data.ok ? data : null;
    })
    .catch(() => null);
  return pending;
}
