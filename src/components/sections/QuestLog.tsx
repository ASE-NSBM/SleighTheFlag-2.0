"use client";

import { useEffect, useState } from "react";
import { Sprite } from "@/components/ui/Sprite";
import type { SpriteName } from "@/components/ui/sprites";

export interface Quest {
  title: string;
  note: string;
  sprite: SpriteName;
  at: string;
  day: string;
  time: string;
}

/** Marks each milestone as done / next / upcoming once the visitor's clock is known. */
export function QuestLog({ quests }: { quests: Quest[] }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = requestAnimationFrame(tick);
    const interval = window.setInterval(tick, 60_000);
    return () => {
      cancelAnimationFrame(first);
      window.clearInterval(interval);
    };
  }, []);

  const nextIndex = now === null ? -1 : quests.findIndex((quest) => new Date(quest.at).getTime() > now);

  return (
    <ol className="mt-7 list-none p-0">
      {quests.map((quest, index) => {
        const state = now === null ? "upcoming" : nextIndex === -1 || index < nextIndex ? "done" : index === nextIndex ? "next" : "upcoming";
        return (
          <li key={quest.title} className="quest" data-state={state}>
            <div className="quest-node">
              <Sprite name={state === "done" ? "check" : quest.sprite} size={state === "done" ? 24 : 32} className={state === "done" ? "text-pine-300" : undefined} />
            </div>
            <div className="pt-0.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h3 className="h-card">{quest.title}</h3>
                {state === "next" && <span className="px-chip px-chip-gold">Next up</span>}
                {state === "done" && <span className="px-chip px-chip-pine">Done</span>}
              </div>
              <p className="mt-2 text-gold-300">
                <time dateTime={quest.at}>
                  {quest.day} · {quest.time}
                </time>
              </p>
              <p className="mt-1 hidden text-[1.0625rem] leading-normal text-snow-300 sm:block">{quest.note}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
