import Image from "next/image";
import { Sprite } from "@/components/ui/Sprite";
import { event, organizer } from "@/config/event";
import { formatDay } from "@/lib/format";
import { Countdown } from "./Countdown";
import { LiveCount } from "./LiveCount";

/** First screen: the title over the island, one clear action, and the clock. */
export function Hero() {
  return (
    <section id="spawn" data-section className="section hero" aria-labelledby="spawn-title">
      <div className="section-inner">
        <div className="max-w-[760px]">
          <a href="#guild" className="px-chip px-chip-gold pop-in max-w-full whitespace-normal no-underline max-sm:text-[0.5625rem]" style={{ padding: "8px 12px 8px 8px" }}>
            <Image src={organizer.logo} alt="" width={24} height={24} className="h-6 w-6 shrink-0" style={{ imageRendering: "auto" }} />
            <span>
              {organizer.shortName} · {organizer.university}
              <span className="max-sm:hidden"> presents</span>
            </span>
          </a>

          <h1 id="spawn-title" className="title mt-6" aria-label={event.fullName}>
            <span className="block" aria-hidden="true">
              <span className="title-word title-berry" data-text="Sleigh">
                Sleigh
              </span>
            </span>{" "}
            <span className="block" aria-hidden="true">
              <span className="title-word title-ice" data-text="The">
                The
              </span>{" "}
              <span className="title-word title-pine" data-text="Flag">
                Flag
              </span>
              {/* A word break for text-only readers; it takes no room on screen. */}
              <span className="sr-only"> </span>
              <span className="title-version">{event.edition}</span>
            </span>
          </h1>

          {/* On phones: no icon, so the line starts flush with the title, and the date gets its own line. */}
          <p className="kicker mt-7 text-ice-300 max-sm:mt-6">
            <Sprite name="snowflake" size={16} className="max-sm:hidden" />
            <span className="max-sm:[text-wrap:balance]">
              {event.kicker}
              <span className="max-sm:hidden"> · </span>
              <span className="max-sm:mt-1 max-sm:block max-sm:text-gold-300">{formatDay(event.dates.eventStart)}</span>
            </span>
          </p>
          <p className="lead mt-3 max-w-[56ch] [text-shadow:0_2px_0_rgb(4_6_15/0.7)]">{event.tagline}</p>

          <div className="mt-7 flex flex-wrap items-center gap-6 max-sm:mt-6">
            <a href="#register" className="px-btn px-btn-berry px-btn-lg max-sm:w-full">
              <Sprite name="flag" size={24} />
              Register your team
            </a>
            {/* One action is enough on a phone: scrolling already explores the island. */}
            <a href="#about" className="px-btn px-btn-ghost px-btn-lg max-sm:hidden">
              Explore the island
              <Sprite name="chevron-down" size={12} />
            </a>
          </div>

          <div className="mt-8 max-sm:mt-7">
            <Countdown />
          </div>

          <div className="mt-5">
            <LiveCount />
          </div>
        </div>
      </div>
    </section>
  );
}
