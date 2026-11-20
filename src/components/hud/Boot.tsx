"use client";

import { useEffect, useRef } from "react";
import { Sprite } from "@/components/ui/Sprite";

/**
 * The "generating world…" curtain shown while the 3D scene builds its first
 * frame. It lifts on the world's ready signal, after a short timeout, and —
 * through a CSS animation — even if JavaScript never runs at all.
 */
export function Boot() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const curtain = ref.current;
    if (!curtain) return;
    const lift = () => curtain.setAttribute("data-done", "true");
    if (document.documentElement.dataset.world === "ready") {
      lift();
      return;
    }
    window.addEventListener("stf:world-ready", lift, { once: true });
    const timeout = window.setTimeout(lift, 4500);
    return () => {
      window.removeEventListener("stf:world-ready", lift);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div ref={ref} className="boot" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-7 text-center">
        <Sprite name="flag" size={64} className="float" />
        <p className="font-pixel text-[0.8125rem] leading-[1.8] text-snow-50">Generating world…</p>
        <div className="boot-bar">
          <i />
        </div>
        <p className="font-pixel max-w-[30ch] text-[0.5625rem] leading-[2] tracking-wider text-wood-300">
          Tip: press 1–9 to jump between sections
        </p>
      </div>
    </div>
  );
}
