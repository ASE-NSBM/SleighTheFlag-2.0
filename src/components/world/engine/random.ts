/** Deterministic randomness — the world must look identical on every visit. */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash of an integer lattice point → [0, 1). */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hash3(x: number, y: number, z: number, seed = 0): number {
  return hash2(x + Math.imul(z | 0, 73856093), y + Math.imul(z | 0, 19349663), seed);
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth value noise → [0, 1). */
export function noise2(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = smooth(x - xi);
  const ty = smooth(y - yi);
  return lerp(
    lerp(hash2(xi, yi, seed), hash2(xi + 1, yi, seed), tx),
    lerp(hash2(xi, yi + 1, seed), hash2(xi + 1, yi + 1, seed), tx),
    ty,
  );
}

/** Fractal noise → roughly [0, 1). */
export function fbm2(x: number, y: number, seed = 0, octaves = 4): number {
  let sum = 0;
  let amplitude = 0.5;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x, y, seed + i * 101) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    x *= 2;
    y *= 2;
  }
  return sum / total;
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const smoothstep = (edge0: number, edge1: number, x: number) => smooth(clamp((x - edge0) / (edge1 - edge0), 0, 1));
export { lerp };
