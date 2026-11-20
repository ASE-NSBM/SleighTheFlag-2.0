import * as THREE from "three";
import type { GlowPoint } from "./island";
import { createGlows, type Glows } from "./particles";
import { hash2 } from "./random";
import { GeometryBuilder } from "./voxels";

/** The things that move: the flag on the peak, its beacon, and the sleigh. */

const solidMaterial = () => new THREE.MeshBasicMaterial({ vertexColors: true });

/* ───────────────────────────── the flag ─────────────────────────────── */

function flagTexture(): THREE.CanvasTexture {
  const W = 30;
  const H = 18;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Swallow-tail: a notch cut out of the fly end.
      const notch = x - (W - 7);
      if (notch > 0 && Math.abs(y - (H - 1) / 2) < notch * 1.25) continue;
      let color = y < 2 ? "#ff6b6b" : y > H - 3 ? "#9d1c2b" : "#e63946";
      if (x < 3) color = "#ffc93c";
      if (x === 3) color = "#c98a12";
      c.fillStyle = color;
      c.fillRect(x, y, 1, 1);
    }
  }
  // A white snow-crystal emblem.
  c.fillStyle = "#ffffff";
  const cx = 13;
  const cy = 8;
  for (let i = -4; i <= 4; i++) {
    c.fillRect(cx + i, cy, 1, 2);
    c.fillRect(cx, cy + i, 2, 1);
  }
  for (const [dx, dy] of [[-3, -3], [-2, -2], [2, -2], [3, -3], [-3, 4], [-2, 3], [3, 3], [4, 4]]) c.fillRect(cx + dx, cy + dy, 1, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

export interface FlagRig {
  group: THREE.Group;
  update(time: number): void;
}

export function createFlag(base: [number, number, number]): FlagRig {
  const group = new THREE.Group();
  group.position.set(base[0], base[1], base[2]);

  const POLE = 7;
  const pole = new GeometryBuilder();
  pole.box(0, POLE / 2, 0, 0.3, POLE, 0.3, 0xe9dcc0);
  pole.box(0, POLE + 0.28, 0, 0.56, 0.56, 0.56, 0xffd24a, 1.35);
  group.add(new THREE.Mesh(pole.build(), solidMaterial()));

  const uniforms = { uTime: { value: 0 }, uMap: { value: flagTexture() } };
  const geometry = new THREE.PlaneGeometry(5, 3, 20, 6);
  geometry.translate(2.5, 0, 0); // the hoist edge sits on the pole
  const cloth = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        varying float vShade;
        void main() {
          vUv = uv;
          vec3 p = position;
          float reach = uv.x; // nothing moves at the pole, everything at the tip
          float ripple = sin(uv.x * 7.5 - uTime * 5.2) * 0.36 + sin(uv.x * 14.0 - uTime * 8.0 + uv.y * 3.0) * 0.1;
          p.z += ripple * reach;
          p.y += sin(uv.x * 5.0 - uTime * 4.0) * 0.1 * reach - reach * reach * 0.22;
          vShade = 0.86 + 0.28 * cos(uv.x * 7.5 - uTime * 5.2) * reach;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying vec2 vUv;
        varying float vShade;
        void main() {
          vec4 texel = texture2D(uMap, vUv);
          if (texel.a < 0.5) discard;
          gl_FragColor = vec4(texel.rgb * vShade, 1.0);
          #include <colorspace_fragment>
        }
      `,
    }),
  );
  cloth.position.set(0.15, POLE - 1.7, 0);
  cloth.frustumCulled = false;
  group.add(cloth);

  /* A beam of light so the flag can be found from anywhere on the island. */
  const beamUniforms = { uTime: { value: 0 } };
  const beamMaterial = new THREE.ShaderMaterial({
    uniforms: beamUniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float core = smoothstep(0.0, 0.85, across);
        float fade = pow(1.0 - vUv.y, 1.5);
        float pulse = 0.78 + 0.22 * sin(vUv.y * 70.0 - uTime * 4.0);
        gl_FragColor = vec4(vec3(0.45, 0.93, 1.0), core * fade * pulse * 0.42);
        #include <colorspace_fragment>
      }
    `,
  });
  const BEAM = 150;
  for (const turn of [0, Math.PI / 2]) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.5, BEAM), beamMaterial);
    beam.position.y = BEAM / 2 - 1;
    beam.rotation.y = turn;
    beam.frustumCulled = false;
    beam.renderOrder = 5;
    group.add(beam);
  }

  return {
    group,
    update(time) {
      uniforms.uTime.value = time;
      beamUniforms.uTime.value = time;
    },
  };
}

