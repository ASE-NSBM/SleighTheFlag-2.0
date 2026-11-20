import { B, VoxelGrid, type PointLight } from "./voxels";
import { clamp, fbm2, hash2, hash3, lerp, smoothstep } from "./random";

/**
 * The floating North-Pole island: terrain, the village, the great tree and
 * the flag peak. Everything is generated from fixed seeds, so the world is
 * identical for every visitor.
 */

export type Rgb = [number, number, number];

export interface GlowPoint {
  x: number;
  y: number;
  z: number;
  color: Rgb;
  size: number;
  /** 0 = steady light, 1 = twinkles hard. */
  twinkle: number;
}

export interface WorldData {
  grid: VoxelGrid;
  lights: PointLight[];
  glows: GlowPoint[];
  /** Named places the camera and the effects aim at. */
  anchors: {
    treeBase: [number, number, number];
    star: [number, number, number];
    chimney: [number, number, number];
    flagBase: [number, number, number];
  };
}

/* Landmarks (world x, z). */
const TREE = { x: 2, z: 2 };
const PEAK = { x: -13, z: -11 };
const POND = { x: 14, z: 11 };
const CABIN = { x0: 9, x1: 15, z0: -12, z1: -8 }; // front wall is z1, facing +Z

const WARM: Rgb = [1.0, 0.7, 0.34];
const GOLD: Rgb = [1.0, 0.84, 0.42];
const RED: Rgb = [1.0, 0.26, 0.3];
const BLUE: Rgb = [0.3, 0.66, 1.0];
const PINK: Rgb = [1.0, 0.45, 0.82];
const GREEN: Rgb = [0.35, 1.0, 0.55];
const CYAN: Rgb = [0.4, 0.9, 1.0];
const BULBS: Rgb[] = [RED, GOLD, BLUE, PINK, GREEN];

const edgeRadius = (angle: number) => 26 + 3.2 * Math.sin(angle * 3 + 0.6) + 2.2 * Math.sin(angle * 5 + 2.1) + 1.4 * Math.sin(angle * 9 + 4.0);

const mountainAt = (x: number, z: number) => {
  const d2 = (x - PEAK.x) ** 2 + (z - PEAK.z) ** 2;
  return 11.2 * Math.exp(-d2 / (2 * 4.9 * 4.9)) + 2.6 * Math.exp(-d2 / (2 * 9 * 9));
};

function groundHeight(x: number, z: number): number | null {
  const r = Math.hypot(x, z);
  const edge = edgeRadius(Math.atan2(z, x));
  if (r > edge) return null;

  let h = fbm2(x * 0.075 + 40, z * 0.075 + 40, 11, 3) * 4.2 - 1.7;

  // The village green around the tree and the cabin is flat.
  const green = Math.max(
    1 - smoothstep(8.5, 12.5, Math.hypot(x - TREE.x, z - TREE.z)),
    1 - smoothstep(5.5, 8.5, Math.hypot(x - 12, z + 10)),
  );
  h = lerp(h, 0, green);

  h += mountainAt(x, z);

  // The pond sits one block down.
  const pond = Math.hypot(x - POND.x, z - POND.z);
  if (pond < 6.5) h = lerp(-1, h, smoothstep(4.6, 6.5, pond));

  // The rim falls away.
  h -= smoothstep(edge - 5, edge, r) * 2.2;
  return Math.round(h);
}

/** Layers of a blocky spruce, bottom to top (radius per layer). */
const SPRUCE = {
  small: { trunk: 1, layers: [1, 1, 0] },
  medium: { trunk: 2, layers: [2, 1, 2, 1, 1, 0] },
  tall: { trunk: 3, layers: [3, 2, 3, 2, 1, 2, 1, 1, 0] },
};

