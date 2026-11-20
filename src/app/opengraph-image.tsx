import { ImageResponse } from "next/og";
import { compileSprite, PALETTE, SPRITES } from "@/components/ui/sprites";
import { event, organizer } from "@/config/event";
import { formatDay } from "@/lib/format";

/**
 * The preview card shown when the link is shared (WhatsApp, Facebook, X…).
 * Everything is drawn from pixels in code — title lettering included — so the
 * card needs no font or image files and always matches the site.
 */

export const alt = `${event.fullName} — ${event.kicker}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* A tiny 5×7 pixel alphabet: just the glyphs the title needs. */
const GLYPHS: Record<string, string[]> = {
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  " ": ["000", "000", "000", "000", "000", "000", "000"],
};

function Word({ text, px, top, body, shade }: { text: string; px: number; top: string; body: string; shade: string }) {
  const cells: { x: number; y: number }[] = [];
  let cursor = 0;
  for (const char of text.toUpperCase()) {
    const glyph = GLYPHS[char] ?? GLYPHS[" "];
    glyph.forEach((row, y) => {
      [...row].forEach((bit, x) => {
        if (bit === "1") cells.push({ x: cursor + x, y });
      });
    });
    cursor += glyph[0].length + 1;
  }
  const width = (cursor - 1) * px;
  return (
    <div style={{ display: "flex", position: "relative", width: width + px, height: 8 * px }}>
      {/* the "extruded" block behind the letters */}
      {cells.map((cell, index) => (
        <div key={`s${index}`} style={{ position: "absolute", left: cell.x * px + px * 0.5, top: cell.y * px + px * 0.6, width: px, height: px, background: shade }} />
      ))}
      {cells.map((cell, index) => (
        <div key={index} style={{ position: "absolute", left: cell.x * px, top: cell.y * px, width: px, height: px, background: cell.y === 0 ? top : body }} />
      ))}
    </div>
  );
}

function Sprite({ name, px }: { name: keyof typeof SPRITES; px: number }) {
  const rows: string[] = SPRITES[name];
  compileSprite(name); // validates the sprite exists at build time
  return (
    <div style={{ display: "flex", position: "relative", width: rows.length * px, height: rows.length * px }}>
      {rows.flatMap((row, y) =>
        [...row].map((char, x) =>
          char === "." ? null : <div key={`${x}-${y}`} style={{ position: "absolute", left: x * px, top: y * px, width: px, height: px, background: PALETTE[char] }} />,
        ),
      )}
    </div>
  );
}

/* Deterministic "snow" for the backdrop. */
const flakes = Array.from({ length: 70 }, (_, index) => {
  const a = Math.sin(index * 12.9898) * 43758.5453;
  const b = Math.sin(index * 78.233) * 12543.123;
  return { left: (a - Math.floor(a)) * 1200, top: (b - Math.floor(b)) * 630, size: 4 + (index % 3) * 3, opacity: 0.25 + ((index * 7) % 10) / 16 };
});

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(180deg, #04060f 0%, #0a1230 58%, #132452 100%)",
          color: "#f3f7ff",
          fontFamily: "sans-serif",
        }}
      >
        {/* aurora bands */}
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 150, background: "linear-gradient(180deg, rgba(46,242,192,0.3), rgba(46,242,192,0))" }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 230, background: "linear-gradient(180deg, rgba(155,123,255,0.2), rgba(155,123,255,0))" }} />
        {flakes.map((flake, index) => (
          <div key={index} style={{ position: "absolute", left: flake.left, top: flake.top, width: flake.size, height: flake.size, background: "#ffffff", opacity: flake.opacity }} />
        ))}
        {/* snowy ground */}
        <div style={{ position: "absolute", left: 0, bottom: 0, width: 1200, height: 46, background: "#eef4ff" }} />
        <div style={{ position: "absolute", left: 0, bottom: 46, width: 1200, height: 10, background: "#c2d2ee" }} />

        <div style={{ position: "absolute", right: -40, bottom: 56, display: "flex" }}>
          <Sprite name="flag" px={18} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "64px 72px", gap: 0 }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: "#ffc93c", textTransform: "uppercase", fontWeight: 700 }}>
            {organizer.shortName} · {organizer.university} presents
          </div>
          <div style={{ display: "flex", marginTop: 34 }}>
            <Word text="SLEIGH" px={14} top="#ffffff" body="#e63946" shade="#6e1220" />
          </div>
          <div style={{ display: "flex", marginTop: 22, alignItems: "flex-end", gap: 28 }}>
            <Word text="THE" px={14} top="#ffffff" body="#6cc4f7" shade="#0e3a5e" />
            <Word text="FLAG" px={14} top="#ffffff" body="#2fae60" shade="#093f22" />
            <div style={{ display: "flex", padding: "10px 12px 12px", background: "#ffc93c", boxShadow: "0 7px 0 0 #8f600a", marginBottom: 12 }}>
              <Word text="2.0" px={7} top="#04060f" body="#04060f" shade="#ffc93c" />
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 48, fontSize: 32, fontWeight: 700 }}>
            {event.kicker} · {formatDay(event.dates.eventStart)}
          </div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 27, color: "#c2d2ee" }}>Register your team now</div>
        </div>
      </div>
    ),
    size,
  );
}
