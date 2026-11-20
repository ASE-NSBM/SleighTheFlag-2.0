import * as THREE from "three";
import { clamp } from "./random";

/**
 * The camera flies between one "shot" per page section as you scroll.
 *
 * `frame` places the subject on screen: [x, y] as a fraction of the viewport,
 * positive = right / down. On wide screens the text panel sits on one side, so
 * the subject is pushed to the other; on phones everything is centred.
 */
export interface Shot {
  pos: [number, number, number];
  look: [number, number, number];
  wide: [number, number];
  narrow: [number, number];
}

/* Order matches `nav` in src/config/event.ts. */
export const SHOTS: Shot[] = [
  // 0 · Spawn — the whole island under the aurora
  { pos: [10, 22, 108], look: [0, 8, 0], wide: [0.2, 0.08], narrow: [0, 0.22] },
  // 1 · About — the cabin, windows glowing
  { pos: [29, 8.5, 12], look: [11, 4, -8], wide: [-0.22, 0.04], narrow: [0, 0.1] },
  // 2 · Realms — across the frozen pond towards the tree
  { pos: [26, 7, 38], look: [5, 9, 0], wide: [0, -0.08], narrow: [0, 0] },
  // 3 · Timeline — rising past the great tree
  { pos: [-15, 13, 27], look: [2.5, 10, 2.5], wide: [0.25, 0.02], narrow: [0, 0.08] },
  // 4 · Loot — down among the presents
  { pos: [2.5, 4.8, 23], look: [2.5, 7, 3], wide: [0, -0.14], narrow: [0, -0.1] },
  // 5 · Rules — the trail up the mountain
  { pos: [-34, 13, 12], look: [-12, 8.5, -9], wide: [-0.23, 0.02], narrow: [0, 0.06] },
  // 6 · Register — the flag itself
  { pos: [-27, 24, 9], look: [-12.5, 19, -10.5], wide: [-0.36, 0.06], narrow: [0, -0.2] },
  // 7 · FAQ — pulling back above the village
  { pos: [38, 38, 60], look: [0, 6, 0], wide: [0.23, 0.02], narrow: [0, 0.1] },
  // 8 · ASE — farewell, the island small under the sky
  { pos: [0, 54, 108], look: [0, 12, 0], wide: [0, 0.16], narrow: [0, 0.16] },
];

export interface RigInput {
  /** Scroll progress as a float section index. */
  progress: number;
  /** Pointer position, −1 … 1 on both axes (0 = centre). */
  pointerX: number;
  pointerY: number;
  time: number;
  dt: number;
  width: number;
  height: number;
}

export class CameraRig {
  private readonly positions: THREE.CatmullRomCurve3;
  private readonly targets: THREE.CatmullRomCurve3;
  private current = 0;
  private started = false;
  private readonly parallax = new THREE.Vector2();
  private readonly pos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly shots: Shot[],
    private readonly reducedMotion: boolean,
  ) {
    this.positions = new THREE.CatmullRomCurve3(shots.map((shot) => new THREE.Vector3(...shot.pos)), false, "catmullrom", 0.3);
    this.targets = new THREE.CatmullRomCurve3(shots.map((shot) => new THREE.Vector3(...shot.look)), false, "catmullrom", 0.3);
  }

  update(input: RigInput): void {
    const last = this.shots.length - 1;
    const goal = this.reducedMotion ? 0 : clamp(input.progress, 0, last);

    // Ease towards the scroll position; the very first frame snaps.
    if (!this.started) {
      this.current = goal;
      this.started = true;
    } else {
      this.current += (goal - this.current) * (1 - Math.exp(-input.dt * 3.4));
    }

    const index = Math.min(last - 1, Math.floor(this.current));
    const local = this.current - index;
    const eased = local * local * (3 - 2 * local); // linger on each shot
    const t = (index + eased) / last;

    this.positions.getPoint(t, this.pos);
    this.targets.getPoint(t, this.look);

    const wide = input.width >= 1024;
    const a = wide ? this.shots[index].wide : this.shots[index].narrow;
    const b = wide ? this.shots[index + 1].wide : this.shots[index + 1].narrow;
    const frameX = a[0] + (b[0] - a[0]) * eased;
    const frameY = a[1] + (b[1] - a[1]) * eased;

    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);

    if (!this.reducedMotion) {
      // Breathing drift plus a little parallax from the pointer.
      const k = 1 - Math.exp(-input.dt * 2.2);
      this.parallax.x += (input.pointerX - this.parallax.x) * k;
      this.parallax.y += (input.pointerY - this.parallax.y) * k;
      const distance = this.pos.distanceTo(this.look);
      const reach = distance * 0.028;
      this.camera.updateMatrixWorld();
      this.right.setFromMatrixColumn(this.camera.matrixWorld, 0);
      this.up.setFromMatrixColumn(this.camera.matrixWorld, 1);
      this.camera.position
        .addScaledVector(this.right, Math.sin(input.time * 0.23) * reach * 0.5 + this.parallax.x * reach)
        .addScaledVector(this.up, Math.sin(input.time * 0.17 + 1.3) * reach * 0.3 - this.parallax.y * reach * 0.6);
      this.camera.lookAt(this.look);
    }

    this.camera.aspect = input.width / input.height;
    this.camera.setViewOffset(input.width, input.height, -frameX * input.width, -frameY * input.height, input.width, input.height);
  }
}
