import * as THREE from "three";
import { hash2 } from "./random";

/**
 * Procedural texture atlas — every block texture is painted pixel by pixel at
 * load time (no image files, all original artwork). 16×16 tiles on an 8×8 sheet.
 */

export const TILE = 16;
export const ATLAS_TILES = 8;

export const T = {
  SNOW: 0,
  SNOW_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  COBBLE: 4,
  LOG: 5,
  LOG_TOP: 6,
  LEAVES: 7,
  LEAVES_SNOW_SIDE: 8,
  LEAVES_SNOW_TOP: 9,
  PLANKS: 10,
  ROOF: 11,
  ROOF_SNOW_SIDE: 12,
  BRICK: 13,
  WINDOW: 14,
  DOOR_TOP: 15,
  DOOR_BOTTOM: 16,
  ICE: 17,
  PATH: 18,
  GIFT_RED: 19,
  GIFT_GREEN: 20,
  GIFT_BLUE: 21,
  GIFT_GOLD: 22,
  GIFT_VIOLET: 23,
  CANDY: 24,
  LANTERN: 25,
  GOLD: 26,
  COAL: 27,
  SNOWMAN_FACE: 28,
  CHEST_FRONT: 29,
  CHEST_SIDE: 30,
  CHEST_TOP: 31,
  ORN_RED: 32,
  ORN_GOLD: 33,
  ORN_BLUE: 34,
  ORN_PINK: 35,
  BEACON: 36,
  STONE_SNOW_SIDE: 37,
  ICE_STONE: 38,
} as const;

type Rgb = [number, number, number];

const hex = (value: string): Rgb => {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const css = ([r, g, b]: Rgb) => `rgb(${r | 0},${g | 0},${b | 0})`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scale = (a: Rgb, k: number): Rgb => [Math.min(255, a[0] * k), Math.min(255, a[1] * k), Math.min(255, a[2] * k)];

/** Pick from weighted colour stops using a per-pixel random value. */
function speckle(r: number, base: Rgb, stops: [number, Rgb][]): Rgb {
  let edge = 0;
  for (const [weight, color] of stops) {
    edge += weight;
    if (r < edge) return color;
  }
  return base;
}

type Painter = (x: number, y: number, r: number) => Rgb;

const SNOW = hex("#eef4ff");
const SNOW_BLUE = hex("#d7e5fb");
const WHITE = hex("#ffffff");
const DIRT = hex("#7a5433");
const STONE = hex("#7f8799");
const LEAF = hex("#1f5c3c");
const WOOD = hex("#a9773f");
const ROOF = hex("#5d3a22");
const BARK = hex("#573a24");

const snow: Painter = (_x, _y, r) => speckle(r, SNOW, [[0.1, SNOW_BLUE], [0.08, WHITE]]);
const dirt: Painter = (_x, _y, r) => speckle(r, DIRT, [[0.2, hex("#694628")], [0.16, hex("#8b6340")], [0.06, hex("#573920")]]);
const stone: Painter = (x, y, r) => {
  const crack = (x === 3 && y > 2 && y < 7) || (y === 6 && x > 3 && x < 8) || (x === 11 && y > 8 && y < 13) || (y === 12 && x > 7 && x < 11);
  if (crack) return hex("#5c6374");
  return speckle(r, STONE, [[0.2, hex("#6d7587")], [0.16, hex("#8f97a9")], [0.05, hex("#9aa2b4")]]);
};
const leaves: Painter = (_x, _y, r) => speckle(r, LEAF, [[0.24, hex("#184c31")], [0.2, hex("#2a7149")], [0.07, hex("#113a25")], [0.04, hex("#3a8a5c")]]);
const planks = (base: Rgb): Painter => (x, y, r) => {
  const row = y >> 2;
  if (y % 4 === 3) return scale(base, 0.68);
  if ((x + row * 5) % 16 === 0) return scale(base, 0.74);
  return speckle(r, base, [[0.16, scale(base, 0.9)], [0.12, scale(base, 1.1)]]);
};
const bark: Painter = (x, _y, r) => {
  if (x % 4 === 0 || x === 6 || x === 13) return scale(BARK, 0.72);
  return speckle(r, BARK, [[0.2, scale(BARK, 1.16)], [0.14, scale(BARK, 0.88)]]);
};

/** A drift of snow hanging over the top of another texture. */
const snowOver = (under: Painter, depth = 4): Painter => (x, y, r) => {
  const drip = depth + (hash2(x, 91, 7) > 0.45 ? 1 : 0) + (hash2(x, 37, 11) > 0.8 ? 1 : 0);
  return y < drip ? snow(x, y, r) : under(x, y, r);
};

const gift = (body: string, ribbon: string): Painter => {
  const base = hex(body);
  const band = hex(ribbon);
  return (x, y, r) => {
    if (x === 7 || x === 8 || y === 7 || y === 8) return (x + y) % 5 === 0 ? scale(band, 1.12) : band;
    if (x === 0 || y === 0 || x === 15 || y === 15) return scale(base, 0.7);
    return speckle(r, base, [[0.1, scale(base, 1.14)], [0.1, scale(base, 0.9)]]);
  };
};

const glow = (core: string, rim: string): Painter => {
  const a = hex(core);
  const b = hex(rim);
  return (x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) / 7.5;
    return mix(a, b, Math.min(1, d * d));
  };
};

