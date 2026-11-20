import { Reveal } from "@/components/ui/Reveal";
import { timeline } from "@/config/event";
import { formatDay, formatTime } from "@/lib/format";
import { QuestLog } from "./QuestLog";
import { SectionHeading } from "./SectionHeading";

/** Key dates as a quest log: done, next up, still ahead. */
export function Timeline() {
  // Dates are formatted here on the server (Sri Lanka time) so every visitor sees the same text.
  const quests = timeline.map((item) => ({
    title: item.title,
    note: item.note,
    sprite: item.sprite,
    at: item.at,
    day: formatDay(item.at),
    time: formatTime(item.at),
  }));

  return (
    <section id="quests" data-section className="section" aria-labelledby="quests-title">
      <div className="section-inner">
        <Reveal className="panel-narrow side-left">
          <div className="px-box px-frost snowcap p-6 sm:p-8">
            <SectionHeading id="quests" kicker="Quest log" sprite="clock">
              Mark your <em>calendar</em>
            </SectionHeading>
            <p className="mt-4 text-[1rem] text-snow-400">All times are Sri Lanka time (GMT+5:30).</p>
            <QuestLog quests={quests} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
