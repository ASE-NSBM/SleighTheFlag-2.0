"use client";

import dynamic from "next/dynamic";

/**
 * three.js only ever runs in the browser, and it is heavy — so the world is
 * split into its own chunk and loaded after the page itself is interactive.
 */
const World = dynamic(() => import("./World"), { ssr: false });

export function WorldMount() {
  return (
    <>
      <World />
      <div className="world-veil" aria-hidden="true" />
    </>
  );
}
