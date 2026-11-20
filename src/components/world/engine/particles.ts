import * as THREE from "three";
import type { GlowPoint } from "./island";
import { mulberry32 } from "./random";

/* ───────────────────────────── falling snow ─────────────────────────── */

export interface Snow {
  points: THREE.Points;
  uniforms: { uTime: { value: number }; uProjection: { value: number }; uPixelRatio: { value: number } };
}

/** Square flakes falling through a box around the island; animated on the GPU. */
export function createSnow(count: number, pixelRatio: number): Snow {
  const random = mulberry32(77);
  const WIDTH = 150;
  const HEIGHT = 84;
  const BOTTOM = -22;

  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions.set([(random() - 0.5) * WIDTH, random() * HEIGHT, (random() - 0.5) * WIDTH], i * 3);
    speeds[i] = 1.6 + random() * 2.6;
    sizes[i] = 0.14 + random() * 0.2;
    phases[i] = random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

  const uniforms = {
    uTime: { value: 0 },
    uProjection: { value: 800 },
    uPixelRatio: { value: pixelRatio },
    uHeight: { value: HEIGHT },
    uBottom: { value: BOTTOM },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uProjection;
      uniform float uPixelRatio;
      uniform float uHeight;
      uniform float uBottom;
      attribute float aSpeed;
      attribute float aSize;
      attribute float aPhase;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.y = mod(position.y - uTime * aSpeed, uHeight) + uBottom;
        p.x += sin(uTime * 0.45 + aPhase) * 1.8;
        p.z += cos(uTime * 0.33 + aPhase * 1.7) * 1.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float depth = max(1.0, -mv.z);
        gl_PointSize = clamp(aSize * uProjection / depth, 1.2 * uPixelRatio, 9.0 * uPixelRatio);
        // Flakes fade in at the top, out at the bottom, and thin out far away.
        float life = (p.y - uBottom) / uHeight;
        vAlpha = smoothstep(0.0, 0.08, life) * smoothstep(1.0, 0.9, life) * smoothstep(300.0, 60.0, depth) * 0.92;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 20;
  return { points, uniforms };
}

/* ───────────────────────────── light glows ──────────────────────────── */

export interface Glows {
  points: THREE.Points;
  uniforms: { uTime: { value: number }; uProjection: { value: number } };
  /** Mutable copies for glows that move (the sleigh's sparkle trail). */
  positions: Float32Array;
  sizes: Float32Array;
  markDirty(): void;
}

/** Soft additive halos on every lamp, window, bauble and fairy light. */
export function createGlows(glows: GlowPoint[], options: { pull?: number; maxSize?: number } = {}): Glows {
  const count = glows.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinkles = new Float32Array(count);
  const phases = new Float32Array(count);
  const random = mulberry32(555);
  glows.forEach((glow, i) => {
    positions.set([glow.x, glow.y, glow.z], i * 3);
    colors.set(glow.color, i * 3);
    sizes[i] = glow.size;
    twinkles[i] = glow.twinkle;
    phases[i] = random() * 10;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aTwinkle", new THREE.BufferAttribute(twinkles, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

  const uniforms = {
    uTime: { value: 0 },
    uProjection: { value: 800 },
    uPull: { value: options.pull ?? 1.0 },
    uMaxSize: { value: options.maxSize ?? 260 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uProjection;
      uniform float uPull;
      uniform float uMaxSize;
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aTwinkle;
      attribute float aPhase;
      varying vec3 vColor;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // Step towards the camera so a halo is not hidden inside its own lamp block.
        mv.xyz += normalize(-mv.xyz) * uPull;
        gl_Position = projectionMatrix * mv;
        float wave = 0.5 + 0.5 * sin(uTime * (1.4 + fract(aPhase * 7.13) * 3.2) + aPhase * 6.2831);
        vColor = aColor * (1.0 - aTwinkle * wave * 0.8);
        gl_PointSize = clamp(aSize * uProjection / max(1.0, -mv.z), 2.0, uMaxSize);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = smoothstep(0.26, 0.0, d);
        float halo = pow(max(0.0, 1.0 - d), 2.4);
        float alpha = core * 0.85 + halo * 0.5;
        gl_FragColor = vec4(vColor, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 10;
  return {
    points,
    uniforms,
    positions,
    sizes,
    markDirty() {
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aSize.needsUpdate = true;
    },
  };
}

/* ───────────────────────────── chimney smoke ────────────────────────── */

export interface Smoke {
  mesh: THREE.InstancedMesh;
  update(time: number): void;
}

/** Blocky puffs drifting out of the cabin chimney. */
export function createSmoke(origin: [number, number, number], count = 9): Smoke {
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xbfcbe2, transparent: true, opacity: 0.42, depthWrite: false }),
    count,
  );
  mesh.frustumCulled = false;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const axis = new THREE.Vector3(0, 1, 0);
  return {
    mesh,
    update(time) {
      for (let i = 0; i < count; i++) {
        const life = (time * 0.11 + i / count) % 1;
        const size = Math.sin(Math.PI * life) * 0.9 + 0.12;
        position.set(origin[0] + Math.sin(life * 5 + i * 1.3) * 0.55 + life * 2.2, origin[1] + life * 7.5, origin[2] + Math.cos(life * 4 + i) * 0.4);
        rotation.setFromAxisAngle(axis, life * 2 + i);
        scale.setScalar(size);
        mesh.setMatrixAt(i, matrix.compose(position, rotation, scale));
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