const PAINTERS: Record<number, Painter> = {
  [T.SNOW]: snow,
  [T.SNOW_SIDE]: snowOver(dirt),
  [T.DIRT]: dirt,
  [T.STONE]: stone,
  [T.STONE_SNOW_SIDE]: snowOver(stone, 3),
  [T.COBBLE]: (x, y, r) => {
    const cell = hash2(x >> 2, (y + ((x >> 2) % 2) * 2) >> 2, 5);
    if (x % 4 === 0 || (y + ((x >> 2) % 2) * 2) % 4 === 0) return hex("#565d6e");
    return speckle(r, scale(STONE, 0.86 + cell * 0.3), [[0.12, hex("#6d7587")]]);
  },
  [T.LOG]: bark,
  [T.LOG_TOP]: (x, y) => {
    const d = Math.floor(Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)));
    if (d >= 7) return scale(BARK, 0.8);
    return d % 2 === 0 ? hex("#c59a62") : hex("#a57a48");
  },
  [T.LEAVES]: leaves,
  [T.LEAVES_SNOW_SIDE]: snowOver(leaves, 3),
  [T.LEAVES_SNOW_TOP]: (x, y, r) => (hash2(x, y, 23) > 0.86 ? leaves(x, y, r) : snow(x, y, r)),
  [T.PLANKS]: planks(WOOD),
  [T.ROOF]: planks(ROOF),
  [T.ROOF_SNOW_SIDE]: snowOver(planks(ROOF), 5),
  [T.BRICK]: (x, y, r) => {
    const row = y >> 2;
    if (y % 4 === 3 || (x + row * 4) % 8 === 0) return hex("#4a2620");
    return speckle(r, hex("#96493a"), [[0.2, hex("#84402f")], [0.14, hex("#a8584a")]]);
  },
  [T.WINDOW]: (x, y, r) => {
    if (x < 2 || y < 2 || x > 13 || y > 13 || x === 7 || x === 8 || y === 7 || y === 8) return hex("#4a2f18");
    return speckle(r, mix(hex("#ffe07a"), hex("#ffb347"), y / 15), [[0.12, hex("#fff3c0")]]);
  },
  [T.DOOR_TOP]: (x, y, r) => {
    if (x < 2 || x > 13 || y < 2) return hex("#2c1b0d");
    if (x > 4 && x < 11 && y > 4 && y < 12) return (x === 7 || x === 8) ? hex("#2c1b0d") : mix(hex("#ffd76b"), hex("#ffb347"), 0.4);
    return speckle(r, hex("#4f321a"), [[0.2, hex("#422914")]]);
  },
  [T.DOOR_BOTTOM]: (x, y, r) => {
    if (x < 2 || x > 13) return hex("#2c1b0d");
    if (x === 11 && (y === 3 || y === 4)) return hex("#ffc93c");
    if (x === 4 || x === 7 || x === 10) return hex("#422914");
    return speckle(r, hex("#4f321a"), [[0.2, hex("#5a3a20")]]);
  },
  [T.ICE]: (x, y, r) => {
    if ((x + y) % 9 === 0 || (x - y + 32) % 13 === 0) return hex("#e4f5ff");
    return speckle(r, hex("#9ed8ff"), [[0.14, hex("#86c8f5")], [0.1, hex("#b9e4ff")]]);
  },
  [T.ICE_STONE]: (x, y, r) => (hash2(x, y, 31) > 0.7 ? hex("#b9e4ff") : stone(x, y, r)),
  [T.PATH]: (_x, _y, r) => speckle(r, hex("#c5d2e8"), [[0.2, hex("#b1c0da")], [0.12, hex("#d9e4f5")], [0.05, hex("#9fb0cc")]]),
  [T.GIFT_RED]: gift("#d92f3f", "#ffd24a"),
  [T.GIFT_GREEN]: gift("#249c56", "#f3f7ff"),
  [T.GIFT_BLUE]: gift("#2f8fdc", "#ffd24a"),
  [T.GIFT_GOLD]: gift("#f2b01f", "#d92f3f"),
  [T.GIFT_VIOLET]: gift("#8a63f0", "#f3f7ff"),
  [T.CANDY]: (x, y) => (((x + y) >> 2) % 2 === 0 ? hex("#e63946") : hex("#ffffff")),
  [T.LANTERN]: (x, y) => {
    if (x < 2 || y < 2 || x > 13 || y > 13) return hex("#2b1c12");
    if (x === 7 || x === 8) return hex("#5a3a1c");
    return glow("#fff6cf", "#ffb02e")(x, y, 0);
  },
  [T.GOLD]: (x, y, r) => {
    if (x === 0 || y === 0) return hex("#fff6c2");
    if (x === 15 || y === 15) return hex("#e0a020");
    return speckle(r, hex("#ffd84f"), [[0.2, hex("#fff0a8")], [0.12, hex("#f2b82a")]]);
  },
  [T.COAL]: (_x, _y, r) => speckle(r, hex("#1c1c24"), [[0.2, hex("#2b2b36")], [0.08, hex("#101016")]]),
  [T.SNOWMAN_FACE]: (x, y, r) => {
    const eye = (x === 4 || x === 5 || x === 10 || x === 11) && (y === 4 || y === 5);
    const mouth = (y === 11 && (x === 4 || x === 11)) || (y === 12 && (x === 5 || x === 6 || x === 9 || x === 10)) || (y === 13 && (x === 7 || x === 8));
    if (eye || mouth) return hex("#1c1c24");
    if ((y === 7 || y === 8) && x >= 7 && x <= 10) return x > 8 ? hex("#e0701f") : hex("#f4873a");
    return snow(x, y, r);
  },
  [T.CHEST_FRONT]: (x, y, r) => {
    if (x === 0 || y === 0 || x === 15 || y === 15 || y === 5) return hex("#3d2714");
    if ((x === 7 || x === 8) && y >= 4 && y <= 8) return y === 6 ? hex("#fff0a8") : hex("#ffc93c");
    if (x === 1 || x === 14) return hex("#c98a12");
    return planks(WOOD)(x, y, r);
  },
  [T.CHEST_SIDE]: (x, y, r) => {
    if (x === 0 || y === 0 || x === 15 || y === 15 || y === 5) return hex("#3d2714");
    if (x === 1 || x === 14) return hex("#c98a12");
    return planks(WOOD)(x, y, r);
  },
  [T.CHEST_TOP]: (x, y, r) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return hex("#3d2714");
    if (x === 1 || x === 14 || y === 1 || y === 14) return hex("#c98a12");
    return planks(WOOD)(x, y, r);
  },
  [T.ORN_RED]: glow("#ffb0b0", "#ff3b4e"),
  [T.ORN_GOLD]: glow("#fff6c2", "#ffc12e"),
  [T.ORN_BLUE]: glow("#d9f3ff", "#3aa9ff"),
  [T.ORN_PINK]: glow("#ffe0f6", "#ff6fd0"),
  [T.BEACON]: glow("#ffffff", "#49e0ff"),
};