/* ───────────────────────────── the sleigh ───────────────────────────── */

function sleighGeometry(): THREE.BufferGeometry {
  const g = new GeometryBuilder();
  const RED = 0xcf2c3c;
  const DEEP = 0x8f1826;
  const GOLD = 0xffc93c;
  const DARK = 0x2a1a0e;
  for (const z of [-0.78, 0.78]) {
    g.box(0, 0.1, z, 4.6, 0.2, 0.2, DARK); // runner
    g.box(2.4, 0.5, z, 0.2, 0.8, 0.2, DARK); // curled tip
    g.box(1.2, 0.42, z, 0.16, 0.5, 0.16, DARK);
    g.box(-1.2, 0.42, z, 0.16, 0.5, 0.16, DARK);
  }
  g.box(0, 0.98, 0, 3.7, 0.72, 1.8, RED); // tub
  g.box(0, 1.4, 0, 3.8, 0.14, 1.9, GOLD); // trim
  g.box(1.82, 1.62, 0, 0.32, 1.1, 1.8, DEEP); // dash
  g.box(1.98, 2.24, 0, 0.56, 0.2, 1.8, GOLD);
  g.box(-1.78, 1.82, 0, 0.32, 1.5, 1.8, DEEP); // back rest
  g.box(-1.78, 2.64, 0, 0.44, 0.16, 1.9, GOLD);
  // The sack and a few presents peeking out.
  g.box(-0.95, 1.95, 0, 1.25, 1.2, 1.36, 0x8a5a2e);
  g.box(-1.05, 2.72, 0.3, 0.56, 0.5, 0.56, 0x2fae60);
  g.box(-0.72, 2.68, -0.36, 0.5, 0.46, 0.5, 0x38a3e6);
  g.box(-1.3, 2.66, -0.22, 0.42, 0.42, 0.42, GOLD);
  // The driver.
  g.box(0.55, 1.95, 0, 0.84, 1.02, 0.94, 0xd92f3f);
  g.box(0.55, 1.66, 0, 0.88, 0.16, 0.98, 0x1b1630);
  g.box(0.98, 1.66, 0, 0.06, 0.2, 0.26, GOLD);
  g.box(0.6, 2.76, 0, 0.62, 0.6, 0.62, 0xf2c49b);
  g.box(0.86, 2.56, 0, 0.2, 0.4, 0.56, 0xf3f7ff); // beard
  g.box(0.6, 3.14, 0, 0.68, 0.22, 0.68, 0xf3f7ff); // hat brim
  g.box(0.5, 3.4, 0, 0.5, 0.34, 0.5, 0xd92f3f);
  g.box(0.18, 3.52, 0, 0.26, 0.26, 0.26, 0xf3f7ff); // pom-pom
  for (const z of [-0.56, 0.56]) g.box(1.08, 2.0, z, 0.62, 0.22, 0.22, 0xd92f3f); // arms
  // Reins running forward to the team.
  for (const z of [-0.72, 0.72]) g.box(4.7, 1.5, z, 5.6, 0.06, 0.06, DARK);
  return g.build();
}

