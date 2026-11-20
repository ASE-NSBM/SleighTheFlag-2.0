import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";

export const metadata: Metadata = {
  title: "Control room",
  robots: { index: false, follow: false },
};

/* A quiet CSS snowfall behind the panel — placed by formula, so it renders identically every time. */
const flakes = Array.from({ length: 26 }, (_, index) => {
  const a = Math.sin(index * 91.7) * 10000;
  const b = Math.sin(index * 47.3) * 10000;
  const r1 = a - Math.floor(a);
  const r2 = b - Math.floor(b);
  return {
    left: `${(r1 * 100).toFixed(2)}%`,
    "--s": `${3 + (index % 3) * 2}px`,
    "--o": (0.18 + r2 * 0.4).toFixed(2),
    "--t": `${(11 + r2 * 14).toFixed(1)}s`,
    "--d": `${(-r1 * 20).toFixed(1)}s`,
    "--drift": `${Math.round((r2 - 0.5) * 120)}px`,
  } as CSSProperties;
});

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="snowfield" aria-hidden="true">
        {flakes.map((style, index) => (
          <i key={index} style={style} />
        ))}
      </div>
      <div className="adm">{children}</div>
    </>
  );
}
