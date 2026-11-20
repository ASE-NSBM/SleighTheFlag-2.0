import type { ReactNode } from "react";
import { Sprite } from "@/components/ui/Sprite";
import type { SpriteName } from "@/components/ui/sprites";

interface SectionHeadingProps {
  /** Section id — the heading gets `${id}-title` so the section can be labelled by it. */
  id: string;
  kicker: string;
  sprite: SpriteName;
  children: ReactNode;
  lead?: ReactNode;
  center?: boolean;
}

export function SectionHeading({ id, kicker, sprite, children, lead, center }: SectionHeadingProps) {
  return (
    <header className={center ? "mx-auto max-w-[760px] text-center" : undefined}>
      <p className="kicker">
        <Sprite name={sprite} size={16} />
        {kicker}
      </p>
      <h2 id={`${id}-title`} className="h-section mt-4">
        {children}
      </h2>
      {lead && <p className="lead mt-5">{lead}</p>}
    </header>
  );
}
