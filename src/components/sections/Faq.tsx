import { Reveal } from "@/components/ui/Reveal";
import { Sprite } from "@/components/ui/Sprite";
import { organizer } from "@/config/event";
import { allFaqs } from "@/lib/seo";
import { SectionHeading } from "./SectionHeading";

/** Questions on wooden signs. Native <details> keeps it accessible with zero JavaScript. */
export function Faq() {
  return (
    <section id="faq" data-section className="section" aria-labelledby="faq-title">
      <div className="section-inner">
        <div className="panel-narrow side-left">
          <Reveal>
            <SectionHeading id="faq" kicker="Signposts" sprite="sign">
              Questions, <em>answered</em>
            </SectionHeading>
          </Reveal>

          <div className="mt-8 space-y-6">
            {allFaqs.map((item, index) => (
              <Reveal key={item.q} index={Math.min(index, 4)}>
                <details className="px-box plank" name="faq">
                  <summary>
                    {/* A real heading: each question becomes a landmark for screen readers and for search. */}
                    <h3 className="m-0 [font:inherit]">{item.q}</h3>
                    <Sprite name="chevron-down" size={12} className="text-gold-300" />
                  </summary>
                  <p className="plank-body">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <p className="mt-8 bg-night-950/70 p-4 text-snow-200 [backdrop-filter:blur(6px)]">
              Still stuck? Email{" "}
              <a className="text-gold-300 underline decoration-2 underline-offset-4 hover:text-gold-200" href={`mailto:${organizer.email}`}>
                {organizer.email}
              </a>{" "}
              and the {organizer.shortName} team will help.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
