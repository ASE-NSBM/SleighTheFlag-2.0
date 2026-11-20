import { PixelAvatar, TeamCrest } from "@/components/ui/PixelAvatar";
import { Sprite } from "@/components/ui/Sprite";
import type { PersonInput } from "@/lib/types";

interface PartyPreviewProps {
  teamName: string;
  university: string;
  members: PersonInput[];
  maxSize: number;
  /** Shown instead of the hint once the team is registered. */
  code?: string;
}

/**
 * The team card that fills in as you type: a crest grown from the team name
 * and a pixel portrait for every member. It makes a form feel like building
 * a party rather than filling in paperwork.
 */
export function PartyPreview({ teamName, university, members, maxSize, code }: PartyPreviewProps) {
  const filled = members.filter((member) => member.fullName.trim() !== "").length;
  const slots = Array.from({ length: maxSize }, (_, index) => members[index] ?? null);

  return (
    <div className="px-box px-solid p-5" aria-hidden={code ? undefined : true}>
      <div className="flex items-center gap-4">
        <div className="shadow-[0_0_0_3px_#04060f,0_0_0_6px_var(--color-gold-600)]">
          <TeamCrest seed={teamName} size={56} />
        </div>
        <div className="min-w-0">
          <p className="font-pixel break-words text-[0.75rem] leading-[1.6] text-snow-50">{teamName.trim() || "Your team name"}</p>
          <p className="mt-1 truncate text-[0.9375rem] text-snow-400">{university.trim() || "Your university"}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t-4 border-night-700 pt-4">
        <p className="font-pixel text-[0.5625rem] uppercase tracking-widest text-snow-400">Party</p>
        <p className="font-pixel text-[0.625rem] text-gold-300">
          {filled}/{maxSize}
        </p>
      </div>

      <ul className="mt-3 list-none space-y-3 p-0">
        {slots.map((member, index) => {
          const name = member?.fullName.trim() ?? "";
          return (
            <li key={index} className="flex items-center gap-3">
              <div className={`shadow-[0_0_0_3px_#04060f] ${name ? "pop-in" : "opacity-70"}`} key={name ? "filled" : "empty"}>
                <PixelAvatar seed={name} size={40} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate leading-tight ${name ? "text-snow-50" : "text-snow-500"}`}>{name || (member ? "Waiting for a name…" : "Open slot")}</p>
                <p className="font-pixel mt-1 text-[0.5rem] uppercase tracking-widest text-snow-500">{index === 0 ? "Leader" : `Member ${index + 1}`}</p>
              </div>
              {index === 0 && <Sprite name="star" size={16} />}
            </li>
          );
        })}
      </ul>

      {code && (
        <div className="mt-5 border-t-4 border-night-700 pt-4 text-center">
          <p className="font-pixel text-[0.5625rem] uppercase tracking-widest text-snow-400">Registration code</p>
          <p className="term mt-1 text-[1.75rem] text-gold-300">{code}</p>
        </div>
      )}
    </div>
  );
}
