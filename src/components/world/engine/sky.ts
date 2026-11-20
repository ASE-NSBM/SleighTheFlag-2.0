import * as THREE from "three";
import { mulberry32 } from "./random";

/** Everything infinitely far away: gradient dome, stars, moon and the aurora. */

export interface Sky {
  group: THREE.Group;
  update(time: number): void;
  dispose(): void;
}

const SKY_RADIUS = 420;

function dome(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x02030a) },
      uMid: { value: new THREE.Color(0x070d24) },
      uHorizon: { value: new THREE.Color(0x12285c) },
      uBelow: { value: new THREE.Color(0x04070f) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      uniform vec3 uBelow;
      varying vec3 vDir;
      void main() {
        // Posterised bands instead of a smooth gradient: sky made of pixels.
        float h = floor((vDir.y * 0.5 + 0.5) * 46.0) / 46.0;
        vec3 color = mix(uBelow, uHorizon, smoothstep(0.3, 0.49, h));
        color = mix(color, uMid, smoothstep(0.5, 0.63, h));
        color = mix(color, uTop, smoothstep(0.63, 0.9, h));
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 32, 20), material);
  mesh.renderOrder = -30;
  mesh.frustumCulled = false;
  return mesh;
}

function stars(count: number, pixelRatio: number): { points: THREE.Points; uniforms: { uTime: { value: number } } } {
  const random = mulberry32(2026);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Uniform on the sphere, keeping the upper hemisphere (and a little below).
    let x = 0;
    let y = 0;
    let z = 0;
    do {
      const u = random() * 2 - 1;
      const a = random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      x = Math.cos(a) * s;
      y = u;
      z = Math.sin(a) * s;
    } while (y < -0.12);
    positions.set([x * (SKY_RADIUS - 12), y * (SKY_RADIUS - 12), z * (SKY_RADIUS - 12)], i * 3);
    const big = random();
    sizes[i] = big > 0.975 ? 3.2 : big > 0.86 ? 2.3 : big > 0.5 ? 1.6 : 1.1;
    phases[i] = random() * 10;
    const tint = random();
    colors.set(tint > 0.86 ? [1.0, 0.86, 0.62] : tint > 0.7 ? [0.66, 0.85, 1.0] : [1, 1, 1], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));

  const uniforms = { uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        float twinkle = 0.62 + 0.38 * sin(uTime * (0.5 + fract(aPhase) * 1.9) + aPhase * 6.2831);
        vAlpha = twinkle;
        vColor = aColor;
        gl_PointSize = aSize * uPixelRatio;
      }
    `,
    // Points are drawn as squares — exactly what a pixel star should be.
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(vColor, vAlpha);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = -29;
  points.frustumCulled = false;
  return { points, uniforms };
}

function moon(): THREE.Group {
  const size = 16;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const craters = new Set(["5,4", "6,4", "5,5", "10,6", "11,6", "10,7", "11,7", "6,10", "7,10", "7,11", "11,11", "4,8"]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d > 7.3) continue;
      context.fillStyle = craters.has(`${x},${y}`) ? "#e3d8a6" : d > 6.2 ? "#f3e9bd" : "#fff8dc";
      context.fillRect(x, y, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  const halo = document.createElement("canvas");
  halo.width = halo.height = 64;
  const hc = halo.getContext("2d")!;
  const gradient = hc.createRadialGradient(32, 32, 4, 32, 32, 32);
  gradient.addColorStop(0, "rgba(190,215,255,0.55)");
  gradient.addColorStop(0.35, "rgba(140,180,255,0.16)");
  gradient.addColorStop(1, "rgba(120,160,255,0)");
  hc.fillStyle = gradient;
  hc.fillRect(0, 0, 64, 64);
  const haloTexture = new THREE.CanvasTexture(halo);
  haloTexture.colorSpace = THREE.SRGBColorSpace;

  const group = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, fog: false }),
  );
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    new THREE.MeshBasicMaterial({ map: haloTexture, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }),
  );
  glow.renderOrder = -28;
  disc.renderOrder = -27;
  group.add(glow, disc);
  group.position.set(0.139, 0.142, -0.99).normalize().multiplyScalar(SKY_RADIUS - 30);
  group.lookAt(0, 0, 0);
  return group;
}

function aurora(startDeg: number, endDeg: number, yBottom: number, yTop: number, radius: number, seed: number, intensity: number) {
  const segments = 120;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = THREE.MathUtils.degToRad(startDeg + (endDeg - startDeg) * t);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    positions.push(x, yBottom, z, x, yTop, z);
    uvs.push(t, 0, t, 1);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  const uniforms = { uTime: { value: 0 }, uSeed: { value: seed }, uIntensity: { value: intensity } };
  const material = new THREE.ShaderMaterial({
    uniforms,
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
      uniform float uSeed;
      uniform float uIntensity;
      varying vec2 vUv;

      float hash(float n) { return fract(sin(n + uSeed) * 43758.5453123); }
      float noise(float x) {
        float i = floor(x);
        float f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(hash(i), hash(i + 1.0), f);
      }

      void main() {
        // Snap to a coarse grid: the aurora is built from fat pixels.
        vec2 cells = vec2(440.0, 60.0);
        vec2 uv = (floor(vUv * cells) + 0.5) / cells;
        float t = uTime * 0.06;

        // The lower hem of the curtain ripples slowly; light is brightest there
        // and thins out as it climbs.
        float hem = 0.1 + 0.22 * noise(uv.x * 6.0 + t * 2.4) + 0.08 * noise(uv.x * 23.0 - t * 4.0);
        float above = uv.y - hem;
        float body = smoothstep(0.0, 0.03, above) * exp(-max(above, 0.0) * 3.4);

        // Vertical rays that drift sideways, and slow patches of brightness.
        float rays = 0.3 + 0.7 * pow(noise(uv.x * 120.0 + noise(uv.x * 11.0 + t * 7.0) * 8.0), 1.5);
        float patches = 0.22 + 0.78 * smoothstep(0.2, 0.8, noise(uv.x * 4.2 - t * 1.6));
        float ends = smoothstep(0.0, 0.14, uv.x) * (1.0 - smoothstep(0.86, 1.0, uv.x));

        float alpha = body * rays * patches * ends;
        alpha = floor(alpha * 12.0 + 0.5) / 12.0; // posterise

        vec3 low = vec3(0.22, 1.0, 0.6);
        vec3 mid = vec3(0.1, 0.82, 0.92);
        vec3 high = vec3(0.64, 0.4, 1.0);
        vec3 color = mix(low, mid, smoothstep(0.0, 0.16, above));
        color = mix(color, high, smoothstep(0.14, 0.5, above));

        gl_FragColor = vec4(color, alpha * uIntensity);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -26;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

export function createSky(options: { stars: number; pixelRatio: number }): Sky {
  const group = new THREE.Group();
  const skyDome = dome();
  const starField = stars(options.stars, options.pixelRatio);
  const theMoon = moon();
  const ribbons = [
    aurora(186, 354, -14, 168, 330, 1.7, 0.95),
    aurora(140, 300, 6, 214, 372, 9.2, 0.6),
    aurora(250, 410, -4, 190, 392, 4.4, 0.5),
  ];
  group.add(skyDome, starField.points, theMoon, ...ribbons.map((ribbon) => ribbon.mesh));

  return {
    group,
    update(time) {
      starField.uniforms.uTime.value = time;
      for (const ribbon of ribbons) ribbon.uniforms.uTime.value = time;
    },
    dispose() {
      group.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        for (const m of Array.isArray(material) ? material : material ? [material] : []) {
          (m as THREE.MeshBasicMaterial).map?.dispose();
          m.dispose();
        }
      });
    },
  };
}
