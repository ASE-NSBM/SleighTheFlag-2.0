"use client";

import { useEffect } from "react";

/**
 * CTF players open DevTools before they read the page — so say hello there.
 * (A greeting only: nothing here is worth points.)
 */
export function ConsoleEgg() {
  useEffect(() => {
    const flag = ["  ▛▀▀▀▀▜", "  ▌ STF ▐▀▜", "  ▌ 2.0 ▐▄▟", "  ▌", "  ▌", " ▟▙"].join("\n");
    console.log(`%c${flag}`, "color:#e63946;font-family:monospace;font-size:14px;line-height:1.1");
    console.log(
      "%cLooking for flags already? Good instinct.%c\nThis one is just a warm-up and scores nothing:  STF{w3lc0m3_t0_th3_n0rth_p0l3}\nThe real ones are waiting on event day. Register your team first.",
      "color:#ffc93c;font-weight:bold;font-size:13px",
      "color:#9fb3d9;font-size:12px",
    );
  }, []);
  return null;
}
