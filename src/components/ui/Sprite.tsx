import { compileSprite, type SpriteName } from "./sprites";

interface SpriteProps {
  name: SpriteName;
  /** Rendered size in CSS pixels. Multiples of the grid (16 or 12) stay perfectly crisp. */
  size?: number;
  className?: string;
  /** Give the sprite a name when it carries meaning on its own; otherwise it is decorative. */
  title?: string;
}

/** Renders a pixel sprite as a crisp inline SVG. Works in Server and Client Components. */
export function Sprite({ name, size = 32, className, title }: SpriteProps) {
  const { size: grid, layers } = compileSprite(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${grid} ${grid}`}
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      {layers.map((layer) => (
        <path key={layer.color} d={layer.d} fill={layer.color} />
      ))}
    </svg>
  );
}
