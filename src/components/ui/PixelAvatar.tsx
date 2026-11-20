/**
 * Procedural pixel portraits.
 *
 * Every name deterministically grows its own 8×8 face with a festive hat, and
 * every team name its own crest — so the party preview and the admin table
 * feel alive without anybody uploading a picture.
 */

function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Tiny deterministic generator (mulberry32). */
function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(random: () => number, items: readonly T[]): T => items[Math.floor(random() * items.length)];

const SKIN = ["#f6d2b0", "#eab98f", "#d39a6c", "#b17a4d", "#8a5a36", "#6b4226"] as const;
const SKIN_SHADE = ["#e0b48e", "#d09d72", "#b98052", "#96633b", "#724828", "#55331b"] as const;
const HAIR = ["#1d1a26", "#3a2616", "#5a3a1c", "#7a4b22", "#b0743a", "#d9a441", "#8f2f2f", "#4a4f63"] as const;
const EYES = ["#141824", "#1f3b70", "#1f6b45", "#4a2c14"] as const;
const WOOL = [
  ["#e63946", "#9d1c2b"],
  ["#2fae60", "#14613a"],
  ["#38a3e6", "#1f5f95"],
  ["#9b7bff", "#5b3fc4"],
  ["#ffc93c", "#c98a12"],
] as const;

type Grid = (string | null)[][];

function face(seed: string): Grid {
  const random = rng(hash(seed.trim().toLowerCase()));
  const tone = Math.floor(random() * SKIN.length);
  const skin = SKIN[tone];
  const shade = SKIN_SHADE[tone];
  const hair = pick(random, HAIR);
  const eye = pick(random, EYES);
  const [wool, woolDark] = pick(random, WOOL);
  const hat = Math.floor(random() * 4); // 0 santa · 1 beanie · 2 antlers · 3 elf
  const smile = random() > 0.35;
  const blush = random() > 0.5;
  const fringe = Math.floor(random() * 3);

  const g: Grid = Array.from({ length: 8 }, () => Array<string | null>(8).fill(skin));

  // Hair frames the face.
  for (let x = 0; x < 8; x++) g[2][x] = hair;
  g[3][0] = g[3][7] = hair;
  if (fringe === 1) g[3][1] = g[3][2] = hair;
  if (fringe === 2) g[3][5] = g[3][6] = hair;
  g[4][0] = g[4][7] = shade;

  // Eyes, cheeks, mouth.
  g[4][2] = g[4][5] = eye;
  if (blush) g[5][1] = g[5][6] = "#ff9a9a";
  g[5][3] = g[5][4] = shade;
  if (smile) {
    g[6][2] = g[6][5] = shade;
    g[6][3] = g[6][4] = "#7a2b2b";
  } else {
    g[6][3] = g[6][4] = "#7a2b2b";
  }
  g[7][0] = g[7][7] = shade;

  // Festive headwear.
  const white = "#f3f7ff";
  if (hat === 0) {
    // Santa hat with a pom-pom.
    g[0] = [null, null, "#e63946", "#e63946", "#e63946", "#e63946", white, null];
    g[1] = Array<string>(8).fill(white);
    g[0][1] = "#9d1c2b";
  } else if (hat === 1) {
    // Striped beanie.
    g[0] = [null, wool, wool, white, wool, wool, wool, null];
    g[1] = [woolDark, wool, white, wool, wool, white, wool, woolDark];
  } else if (hat === 2) {
    // Reindeer antlers poking out of the hair.
    g[0] = ["#8a5a2e", null, "#8a5a2e", null, null, "#8a5a2e", null, "#8a5a2e"];
    g[1] = [null, "#8a5a2e", hair, hair, hair, hair, "#8a5a2e", null];
  } else {
    // Elf cap with a golden bell.
    g[0] = [null, null, null, "#2fae60", "#2fae60", null, "#ffc93c", null];
    g[1] = [null, "#14613a", "#2fae60", "#2fae60", "#2fae60", "#2fae60", "#14613a", null];
  }
  return g;
}

function crest(seed: string): { grid: Grid; background: string } {
  const random = rng(hash(`crest:${seed.trim().toLowerCase()}`));
  const [fg, bg] = pick(random, [
    ["#ffc93c", "#6e1220"],
    ["#f3f7ff", "#14613a"],
    ["#ffe08a", "#1a2750"],
    ["#a5defe", "#0e3a5e"],
    ["#ff9a9a", "#2a1650"],
    ["#8ef0a8", "#0d2c47"],
    ["#f3f7ff", "#9d1c2b"],
  ] as const);
  const grid: Grid = Array.from({ length: 7 }, () => Array<string | null>(7).fill(null));
  // Mirror a random 4-column pattern left to right, like a banner emblem.
  for (let y = 1; y < 6; y++) {
    for (let x = 0; x < 4; x++) {
      if (random() > 0.52) grid[y][x] = grid[y][6 - x] = fg;
    }
  }
  grid[3][3] = fg;
  return { grid, background: bg };
}

function paths(grid: Grid) {
  const byColor = new Map<string, string>();
  grid.forEach((row, y) => {
    row.forEach((color, x) => {
      if (color) byColor.set(color, `${byColor.get(color) ?? ""}M${x} ${y}h1v1h-1z`);
    });
  });
  return [...byColor].map(([color, d]) => <path key={color} d={d} fill={color} />);
}

interface AvatarProps {
  /** Usually the person's name. Empty → an unclaimed slot. */
  seed: string;
  size?: number;
  className?: string;
}

export function PixelAvatar({ seed, size = 48, className }: AvatarProps) {
  const empty = seed.trim() === "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      {empty ? (
        <>
          <rect width="8" height="8" fill="#1a2750" />
          <path d="M3 2h2v1h1v1h-1v1h-1v-1h1v-1h-2zM3 6h1v1h-1z" fill="#34498c" />
        </>
      ) : (
        paths(face(seed))
      )}
    </svg>
  );
}

export function TeamCrest({ seed, size = 40, className }: AvatarProps) {
  const { grid, background } = crest(seed || "?");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 7 7"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <rect width="7" height="7" fill={background} />
      {paths(grid)}
    </svg>
  );
}
