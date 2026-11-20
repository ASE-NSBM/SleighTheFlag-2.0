"use client";

import { useEffect, useState } from "react";
import { event } from "@/config/event";

const closes = new Date(event.dates.registrationCloses).getTime();
const starts = new Date(event.dates.eventStart).getTime();
const ends = new Date(event.dates.eventEnd).getTime();

function phase(now: number): { label: string; target: number | null } {
  if (now < closes) return { label: "Registration closes in", target: closes };
  if (now < starts) return { label: "The hunt begins in", target: starts };
  if (now < ends) return { label: "The hunt is live — scoreboard freezes in", target: ends };
  return { label: "This season's hunt is over. See you next winter.", target: null };
}

const two = (value: number) => String(value).padStart(2, "0");

/** Ticks down to the next milestone (registration deadline → start → end). */
export function Countdown() {
  // The clock is unknown on the server; it starts once the page is live.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = requestAnimationFrame(tick);
    const interval = window.setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(first);
      window.clearInterval(interval);
    };
  }, []);

  const current = now === null ? { label: "Registration closes in", target: closes } : phase(now);
  const left = now === null || current.target === null ? null : Math.max(0, current.target - now);
  const cells: [string, string][] =
    left === null
      ? [["--", "Days"], ["--", "Hours"], ["--", "Mins"], ["--", "Secs"]]
      : [
          [two(Math.floor(left / 86_400_000)), "Days"],
          [two(Math.floor(left / 3_600_000) % 24), "Hours"],
          [two(Math.floor(left / 60_000) % 60), "Mins"],
          [two(Math.floor(left / 1000) % 60), "Secs"],
        ];

  return (
    <div>
      <p className="kicker">{current.label}</p>
      {(now === null || current.target !== null) && (
        // A ticking clock read aloud every second helps nobody: the timer is exposed once, as a label.
        <div
          className="mt-4 flex gap-4 sm:gap-5"
          role="timer"
          aria-label={left === null ? "Loading countdown" : `${cells[0][0]} days, ${cells[1][0]} hours and ${cells[2][0]} minutes left`}
        >
          {cells.map(([value, label]) => (
            <div key={label} aria-hidden="true">
              <div className="digit">{value}</div>
              <div className="digit-label">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