function reindeerGeometry(redNose: boolean): THREE.BufferGeometry {
  const g = new GeometryBuilder();
  const COAT = 0x8a5a2e;
  const DARK = 0x5a3a1c;
  g.box(0, 1.02, 0, 1.5, 0.7, 0.62, COAT);
  g.box(0.8, 1.55, 0, 0.4, 0.74, 0.4, COAT);
  g.box(1.12, 1.92, 0, 0.62, 0.44, 0.46, 0x9c6a3a);
  if (redNose) g.box(1.48, 1.88, 0, 0.16, 0.2, 0.22, 0xff3b4e, 1.5);
  else g.box(1.48, 1.88, 0, 0.14, 0.16, 0.2, 0x1b1630);
  for (const z of [-0.2, 0.2]) {
    g.box(0.96, 2.36, z, 0.1, 0.52, 0.1, 0xe9dcc0);
    g.box(1.1, 2.52, z * 1.5, 0.32, 0.1, 0.1, 0xe9dcc0);
    g.box(0.84, 2.4, z * 1.5, 0.1, 0.1, 0.2, 0xe9dcc0);
  }
  for (const x of [-0.5, 0.5]) for (const z of [-0.2, 0.2]) g.box(x, 0.36, z, 0.16, 0.72, 0.16, DARK);
  g.box(-0.8, 1.22, 0, 0.16, 0.22, 0.22, 0xf3f7ff); // tail
  g.box(0.1, 1.4, 0, 0.3, 0.08, 0.66, 0xcf2c3c); // harness
  g.box(0.1, 1.48, 0, 0.14, 0.14, 0.14, 0xffc93c, 1.3); // bell
  return g.build();
}

export interface SleighRig {
  group: THREE.Group;
  trail: Glows;
  update(time: number): void;
  /** Current position, e.g. to let the camera glance at it. */
  position: THREE.Vector3;
}

export function createSleigh(reducedMotion: boolean): SleighRig {
  const group = new THREE.Group();
  // The model is built facing +X; lookAt() aims +Z, so turn it once here.
  const model = new THREE.Group();
  model.rotation.y = -Math.PI / 2;
  model.scale.setScalar(1.3);
  group.add(model);

  const material = solidMaterial();
  model.add(new THREE.Mesh(sleighGeometry(), material));

  const deer: THREE.Mesh[] = [];
  const plain = reindeerGeometry(false);
  const lead = reindeerGeometry(true);
  [
    [4.5, -0.72],
    [4.5, 0.72],
    [6.9, -0.72],
    [6.9, 0.72],
  ].forEach(([x, z], i) => {
    const mesh = new THREE.Mesh(i === 3 ? lead : plain, material);
    mesh.position.set(x, 0, z);
    model.add(mesh);
    deer.push(mesh);
  });

  // Sparkles shed behind the runners.
  const TRAIL = 54;
  const sparks: GlowPoint[] = Array.from({ length: TRAIL }, (_, i) => ({
    x: 0,
    y: -999,
    z: 0,
    color: i % 3 === 0 ? [1, 1, 1] : i % 3 === 1 ? [1.0, 0.84, 0.42] : [0.55, 0.9, 1.0],
    size: 1,
    twinkle: 0.9,
  }));
  const trail = createGlows(sparks, { pull: 0, maxSize: 60 });

  /** A lazy loop around the island that dips in front of the camera. */
  const path = (t: number, out: THREE.Vector3) => {
    const a = t * 0.105;
    return out.set(Math.cos(a) * 50, 25 + Math.sin(a * 2 + 0.6) * 5.5, Math.sin(a) * 34 - 4);
  };

  const position = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const sample = new THREE.Vector3();

  const update = (time: number) => {
    const t = reducedMotion ? 9.5 : time;
    path(t, position);
    path(t + 0.25, ahead);
    group.position.copy(position);
    group.lookAt(ahead);
    model.rotation.z = Math.sin(t * 0.21) * 0.1; // gentle banking
    group.position.y += Math.sin(t * 1.3) * 0.35;
    deer.forEach((mesh, i) => {
      mesh.position.y = Math.abs(Math.sin(t * 5 + i * 0.9)) * 0.36;
      mesh.rotation.z = Math.sin(t * 5 + i * 0.9) * 0.12;
    });
    for (let i = 0; i < TRAIL; i++) {
      const age = i / TRAIL;
      path(t - 0.5 - age * 5.2, sample);
      const jitter = age * 2.6;
      trail.positions[i * 3] = sample.x + (hash2(i, 1) - 0.5) * jitter;
      trail.positions[i * 3 + 1] = sample.y + (hash2(i, 2) - 0.5) * jitter - age * 1.6 + 0.6;
      trail.positions[i * 3 + 2] = sample.z + (hash2(i, 3) - 0.5) * jitter;
      trail.sizes[i] = (1 - age) * 1.7 + 0.2;
    }
    trail.markDirty();
  };
  update(0);

  return { group, trail, update, position };
}
