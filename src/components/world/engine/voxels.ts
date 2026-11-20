import * as THREE from "three";
import { T, tileUV } from "./atlas";

/* ───────────────────────────── blocks ───────────────────────────────── */

export interface BlockDef {
  /** Tile per face, in the order +X, −X, +Y, −Y, +Z, −Z. */
  tiles: [number, number, number, number, number, number];
  /** Emissive blocks ignore lighting and shine at this brightness. */
  glow?: number;
}

const cube = (tile: number, glow?: number): BlockDef => ({ tiles: [tile, tile, tile, tile, tile, tile], glow });
const column = (top: number, side: number, bottom: number): BlockDef => ({ tiles: [side, side, top, bottom, side, side] });
/** A block with a special face looking towards +Z (the default camera side). */
const facing = (front: number, side: number, top: number, bottom = top): BlockDef => ({ tiles: [side, side, top, bottom, front, side] });

export const B = {
  AIR: 0,
  SNOW_GROUND: 1,
  DIRT: 2,
  STONE: 3,
  SNOW: 4,
  SNOW_STONE: 5,
  COBBLE: 6,
  LOG: 7,
  LEAVES: 8,
  LEAVES_SNOW: 9,
  PLANKS: 10,
  ROOF: 11,
  ROOF_SNOW: 12,
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
  STAR: 26,
  COAL: 27,
  SNOWMAN_HEAD: 28,
  CHEST: 29,
  ORN_RED: 30,
  ORN_GOLD: 31,
  ORN_BLUE: 32,
  ORN_PINK: 33,
  BEACON: 34,
  ICE_STONE: 35,
} as const;

export const BLOCKS: Record<number, BlockDef> = {
  [B.SNOW_GROUND]: column(T.SNOW, T.SNOW_SIDE, T.DIRT),
  [B.DIRT]: cube(T.DIRT),
  [B.STONE]: cube(T.STONE),
  [B.SNOW]: cube(T.SNOW),
  [B.SNOW_STONE]: column(T.SNOW, T.STONE_SNOW_SIDE, T.STONE),
  [B.COBBLE]: cube(T.COBBLE),
  [B.LOG]: column(T.LOG_TOP, T.LOG, T.LOG_TOP),
  [B.LEAVES]: cube(T.LEAVES),
  [B.LEAVES_SNOW]: column(T.LEAVES_SNOW_TOP, T.LEAVES_SNOW_SIDE, T.LEAVES),
  [B.PLANKS]: cube(T.PLANKS),
  [B.ROOF]: cube(T.ROOF),
  [B.ROOF_SNOW]: column(T.SNOW, T.ROOF_SNOW_SIDE, T.ROOF),
  [B.BRICK]: cube(T.BRICK),
  [B.WINDOW]: cube(T.WINDOW, 1.35),
  [B.DOOR_TOP]: facing(T.DOOR_TOP, T.PLANKS, T.PLANKS),
  [B.DOOR_BOTTOM]: facing(T.DOOR_BOTTOM, T.PLANKS, T.PLANKS),
  [B.ICE]: column(T.ICE, T.ICE, T.ICE_STONE),
  [B.PATH]: column(T.PATH, T.SNOW_SIDE, T.DIRT),
  [B.GIFT_RED]: cube(T.GIFT_RED),
  [B.GIFT_GREEN]: cube(T.GIFT_GREEN),
  [B.GIFT_BLUE]: cube(T.GIFT_BLUE),
  [B.GIFT_GOLD]: cube(T.GIFT_GOLD),
  [B.GIFT_VIOLET]: cube(T.GIFT_VIOLET),
  [B.CANDY]: cube(T.CANDY),
  [B.LANTERN]: cube(T.LANTERN, 1.4),
  [B.STAR]: cube(T.GOLD, 1.5),
  [B.COAL]: cube(T.COAL),
  [B.SNOWMAN_HEAD]: facing(T.SNOWMAN_FACE, T.SNOW, T.SNOW),
  [B.CHEST]: facing(T.CHEST_FRONT, T.CHEST_SIDE, T.CHEST_TOP),
  [B.ORN_RED]: cube(T.ORN_RED, 1.45),
  [B.ORN_GOLD]: cube(T.ORN_GOLD, 1.45),
  [B.ORN_BLUE]: cube(T.ORN_BLUE, 1.45),
  [B.ORN_PINK]: cube(T.ORN_PINK, 1.45),
  [B.BEACON]: cube(T.BEACON, 1.5),
  [B.ICE_STONE]: cube(T.ICE_STONE),
};

