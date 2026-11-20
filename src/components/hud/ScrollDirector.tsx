"use client";

import { useEffect } from "react";
import { publishScroll } from "./scroll-store";

/**
 * Watches the page scroll and translates it into "which section, and how far
 * into the transition to the next one". Renders nothing.
 *
 * While a section covers the viewport the value holds steady (so the camera
 * rests on its shot, even through a tall form); it only moves during the one
 * screen of scrolling in which the next section slides in.
 */
export function ScrollDirector() {
  useEffect(() => {
    let ranges: { start: number; end: number }[] = [];
    let maxScroll = 1;
    let queued = 0;

    const measure = () => {
      const viewport = window.innerHeight;
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
      maxScroll = Math.max(1, document.documentElement.scrollHeight - viewport);
      ranges = sections.map((section) => {
        const top = section.getBoundingClientRect().top + window.scrollY;
        const start = Math.min(top, maxScroll);
        const end = Math.min(Math.max(start, top + section.offsetHeight - viewport), maxScroll);
        return { start, end };
      });
      update();
    };

    const update = () => {
      queued = 0;
      const y = window.scrollY;
      let progress = 0;
      for (let i = 0; i < ranges.length; i++) {
        const current = ranges[i];
        const next = ranges[i + 1];
        if (y <= current.end || !next) {
          progress = i;
          break;
        }
        if (y < next.start) {
          progress = i + (y - current.end) / Math.max(1, next.start - current.end);
          break;
        }
        progress = i + 1;
      }
      publishScroll(progress, Math.min(1, Math.max(0, y / maxScroll)));
    };

    const onScroll = () => {
      if (!queued) queued = requestAnimationFrame(update);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    // Fonts loading, the form growing, FAQ items opening: all change the layout.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);

    return () => {
      cancelAnimationFrame(queued);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  return null;
}
