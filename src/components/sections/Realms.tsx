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

        <ul className="mt-8 grid list-none grid-cols-2 gap-x-4 gap-y-5 p-0 sm:mt-12 sm:gap-x-7 sm:gap-y-8 xl:grid-cols-4">
          {realms.map((realm, index) => (
            <li key={realm.name}>
              <Reveal index={index % 4} className="h-full">
                <article className="px-box px-frost realm" data-accent={realm.accent}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="realm-icon">
                      <Sprite name={realm.sprite} size={48} />
                    </div>
                    <div className="pt-1 text-right">
                      <div className="pips" role="img" aria-label={`Difficulty: ${DIFFICULTY[realm.difficulty]}`}>
                        {[1, 2, 3].map((level) => (
                          <span key={level} className="pip" data-on={level <= realm.difficulty} />
                        ))}
                      </div>
                      <p className="mt-2 hidden text-[0.8125rem] leading-tight text-snow-400 sm:block">{DIFFICULTY[realm.difficulty]}</p>
                    </div>
                  </div>
                  <div>
                    <p className="realm-cat font-pixel text-[0.5625rem] uppercase leading-relaxed tracking-widest">{realm.category}</p>
                    <h3 className="h-card mt-2">{realm.name}</h3>
                  </div>
                  <p className="hidden text-[1.0625rem] leading-normal text-snow-200 sm:block">{realm.blurb}</p>
                </article>
              </Reveal>
            </li>
          ))}

          {/* The eighth slot keeps the grid whole — and a little mystery never hurts. */}
          <li>
            <Reveal index={3} className="h-full">
              <article className="flex h-full min-h-[120px] flex-col sm:min-h-[240px] items-center justify-center gap-4 bg-night-950/55 p-6 text-center shadow-[0_0_0_4px_rgb(165_222_254/0.22)] [backdrop-filter:blur(6px)]">
                <span className="font-pixel blink text-3xl text-ice-300" aria-hidden="true">
                  ???
                </span>
                <h3 className="h-card">Undiscovered realm</h3>
                <p className="hidden text-[1.0625rem] leading-normal text-snow-300 sm:block">Some challenges only appear once the hunt begins.</p>
              </article>
            </Reveal>
          </li>
        </ul>
      </div>
    </section>
  );
}