/* ───────────────────────────── grid ─────────────────────────────────── */

export class VoxelGrid {
  readonly data: Uint8Array;

  /**
   * @param ox,oy,oz world coordinate of grid cell (0,0,0)
   */
  constructor(
    readonly sx: number,
    readonly sy: number,
    readonly sz: number,
    readonly ox = 0,
    readonly oy = 0,
    readonly oz = 0,
  ) {
    this.data = new Uint8Array(sx * sy * sz);
  }

  /** World coordinates in, block id out (air outside the grid). */
  get(x: number, y: number, z: number): number {
    const gx = x - this.ox;
    const gy = y - this.oy;
    const gz = z - this.oz;
    if (gx < 0 || gy < 0 || gz < 0 || gx >= this.sx || gy >= this.sy || gz >= this.sz) return 0;
    return this.data[gx + this.sx * (gz + this.sz * gy)];
  }

  set(x: number, y: number, z: number, id: number): void {
    const gx = x - this.ox;
    const gy = y - this.oy;
    const gz = z - this.oz;
    if (gx < 0 || gy < 0 || gz < 0 || gx >= this.sx || gy >= this.sy || gz >= this.sz) return;
    this.data[gx + this.sx * (gz + this.sz * gy)] = id;
  }

  /** Only place the block if the cell is empty. */
  setIfAir(x: number, y: number, z: number, id: number): void {
    if (this.get(x, y, z) === 0) this.set(x, y, z, id);
  }

  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.set(x, y, z, id);
  }

  /** Highest solid block in a column, or null. */
  top(x: number, z: number): number | null {
    for (let y = this.oy + this.sy - 1; y >= this.oy; y--) if (this.get(x, y, z) !== 0) return y;
    return null;
  }
}

/* ───────────────────────────── lighting ─────────────────────────────── */

export interface PointLight {
  x: number;
  y: number;
  z: number;
  /** Linear RGB, 0–1. */
  color: [number, number, number];
  radius: number;
  intensity: number;
}

/** Cool moonlit ambience; faces are shaded by where they point. */
export const AMBIENT: [number, number, number] = [0.6, 0.69, 0.96];
/** +X, −X, +Y, −Y, +Z, −Z */
export const FACE_SHADE = [0.74, 0.6, 1.0, 0.42, 0.84, 0.54];
const AO_SHADE = [0.5, 0.68, 0.85, 1.0];
const MAX_LIGHT = 1.42;

interface Face {
  normal: [number, number, number];
  corners: [number, number, number][];
}