function disk(grid: VoxelGrid, cx: number, y: number, cz: number, radius: number, roundness: number, place: (x: number, z: number, d: number) => void) {
  const limit = (radius + roundness) ** 2;
  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const d2 = dx * dx + dz * dz;
      if (d2 <= limit) place(cx + dx, cz + dz, Math.sqrt(d2));
    }
  }
}

function plantSpruce(grid: VoxelGrid, glows: GlowPoint[], x: number, groundY: number, z: number, kind: keyof typeof SPRUCE, seed: number) {
  const { trunk, layers } = SPRUCE[kind];
  for (let i = 1; i <= trunk + layers.length - 2; i++) grid.setIfAir(x, groundY + i, z, B.LOG);
  layers.forEach((radius, i) => {
    const y = groundY + trunk + 1 + i;
    disk(grid, x, y, z, radius, 0.3, (bx, bz) => {
      if (grid.get(bx, y, bz) === 0 || grid.get(bx, y, bz) === B.LOG) grid.set(bx, y, bz, B.LEAVES);
    });
  });
  // Snow settles on every leaf block that can see the sky.
  layers.forEach((radius, i) => {
    const y = groundY + trunk + 1 + i;
    disk(grid, x, y, z, radius, 0.3, (bx, bz) => {
      if (grid.get(bx, y, bz) === B.LEAVES && grid.get(bx, y + 1, bz) === 0 && hash3(bx, y, bz, seed) > 0.22) grid.set(bx, y, bz, B.LEAVES_SNOW);
    });
  });
  // A few fairy lights.
  const bulbs = kind === "small" ? 2 : kind === "medium" ? 5 : 8;
  for (let i = 0; i < bulbs; i++) {
    const layer = Math.floor(hash2(i, seed, 61) * (layers.length - 1));
    const radius = layers[layer] + 0.62;
    const angle = hash2(i, seed, 62) * Math.PI * 2;
    glows.push({
      x: x + 0.5 + Math.cos(angle) * radius,
      y: groundY + trunk + 1.4 + layer,
      z: z + 0.5 + Math.sin(angle) * radius,
      color: BULBS[Math.floor(hash2(i, seed, 63) * BULBS.length)],
      size: 1.5,
      twinkle: 0.85,
    });
  }
}

