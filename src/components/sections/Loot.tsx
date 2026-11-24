import { Reveal } from "@/components/ui/Reveal";
import { Sprite } from "@/components/ui/Sprite";
import { prizes } from "@/config/event";
import { SectionHeading } from "./SectionHeading";

/* On wide screens the champions' chest sits in the middle, raised like a podium. */
const ORDER = ["sm:order-2 lg:-translate-y-6", "sm:order-1", "sm:order-3"];
const SPRITE = { gold: "trophy", silver: "chest", bronze: "chest" } as const;

export function Loot() {
  return (
    <section id="loot" data-section className="section" aria-labelledby="loot-title">
      <div className="section-inner">
        <Reveal>
          <SectionHeading
            id="loot"
            kicker="Loot table"
            sprite="chest"
            center
            lead="Three chests wait under the great tree for the teams that capture the most flags."
          >
            Glory, and <em>what&apos;s in the chests</em>
          </SectionHeading>
        </Reveal>

        <ul className="mx-auto mt-8 grid max-w-[980px] list-none grid-cols-1 gap-x-8 gap-y-5 p-0 sm:mt-14 sm:grid-cols-3 sm:gap-y-9">
          {prizes.map((prize, index) => (
            <li key={prize.place} className={ORDER[index]}>
              <Reveal index={index} className="h-full">
                <article className="px-box px-frost loot h-full" data-tier={prize.tier}>
                  <span className="loot-place">{prize.place}</span>
                  <Sprite name={SPRITE[prize.tier]} size={64} className="loot-icon float" />
                  <div className="loot-text">
                    <h3 className="h-card">{prize.title}</h3>
                    <p className="loot-reward">{prize.reward}</p>
                    <ul className="mt-1 hidden list-none space-y-1 p-0 text-[1.0625rem] text-snow-300 sm:block">
                      {prize.perks.map((perk) => (
                        <li key={perk}>{perk}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