/* Corners are listed counter-clockwise seen from outside; uv = (0,0) (1,0) (1,1) (0,1). */
const FACES: Face[] = [
  { normal: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { normal: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { normal: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { normal: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { normal: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { normal: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];
const UV_CORNERS: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];

function lightAt(px: number, py: number, pz: number, normal: [number, number, number], lights: PointLight[], out: [number, number, number]) {
  for (const light of lights) {
    const dx = light.x - px;
    const dy = light.y - py;
    const dz = light.z - pz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= light.radius * light.radius) continue;
    const d = Math.sqrt(d2) || 0.0001;
    const falloff = 1 - d / light.radius;
    // Surfaces facing away still catch a little bounce so walls never go flat.
    const facing = Math.max(0.28, (dx * normal[0] + dy * normal[1] + dz * normal[2]) / d);
    const k = falloff * falloff * facing * light.intensity;
    out[0] += light.color[0] * k;
    out[1] += light.color[1] * k;
    out[2] += light.color[2] * k;
  }
}

/* ───────────────────────────── geometry builder ─────────────────────── */

export class GeometryBuilder {
  positions: number[] = [];
  uvs: number[] = [];
  colors: number[] = [];
  indices: number[] = [];
  private count = 0;

  quad(points: [number, number, number][], uv: [number, number][], colors: [number, number, number][], flip = false) {
    const base = this.count;
    for (let i = 0; i < 4; i++) {
      this.positions.push(points[i][0], points[i][1], points[i][2]);
      this.uvs.push(uv[i][0], uv[i][1]);
      this.colors.push(colors[i][0], colors[i][1], colors[i][2]);
    }
    if (flip) this.indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    else this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.count += 4;
  }

  /**
   * A free-standing, untextured box (sleigh parts, reindeer, the flag pole).
   * The colour is modulated by the same face shading as the terrain.
   */
  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: THREE.ColorRepresentation, glow = 0) {
    const c = new THREE.Color(color);
    const x0 = cx - sx / 2;
    const y0 = cy - sy / 2;
    const z0 = cz - sz / 2;
    FACES.forEach((face, f) => {
      const k = glow > 0 ? glow : FACE_SHADE[f];
      const tint: [number, number, number] =
        glow > 0 ? [c.r * k, c.g * k, c.b * k] : [c.r * k * AMBIENT[0] * 1.25, c.g * k * AMBIENT[1] * 1.25, c.b * k * AMBIENT[2] * 1.2];
      this.quad(
        face.corners.map(([x, y, z]) => [x0 + x * sx, y0 + y * sy, z0 + z * sz] as [number, number, number]),
        UV_CORNERS,
        [tint, tint, tint, tint],
      );
    });
  }

  build(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.indices, 1) : new THREE.Uint16BufferAttribute(this.indices, 1));
    geometry.computeBoundingSphere();
    return geometry;
  }
}

/* ───────────────────────────── mesher ───────────────────────────────── */

/**
 * Turns a voxel grid into one mesh: hidden faces are culled, every vertex
 * gets ambient occlusion from its neighbours, and all lighting (moon + the
 * warm point lights) is baked into vertex colours — so the whole island is a
 * single unlit draw call.
 */
export function meshGrid(grid: VoxelGrid, lights: PointLight[]): THREE.BufferGeometry {
  const builder = new GeometryBuilder();
  const solid = (x: number, y: number, z: number) => (grid.get(x, y, z) !== 0 ? 1 : 0);
  const light: [number, number, number] = [0, 0, 0];

  for (let gy = 0; gy < grid.sy; gy++) {
    for (let gz = 0; gz < grid.sz; gz++) {
      for (let gx = 0; gx < grid.sx; gx++) {
        const id = grid.data[gx + grid.sx * (gz + grid.sz * gy)];
        if (id === 0) continue;
        const block = BLOCKS[id];
        if (!block) continue;

        const x = gx + grid.ox;
        const y = gy + grid.oy;
        const z = gz + grid.oz;

        for (let f = 0; f < 6; f++) {
          const face = FACES[f];
          const [nx, ny, nz] = face.normal;
          if (grid.get(x + nx, y + ny, z + nz) !== 0) continue; // hidden

          const uv = tileUV(block.tiles[f]);
          const points: [number, number, number][] = [];
          const uvs: [number, number][] = [];
          const colors: [number, number, number][] = [];
          const ao: number[] = [];

          for (let c = 0; c < 4; c++) {
            const [cx, cy, cz] = face.corners[c];
            const px = x + cx;
            const py = y + cy;
            const pz = z + cz;
            points.push([px, py, pz]);
            uvs.push([UV_CORNERS[c][0] ? uv.u1 : uv.u0, UV_CORNERS[c][1] ? uv.v1 : uv.v0]);

            // Ambient occlusion from the three neighbours touching this corner.
            const sxn = cx ? 1 : -1;
            const syn = cy ? 1 : -1;
            const szn = cz ? 1 : -1;
            let side1: number;
            let side2: number;
            let corner: number;
            if (nx !== 0) {
              side1 = solid(x + nx, y + syn, z);
              side2 = solid(x + nx, y, z + szn);
              corner = solid(x + nx, y + syn, z + szn);
            } else if (ny !== 0) {
              side1 = solid(x + sxn, y + ny, z);
              side2 = solid(x, y + ny, z + szn);
              corner = solid(x + sxn, y + ny, z + szn);
            } else {
              side1 = solid(x + sxn, y, z + nz);
              side2 = solid(x, y + syn, z + nz);
              corner = solid(x + sxn, y + syn, z + nz);
            }
            const level = side1 && side2 ? 0 : 3 - (side1 + side2 + corner);
            ao.push(level);

            if (block.glow) {
              colors.push([block.glow, block.glow, block.glow]);
            } else {
              const k = FACE_SHADE[f] * AO_SHADE[level];
              light[0] = AMBIENT[0] * k;
              light[1] = AMBIENT[1] * k;
              light[2] = AMBIENT[2] * k;
              lightAt(px, py, pz, face.normal, lights, light);
              colors.push([Math.min(MAX_LIGHT, light[0]), Math.min(MAX_LIGHT, light[1]), Math.min(MAX_LIGHT, light[2])]);
            }
          }

          // Split the quad along the diagonal that keeps the shading smooth.
          builder.quad(points, uvs, colors, ao[0] + ao[2] < ao[1] + ao[3]);
        }
      }
    }
  }

  return builder.build();
}