export function buildIsland(): WorldData {
  const grid = new VoxelGrid(72, 58, 72, -36, -24, -36);
  const lights: PointLight[] = [];
  const glows: GlowPoint[] = [];
  const heights = new Map<number, number>();
  const key = (x: number, z: number) => (x + 64) * 256 + (z + 64);
  const ground = (x: number, z: number) => heights.get(key(x, z)) ?? null;

  /* ── terrain ─────────────────────────────────────────────────────── */
  for (let z = -36; z < 36; z++) {
    for (let x = -36; x < 36; x++) {
      const h = groundHeight(x, z);
      if (h === null) continue;
      heights.set(key(x, z), h);

      const r = Math.hypot(x, z);
      const edge = edgeRadius(Math.atan2(z, x));
      let bottom = -Math.round((1 - Math.pow(r / edge, 1.7)) * 15 + fbm2(x * 0.16, z * 0.16, 77, 3) * 5) - 1;
      const spike = hash2(x, z, 5);
      if (spike > 0.93) bottom -= 2 + Math.floor((spike - 0.93) * 60);
      bottom = Math.min(bottom, h - 1);

      const rocky = mountainAt(x, z) > 2.1;
      for (let y = bottom; y <= h; y++) {
        let id: number;
        if (y === h) id = rocky ? B.SNOW_STONE : B.SNOW_GROUND;
        else if (!rocky && y >= h - 3) id = B.DIRT;
        else id = y <= bottom + 1 && hash3(x, y, z, 9) > 0.45 ? B.ICE_STONE : B.STONE;
        grid.set(x, y, z, id);
      }

      if (Math.hypot(x - POND.x, z - POND.z) < 4.8) {
        grid.set(x, h, z, B.STONE);
        grid.set(x, 0, z, B.ICE);
        heights.set(key(x, z), 0);
      }
    }
  }

  /* ── paths: a ring around the tree, a lane to the cabin, a trail to the peak ── */
  const pathCells = new Set<number>();
  const pave = (x: number, z: number) => {
    const gx = Math.round(x);
    const gz = Math.round(z);
    const h = ground(gx, gz);
    if (h === null) return;
    if (grid.get(gx, h, gz) === B.SNOW_GROUND) {
      grid.set(gx, h, gz, B.PATH);
      pathCells.add(key(gx, gz));
    }
  };
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    for (const radius of [7.4, 8.2]) pave(TREE.x + Math.cos(a) * radius, TREE.z + Math.sin(a) * radius);
  }
  const lane = (points: [number, number][]) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i];
      const [bx, bz] = points[i + 1];
      const steps = Math.ceil(Math.hypot(bx - ax, bz - az) * 3);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = lerp(ax, bx, t);
        const z = lerp(az, bz, t);
        pave(x, z);
        pave(x + 0.7, z);
        pave(x, z + 0.7);
      }
    }
  };
  lane([[12, -7], [11, -5], [9, -4], [8, -3]]);
  lane([[-5.4, 1], [-8, -2], [-9.5, -5], [-10, -7]]);
  const nearPath = (x: number, z: number, radius: number) => {
    for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) if (pathCells.has(key(x + dx, z + dz))) return true;
    return false;
  };

  /* ── the cabin ───────────────────────────────────────────────────── */
  {
    const { x0, x1, z0, z1 } = CABIN;
    // Level the plot.
    for (let z = z0 - 1; z <= z1 + 1; z++) {
      for (let x = x0 - 1; x <= x1 + 1; x++) {
        const h = ground(x, z);
        if (h === null) continue;
        for (let y = h + 1; y <= 12; y++) grid.set(x, y, z, B.AIR);
        for (let y = Math.min(h, 0); y <= 0; y++) if (grid.get(x, y, z) === 0 || y === 0) grid.set(x, y, z, y === 0 ? B.SNOW_GROUND : B.DIRT);
        heights.set(key(x, z), 0);
      }
    }
    // Stone footing, plank walls, log corners.
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const wall = x === x0 || x === x1 || z === z0 || z === z1;
        const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
        if (!wall) continue;
        grid.set(x, 1, z, corner ? B.LOG : B.COBBLE);
        for (let y = 2; y <= 4; y++) grid.set(x, y, z, corner ? B.LOG : B.PLANKS);
      }
    }
    grid.set(12, 1, z1, B.DOOR_BOTTOM);
    grid.set(12, 2, z1, B.DOOR_TOP);
    for (const [x, z] of [[10, z1], [14, z1], [x0, -10], [x1, -10]] as const) grid.set(x, 3, z, B.WINDOW);
    // Stepped, snow-loaded roof with an overhang.
    for (let i = 0; i <= 3; i++) {
      for (let z = z0 - 1 + i; z <= z1 + 1 - i; z++) for (let x = x0 - 1; x <= x1 + 1; x++) grid.set(x, 5 + i, z, B.ROOF_SNOW);
    }
    // Chimney.
    for (let y = 6; y <= 9; y++) grid.set(14, y, z0, B.BRICK);
    // Lantern post by the door.
    grid.set(10, 1, z1 + 3, B.COBBLE);
    grid.set(10, 2, z1 + 3, B.LOG);
    grid.set(10, 3, z1 + 3, B.LANTERN);

    lights.push(
      { x: 10.5, y: 3.5, z: z1 + 1.4, color: WARM, radius: 8.5, intensity: 0.95 },
      { x: 14.5, y: 3.5, z: z1 + 1.4, color: WARM, radius: 8.5, intensity: 0.95 },
      { x: 12.5, y: 2.2, z: z1 + 1.3, color: WARM, radius: 5, intensity: 0.5 },
      { x: x0 - 0.6, y: 3.5, z: -9.5, color: WARM, radius: 6.5, intensity: 0.8 },
      { x: x1 + 1.6, y: 3.5, z: -9.5, color: WARM, radius: 6.5, intensity: 0.8 },
      { x: 10.5, y: 3.6, z: z1 + 3.5, color: WARM, radius: 9, intensity: 1.0 },
    );
    glows.push(
      { x: 10.5, y: 3.5, z: z1 + 1.06, color: WARM, size: 4.6, twinkle: 0.12 },
      { x: 14.5, y: 3.5, z: z1 + 1.06, color: WARM, size: 4.6, twinkle: 0.12 },
      { x: x0 - 0.06, y: 3.5, z: -9.5, color: WARM, size: 4, twinkle: 0.12 },
      { x: x1 + 1.06, y: 3.5, z: -9.5, color: WARM, size: 4, twinkle: 0.12 },
      { x: 10.5, y: 3.5, z: z1 + 3.5, color: WARM, size: 5.4, twinkle: 0.2 },
    );
  }

  /* ── the great tree ──────────────────────────────────────────────── */
  const treeGround = ground(TREE.x, TREE.z) ?? 0;
  const treeLayers = [5, 4, 3, 4, 3, 2, 3, 2, 1, 2, 1, 1, 0];
  {
    const base = treeGround + 3;
    for (let y = treeGround + 1; y < base + treeLayers.length - 1; y++) grid.set(TREE.x, y, TREE.z, B.LOG);
    treeLayers.forEach((radius, i) => {
      const y = base + i;
      disk(grid, TREE.x, y, TREE.z, radius, 0.5, (x, z) => {
        if (x !== TREE.x || z !== TREE.z || radius === 0) grid.set(x, y, z, B.LEAVES);
      });
    });
    const ornaments = [B.ORN_RED, B.ORN_GOLD, B.ORN_BLUE, B.ORN_PINK];
    const ornamentColor: Record<number, Rgb> = { [B.ORN_RED]: RED, [B.ORN_GOLD]: GOLD, [B.ORN_BLUE]: BLUE, [B.ORN_PINK]: PINK };
    treeLayers.forEach((radius, i) => {
      const y = base + i;
      disk(grid, TREE.x, y, TREE.z, radius, 0.5, (x, z, d) => {
        if (grid.get(x, y, z) !== B.LEAVES) return;
        const open = grid.get(x, y + 1, z) === 0;
        const rim = d > radius - 0.9 && radius > 0;
        const roll = hash3(x, y, z, 808);
        if (rim && roll > 0.8) {
          const id = ornaments[Math.floor(hash3(x, y, z, 809) * ornaments.length)];
          grid.set(x, y, z, id);
          glows.push({ x: x + 0.5, y: y + 0.5, z: z + 0.5, color: ornamentColor[id], size: 3, twinkle: 0.6 });
        } else if (open && roll > 0.18) {
          grid.set(x, y, z, B.LEAVES_SNOW);
        }
      });
    });
    const starY = base + treeLayers.length;
    grid.set(TREE.x, starY, TREE.z, B.STAR);
    glows.push({ x: TREE.x + 0.5, y: starY + 0.5, z: TREE.z + 0.5, color: GOLD, size: 13, twinkle: 0.25 });

    // A spiral of fairy lights wraps the tree.
    for (let i = 0; i < 64; i++) {
      const t = i / 64;
      const layer = Math.min(treeLayers.length - 1, Math.floor(t * treeLayers.length));
      const radius = treeLayers[layer] + 0.85;
      const angle = t * Math.PI * 9;
      glows.push({
        x: TREE.x + 0.5 + Math.cos(angle) * radius,
        y: base + 0.3 + t * (treeLayers.length - 0.6),
        z: TREE.z + 0.5 + Math.sin(angle) * radius,
        color: BULBS[i % BULBS.length],
        size: 1.7,
        twinkle: 0.9,
      });
    }

    lights.push(
      { x: TREE.x + 0.5, y: starY + 1, z: TREE.z + 0.5, color: GOLD, radius: 13, intensity: 1.0 },
      { x: TREE.x + 0.5, y: treeGround + 2.2, z: TREE.z + 7, color: WARM, radius: 9.5, intensity: 0.62 },
      { x: TREE.x + 7, y: treeGround + 2.2, z: TREE.z + 0.5, color: RED, radius: 8, intensity: 0.5 },
      { x: TREE.x - 6, y: treeGround + 2.2, z: TREE.z + 0.5, color: BLUE, radius: 8, intensity: 0.5 },
      { x: TREE.x + 0.5, y: treeGround + 2.2, z: TREE.z - 6, color: PINK, radius: 8, intensity: 0.45 },
      { x: TREE.x + 4.5, y: treeGround + 8, z: TREE.z + 4.5, color: GOLD, radius: 7, intensity: 0.4 },
      { x: TREE.x - 3.5, y: treeGround + 9, z: TREE.z + 4, color: GREEN, radius: 6, intensity: 0.3 },
    );
  }

  /* ── presents and the chest under the tree ───────────────────────── */
  const gifts = [B.GIFT_RED, B.GIFT_GREEN, B.GIFT_BLUE, B.GIFT_GOLD, B.GIFT_VIOLET];
  const giftSpots: [number, number, number][] = [
    [-3, 6, 1], [-2, 7, 2], [0, 8, 1], [1, 7, 1], [5, 8, 2], [6, 7, 1], [7, 5, 1], [8, 3, 1],
    [-4, 4, 1], [-4, 1, 2], [-3, -2, 1], [7, 0, 1], [6, -2, 1], [0, -4, 1], [3, -4, 2],
  ];
  giftSpots.forEach(([x, z, stack], i) => {
    const h = ground(x, z);
    if (h === null) return;
    for (let s = 0; s < stack; s++) grid.setIfAir(x, h + 1 + s, z, gifts[(i + s * 2) % gifts.length]);
  });
  {
    const h = ground(3, 8) ?? 0;
    grid.set(3, h + 1, 8, B.CHEST);
  }

  /* ── lantern posts around the ring ───────────────────────────────── */
  for (const [x, z] of [[9, 9], [-5, 9], [-5, -5], [9, -5]] as const) {
    const h = ground(x, z);
    if (h === null) continue;
    grid.set(x, h + 1, z, B.COBBLE);
    grid.set(x, h + 2, z, B.LOG);
    grid.set(x, h + 3, z, B.LANTERN);
    lights.push({ x: x + 0.5, y: h + 3.5, z: z + 0.5, color: WARM, radius: 8.5, intensity: 0.95 });
    glows.push({ x: x + 0.5, y: h + 3.5, z: z + 0.5, color: WARM, size: 5.4, twinkle: 0.2 });
  }

  /* ── candy canes ─────────────────────────────────────────────────── */
  for (const [x, z, dir] of [[8, 11, -1], [-4, 11, 1]] as const) {
    const h = ground(x, z);
    if (h === null) continue;
    for (let y = 1; y <= 5; y++) grid.set(x, h + y, z, B.CANDY);
    grid.set(x + dir, h + 5, z, B.CANDY);
    grid.set(x + dir, h + 4, z, B.CANDY);
  }

  /* ── snowman ─────────────────────────────────────────────────────── */
  {
    const [x, z] = [6, -6];
    const h = ground(x, z) ?? 0;
    grid.set(x, h + 1, z, B.SNOW);
    grid.set(x, h + 2, z, B.SNOW);
    grid.set(x, h + 3, z, B.SNOWMAN_HEAD);
    grid.set(x, h + 4, z, B.COAL);
  }

  /* ── forest ──────────────────────────────────────────────────────── */
  const planted: [number, number][] = [];
  for (let z = -30; z <= 30; z++) {
    for (let x = -30; x <= 30; x++) {
      const roll = hash2(x, z, 404);
      if (roll < 0.955) continue;
      const h = ground(x, z);
      if (h === null) continue;
      if (Math.hypot(x, z) > edgeRadius(Math.atan2(z, x)) - 3.2) continue;
      if (Math.hypot(x - TREE.x, z - TREE.z) < 10.5) continue;
      if (x > CABIN.x0 - 4 && x < CABIN.x1 + 4 && z > CABIN.z0 - 4 && z < CABIN.z1 + 6) continue;
      if (Math.hypot(x - POND.x, z - POND.z) < 6.8) continue;
      if (mountainAt(x, z) > 4.2) continue;
      if (nearPath(x, z, 2)) continue;
      // Keep the view of the tree and its presents open from the front.
      if (z > 9 && x > -7 && x < 12) continue;
      // …and the cabin's front garden clear.
      if (x > 13 && z > -7 && z < 10) continue;
      if (planted.some(([px, pz]) => Math.hypot(px - x, pz - z) < 4.3)) continue;
      if (grid.get(x, h + 1, z) !== 0) continue;
      planted.push([x, z]);
      const kind = roll > 0.99 ? "tall" : roll > 0.968 ? "medium" : "small";
      plantSpruce(grid, glows, x, h, z, kind, x * 131 + z * 17);
    }
  }

  /* ── the flag peak ───────────────────────────────────────────────── */
  const peakTop = grid.top(PEAK.x, PEAK.z) ?? 12;
  grid.set(PEAK.x, peakTop + 1, PEAK.z, B.BEACON);
  lights.push({ x: PEAK.x + 0.5, y: peakTop + 2.5, z: PEAK.z + 0.5, color: CYAN, radius: 10, intensity: 0.9 });
  glows.push({ x: PEAK.x + 0.5, y: peakTop + 1.5, z: PEAK.z + 0.5, color: CYAN, size: 8, twinkle: 0.3 });

  const starY = treeGround + 3 + treeLayers.length;
  return {
    grid,
    lights,
    glows,
    anchors: {
      treeBase: [TREE.x + 0.5, treeGround + 1, TREE.z + 0.5],
      star: [TREE.x + 0.5, starY + 0.5, TREE.z + 0.5],
      chimney: [14.5, 10.4, CABIN.z0 + 0.5],
      flagBase: [PEAK.x + 0.5, peakTop + 2, PEAK.z + 0.5],
    },
  };
}