export function createAtlas(): THREE.CanvasTexture {
  const size = TILE * ATLAS_TILES;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas is unavailable");

  context.fillStyle = "#ff00ff"; // unpainted tiles show up immediately
  context.fillRect(0, 0, size, size);

  for (const [key, paint] of Object.entries(PAINTERS)) {
    const id = Number(key);
    const ox = (id % ATLAS_TILES) * TILE;
    const oy = Math.floor(id / ATLAS_TILES) * TILE;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        context.fillStyle = css(paint(x, y, hash2(x + id * 17, y + id * 29, 3)));
        context.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

/** UV rectangle of a tile, pulled in a hair to stop neighbours bleeding. */
export function tileUV(tile: number): { u0: number; v0: number; u1: number; v1: number } {
  const inset = 0.02 / ATLAS_TILES;
  const tx = tile % ATLAS_TILES;
  const ty = Math.floor(tile / ATLAS_TILES);
  return {
    u0: tx / ATLAS_TILES + inset,
    u1: (tx + 1) / ATLAS_TILES - inset,
    // Canvas textures are flipped vertically: row 0 of the sheet is v = 1.
    v0: 1 - (ty + 1) / ATLAS_TILES + inset,
    v1: 1 - ty / ATLAS_TILES - inset,
  };
}
