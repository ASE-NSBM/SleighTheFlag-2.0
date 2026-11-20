"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Sprite } from "@/components/ui/Sprite";
import { nav } from "@/config/event";
import { getActive, getServerActive, scrollState, subscribeActive } from "./scroll-store";

const isTyping = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
};

function jumpTo(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

/**
 * The game-style heads-up display:
 *  • a top bar with the logo and the one primary action (Register)
 *  • on tablets and up: an item hotbar that doubles as section navigation,
 *    with an XP bar showing how far down the page you are (keys 1–9 jump)
 *  • on phones: a full-screen "inventory" menu
 */
export function Hud() {
  const active = useSyncExternalStore(subscribeActive, getActive, getServerActive);
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const fillRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  /* XP bar + top bar background follow the scroll without re-rendering. */
  useEffect(() => {
    let frame = 0;
    const paint = () => {
      frame = 0;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${scrollState.ratio.toFixed(4)})`;
      setSolid(window.scrollY > 24);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  /* Number keys select a hotbar slot, exactly like you would expect. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (event.key === "Escape") setMenuOpen(false);
      const index = Number.parseInt(event.key, 10) - 1;
      if (Number.isInteger(index) && index >= 0 && index < nav.length) {
        event.preventDefault();
        jumpTo(nav[index].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* While someone is filling in the form, the hotbar steps out of the way. */
  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      setTyping(Boolean(target && isTyping(target) && target.closest("#register")));
    };
    const onBlur = () => setTyping(false);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);

  /* Mobile menu: lock the page behind it and move focus in and back out. */
  useEffect(() => {
    if (!menuOpen) return;
    const button = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      button?.focus();
    };
  }, [menuOpen]);

  return (
    <>
      <header className="topbar" data-solid={solid}>
        <a href="#spawn" className="flex items-center gap-3 no-underline" aria-label="Sleigh The Flag 2.0 — back to the top">
          <Sprite name="flag" size={32} />
          <span className="font-pixel hidden text-[0.6875rem] leading-[1.5] text-snow-50 sm:block">
            Sleigh The Flag <span className="text-gold-400">2.0</span>
          </span>
        </a>

        <div className="flex items-center gap-4">
          <a href="#register" className="px-btn px-btn-berry px-btn-sm">
            <Sprite name="flag" size={16} />
            Register
          </a>
          <button
            ref={menuButtonRef}
            type="button"
            className="px-btn px-btn-ghost px-btn-icon md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="inventory-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Sprite name={menuOpen ? "close" : "menu"} size={24} />
          </button>
        </div>
      </header>

      {/* Phone navigation */}
      {menuOpen && (
        <div
          id="inventory-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site sections"
          className="fixed inset-0 z-50 overflow-y-auto bg-night-950/95 px-5 pb-10 pt-[calc(var(--top-h)+20px)] md:hidden"
        >
          <p className="kicker mb-5">Inventory</p>
          <nav aria-label="Sections" className="grid grid-cols-2 gap-5">
            {nav.map((item, index) => (
              <a
                key={item.id}
                ref={index === 0 ? firstLinkRef : undefined}
                href={`#${item.id}`}
                onClick={() => setMenuOpen(false)}
                aria-current={active === index ? "true" : undefined}
                className="px-box px-solid flex min-h-[88px] flex-col items-start justify-between gap-3 p-4 no-underline aria-[current=true]:[--box-border:var(--color-gold-400)]"
              >
                <Sprite name={item.sprite} size={32} />
                <span className="font-pixel text-[0.6875rem] text-snow-50">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* Tablet & desktop: XP bar + hotbar */}
      <div className="hud" data-tucked={typing}>
        <div className="xp" aria-hidden="true">
          <div ref={fillRef} className="xp-fill" style={{ transform: "scaleX(0)" }} />
          <div className="xp-ticks" />
          <span className="xp-level">{active + 1}</span>
        </div>
        <nav className="hotbar" aria-label="Page sections (keys 1 to 9)">
          {nav.map((item, index) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="slot"
              aria-label={`${item.label}: ${item.hint}`}
              aria-current={active === index ? "true" : undefined}
              aria-keyshortcuts={String(index + 1)}
            >
              <span className="slot-key" aria-hidden="true">
                {index + 1}
              </span>
              <Sprite name={item.sprite} size={32} />
              <span className="slot-tip" aria-hidden="true">
                {item.label}
                <small>{item.hint}</small>
              </span>
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
