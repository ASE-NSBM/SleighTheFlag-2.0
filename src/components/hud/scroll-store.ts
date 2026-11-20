/**
 * One tiny shared store for scroll position.
 *
 * `progress` is a float: 0 while the first section fills the screen, 1 while
 * the second does, 1.5 halfway through the transition between section 2 and 3…
 * The 3D camera reads it every frame; the HUD only re-renders when the
 * rounded value (`active`) changes.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export const scrollState = {
  /** Float section index. */
  progress: 0,
  /** Whole-page scroll ratio, 0 → 1. */
  ratio: 0,
  /** Index of the section currently in view. */
  active: 0,
};

export function publishScroll(progress: number, ratio: number): void {
  scrollState.progress = progress;
  scrollState.ratio = ratio;
  const active = Math.round(progress);
  if (active !== scrollState.active) {
    scrollState.active = active;
    listeners.forEach((listener) => listener());
  }
}

export function subscribeActive(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getActive = () => scrollState.active;
export const getServerActive = () => 0;
