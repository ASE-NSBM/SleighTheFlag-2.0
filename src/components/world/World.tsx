"use client";

import { useEffect, useRef } from "react";
import { scrollState } from "@/components/hud/scroll-store";
import { createWorld, type World as WorldHandle } from "./engine/createWorld";

/** Tells the loading curtain (and anything else) that the first frame is on screen. */
function announceReady() {
  document.documentElement.dataset.world = "ready";
  window.dispatchEvent(new Event("stf:world-ready"));
}

/**
 * The live voxel world behind the page. Client-only (loaded through
 * WorldMount) and purely decorative, so it is hidden from assistive tech.
 */
export default function World() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowPower = window.innerWidth < 768 || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;

    let world: WorldHandle;
    try {
      world = createWorld(canvas, { quality: lowPower ? "low" : "high", reducedMotion });
    } catch (error) {
      // No WebGL (old device, blocked GPU…): fall back to the CSS night sky.
      console.warn("[world] WebGL is unavailable, showing the static sky instead.", error);
      wrapper.dataset.fallback = "true";
      announceReady();
      return;
    }

    const pointer = { x: 0, y: 0 };
    let width = 0;
    let height = 0;
    let frameId = 0;
    let previous = performance.now();
    let announced = false;

    const render = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      world.frame(now / 1000, dt, { progress: scrollState.progress, pointerX: pointer.x, pointerY: pointer.y });
      if (!announced) {
        announced = true;
        announceReady();
      }
    };

    const loop = (now: number) => {
      frameId = requestAnimationFrame(loop);
      render(now);
    };

    const resize = () => {
      const nextWidth = wrapper.clientWidth;
      const nextHeight = wrapper.clientHeight;
      // Phone address bars resize the viewport constantly — ignore small height changes.
      if (nextWidth === width && Math.abs(nextHeight - height) < 120) return;
      width = nextWidth;
      height = nextHeight;
      world.resize(width, height);
      if (reducedMotion) render(performance.now());
    };

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const onVisibility = () => {
      cancelAnimationFrame(frameId);
      if (!document.hidden && !reducedMotion) {
        previous = performance.now();
        frameId = requestAnimationFrame(loop);
      }
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frameId);
      wrapper.dataset.fallback = "true";
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("webglcontextlost", onContextLost);
    document.addEventListener("visibilitychange", onVisibility);
    if (reducedMotion) {
      render(performance.now()); // one still frame, no animation loop
    } else {
      window.addEventListener("pointermove", onPointer, { passive: true });
      frameId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", onVisibility);
      world.dispose();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="world" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
