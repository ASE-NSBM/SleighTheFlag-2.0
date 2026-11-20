import * as THREE from "three";
import { createAtlas } from "./atlas";
import { CameraRig, SHOTS } from "./camera";
import { buildIsland, buildIslet, type GlowPoint } from "./island";
import { createGlows, createSmoke, createSnow } from "./particles";
import { createFlag, createSleigh } from "./props";
import { createSky } from "./sky";
import { meshGrid } from "./voxels";

export interface WorldOptions {
  quality: "low" | "high";
  reducedMotion: boolean;
}

export interface FrameState {
  progress: number;
  pointerX: number;
  pointerY: number;
}

export interface World {
  resize(width: number, height: number): void;
  frame(time: number, dt: number, state: FrameState): void;
  dispose(): void;
}

const FOV = 36;

/** Small satellite islands, placed for depth around the main one. */
const ISLETS: { seed: number; radius: number; at: [number, number, number] }[] = [
  { seed: 3, radius: 5, at: [-58, 25, -30] },
  { seed: 8, radius: 4, at: [52, 17, -36] },
  { seed: 12, radius: 6, at: [-47, -7, 34] },
  { seed: 17, radius: 4, at: [49, -4, 36] },
  { seed: 21, radius: 5, at: [8, 23, -66] },
  { seed: 27, radius: 3, at: [-30, 26, -52] },
];

export function createWorld(canvas: HTMLCanvasElement, options: WorldOptions): World {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x04060f, 1);

  const maxRatio = options.quality === "high" ? 1.75 : 1.25;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, maxRatio);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a1332, 0.0056);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 1400);

  /* ── the world itself ─────────────────────────────────────────────── */
  const atlas = createAtlas();
  const terrain = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true });

  const island = buildIsland();
  const islandGeometry = meshGrid(island.grid, island.lights);
  scene.add(new THREE.Mesh(islandGeometry, terrain));

  const glowPoints: GlowPoint[] = [...island.glows];
  const isletGeometries: THREE.BufferGeometry[] = [];
  for (const islet of ISLETS) {
    const built = buildIslet(islet.seed, islet.radius);
    const geometry = meshGrid(built.grid, []);
    const mesh = new THREE.Mesh(geometry, terrain);
    mesh.position.set(...islet.at);
    scene.add(mesh);
    isletGeometries.push(geometry);
    for (const glow of built.glows) glowPoints.push({ ...glow, x: glow.x + islet.at[0], y: glow.y + islet.at[1], z: glow.z + islet.at[2] });
  }

  const glows = createGlows(glowPoints);
  const snow = createSnow(options.quality === "high" ? 2400 : 1100, pixelRatio);
  const sky = createSky({ stars: options.quality === "high" ? 900 : 520, pixelRatio });
  const flag = createFlag(island.anchors.flagBase);
  const sleigh = createSleigh(options.reducedMotion);
  const smoke = createSmoke(island.anchors.chimney);
  scene.add(sky.group, glows.points, flag.group, sleigh.group, sleigh.trail.points, smoke.mesh, snow.points);

  const rig = new CameraRig(camera, SHOTS, options.reducedMotion);

  let width = 1;
  let height = 1;

  const applySize = () => {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    // Converts a size in world units into device pixels at distance 1.
    const projection = (height * pixelRatio) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2));
    snow.uniforms.uProjection.value = projection;
    snow.uniforms.uPixelRatio.value = pixelRatio;
    glows.uniforms.uProjection.value = projection;
    sleigh.trail.uniforms.uProjection.value = projection;
  };

  /* If the device struggles, quietly render fewer pixels. */
  let slowFrames = 0;
  let measured = 0;
  const watchPerformance = (dt: number) => {
    if (dt <= 0) return;
    measured++;
    if (dt > 1 / 28) slowFrames++;
    if (measured >= 90) {
      if (slowFrames > 45 && pixelRatio > 0.75) {
        pixelRatio = Math.max(0.75, pixelRatio - 0.25);
        applySize();
      }
      measured = 0;
      slowFrames = 0;
    }
  };

  return {
    resize(nextWidth, nextHeight) {
      width = Math.max(1, Math.floor(nextWidth));
      height = Math.max(1, Math.floor(nextHeight));
      applySize();
    },

    frame(time, dt, state) {
      const t = options.reducedMotion ? 0 : time;
      rig.update({ ...state, time: t, dt, width, height });
      sky.group.position.copy(camera.position); // the sky is infinitely far away
      sky.update(t);
      snow.uniforms.uTime.value = t;
      glows.uniforms.uTime.value = t;
      sleigh.trail.uniforms.uTime.value = t;
      flag.update(t);
      sleigh.update(t);
      smoke.update(t);
      renderer.render(scene, camera);
      watchPerformance(dt);
    },

    dispose() {
      sky.dispose();
      islandGeometry.dispose();
      isletGeometries.forEach((geometry) => geometry.dispose());
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh && !(object as THREE.Points).isPoints) return;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        for (const m of Array.isArray(material) ? material : material ? [material] : []) m.dispose();
      });
      atlas.dispose();
      terrain.dispose();
      renderer.dispose();
    },
  };
}