/** A small satellite island with a single tree, for depth in the distance. */
export function buildIslet(seed: number, radius: number): { grid: VoxelGrid; glows: GlowPoint[] } {
  const size = radius * 2 + 4;
  const grid = new VoxelGrid(size, 26, size, -radius - 2, -12, -radius - 2);
  const glows: GlowPoint[] = [];
  for (let z = -radius - 1; z <= radius + 1; z++) {
    for (let x = -radius - 1; x <= radius + 1; x++) {
      const r = Math.hypot(x, z);
      const edge = radius + (fbm2(x * 0.3 + seed, z * 0.3, seed, 2) - 0.5) * 2.4;
      if (r > edge) continue;
      const h = Math.round((fbm2(x * 0.2, z * 0.2 + seed, seed + 3, 2) - 0.5) * 2);
      const bottom = clamp(-Math.round((1 - Math.pow(r / edge, 1.5)) * (radius * 1.25) + hash2(x, z, seed) * 2) - 1, -11, h - 1);
      for (let y = bottom; y <= h; y++) grid.set(x, y, z, y === h ? B.SNOW_GROUND : y >= h - 2 ? B.DIRT : B.STONE);
    }
  }
  const top = grid.top(0, 0);
  if (top !== null) plantSpruce(grid, glows, 0, top, 0, radius > 4 ? "medium" : "small", seed);
  return { grid, glows };
}
