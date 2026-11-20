"use client";

import { useEffect, useState } from "react";
import { Sprite } from "@/components/ui/Sprite";
import { fetchRegistrationStatus } from "@/lib/client-status";
import { plural } from "@/lib/format";
import type { RegistrationStatus } from "@/lib/types";

/** "12 teams from 5 universities have joined" — live social proof under the hero buttons. */
export function LiveCount() {
  const [status, setStatus] = useState<RegistrationStatus | null>(null);

  useEffect(() => {
    let alive = true;
    const load = (force = false) =>
      fetchRegistrationStatus(force).then((next) => {
        if (alive && next) setStatus(next);
      });
    load();
    // Refresh when someone on this page finishes registering.
    const onRegistered = () => load(true);
    window.addEventListener("stf:registered", onRegistered);
    return () => {
      alive = false;
      window.removeEventListener("stf:registered", onRegistered);
    };
  }, []);

  // Reserve the line's height either way so nothing jumps when the number arrives.
  return (
    <p className="flex min-h-[28px] items-center gap-3 text-[1.0625rem] text-snow-200" aria-live="polite">
      {status && status.teams > 0 && (
        <>
          <Sprite name="party" size={24} className="hidden sm:block" />
          <span>
            <strong className="text-gold-300">{plural(status.teams, "team")}</strong> from{" "}
            <strong className="text-gold-300">{plural(status.universities, "university", "universities")}</strong> already on the island
          </span>
        </>
      )}
      {status && status.teams === 0 && status.open && <span>Be the first team to plant a flag.</span>}
    </p>
  );
}
