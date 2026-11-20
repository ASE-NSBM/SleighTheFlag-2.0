import { Reveal } from "@/components/ui/Reveal";
import { Sprite } from "@/components/ui/Sprite";
import { event, highlights, organizer } from "@/config/event";
import { SectionHeading } from "./SectionHeading";

export function About() {
  return (
    <section id="about" data-section className="section" aria-labelledby="about-title">
      <div className="section-inner">
        <Reveal className="panel-narrow side-right">
          <div className="px-box px-frost snowcap p-6 sm:p-8">
            <SectionHeading id="about" kicker="Quest briefing" sprite="book">
              What is <em>Sleigh The Flag</em>?
            </SectionHeading>

            <div className="mt-6 space-y-4 text-snow-200">
              <p>
                {event.fullName} is a Capture The Flag competition from the {organizer.name} ({organizer.shortName}) at {organizer.university}.
                Teams take on security challenges — every one you crack reveals a hidden <strong className="text-gold-300">flag</strong>, and every flag
                puts points on the board.
              </p>
              <p>
                Bring your sharpest crew. Dig through web apps, break ciphers, pull binaries apart and follow tracks in the snow. The team holding the
                most flags when the scoreboard freezes wins.
              </p>
            </div>

            <dl className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {highlights.map((item) => (
                <div key={item.label} className="flex items-center gap-4 bg-night-950/60 p-3 shadow-[inset_3px_3px_0_0_rgb(0_0_0/0.5),inset_-3px_-3px_0_0_rgb(165_222_254/0.08)]">
                  <Sprite name={item.sprite} size={32} />
                  <div>
                    <dt className="font-pixel text-[0.5625rem] uppercase tracking-widest text-snow-400">{item.label}</dt>
                    <dd className="mt-1 leading-snug text-snow-50">{item.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <p className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-snow-300">
              <span className="font-pixel text-[0.625rem] uppercase tracking-widest text-snow-400">Flags look like</span>
              <code className="term bg-night-950 px-3 py-1 text-pine-300 shadow-[0_0_0_2px_var(--color-pine-700)]">{event.flagFormat}</code>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
