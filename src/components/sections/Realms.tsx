import { Reveal } from "@/components/ui/Reveal";
import { Sprite } from "@/components/ui/Sprite";
import { realms } from "@/config/event";
import { SectionHeading } from "./SectionHeading";

const DIFFICULTY = ["", "Beginner friendly", "Intermediate", "Hard"];

/** The challenge categories, presented as places to explore. */
export function Realms() {
  return (
    <section id="realms" data-section className="section" aria-labelledby="realms-title">
      <div className="section-inner">
        <Reveal>
          <SectionHeading
            id="realms"
            kicker="Challenge realms"
            sprite="pickaxe"
            center
            lead="Seven realms, each hiding flags of its own. Split up, dig in, and bring every one of them home."
          >
            Pick a realm. <em>Start digging.</em>
          </SectionHeading>
        </Reveal>

        <ul className="mt-12 grid list-none grid-cols-1 gap-x-7 gap-y-8 p-0 max-sm:mt-8 max-sm:gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          {realms.map((realm, index) => (
            <li key={realm.name}>
              <Reveal index={index % 4} className="h-full">
                <article className="px-box px-frost realm" data-accent={realm.accent}>
                  <div className="flex items-start justify-between gap-4 max-sm:contents">
                    <div className="realm-icon">
                      <Sprite name={realm.sprite} size={48} />
                    </div>
                    <div className="realm-diff text-right sm:pt-1">
                      <div className="pips" role="img" aria-label={`Difficulty: ${DIFFICULTY[realm.difficulty]}`}>
                        {[1, 2, 3].map((level) => (
                          <span key={level} className="pip" data-on={level <= realm.difficulty} />
                        ))}
                      </div>
                      <p className="mt-2 text-[0.8125rem] leading-tight text-snow-400">{DIFFICULTY[realm.difficulty]}</p>
                    </div>
                  </div>
                  <div className="realm-name">
                    <p className="realm-cat font-pixel text-[0.5625rem] uppercase leading-relaxed tracking-widest">{realm.category}</p>
                    <h3 className="h-card mt-2 max-sm:mt-1">{realm.name}</h3>
                  </div>
                  <p className="realm-blurb text-[1.0625rem] leading-normal text-snow-200 max-sm:text-[0.9375rem] max-sm:leading-snug">{realm.blurb}</p>
                </article>
              </Reveal>
            </li>
          ))}

          {/* The eighth slot keeps the grid whole — and a little mystery never hurts. */}
          <li>
            <Reveal index={3} className="h-full">
              <article className="flex h-full min-h-[240px] flex-col items-center justify-center gap-4 bg-night-950/55 p-6 text-center shadow-[0_0_0_4px_rgb(165_222_254/0.22)] [backdrop-filter:blur(6px)] max-sm:min-h-0 max-sm:flex-row max-sm:justify-start max-sm:p-4 max-sm:text-left">
                <span className="font-pixel blink text-3xl text-ice-300 max-sm:text-xl" aria-hidden="true">
                  ???
                </span>
                <h3 className="h-card">Undiscovered realm</h3>
                <p className="text-[1.0625rem] leading-normal text-snow-300 max-sm:hidden">Some challenges only appear once the hunt begins.</p>
              </article>
            </Reveal>
          </li>
        </ul>
      </div>
    </section>
  );
}
