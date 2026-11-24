import { Reveal } from "@/components/ui/Reveal";
import { Sprite } from "@/components/ui/Sprite";
import { rules } from "@/config/event";
import { SectionHeading } from "./SectionHeading";

export function Rules() {
  return (
    <section id="rules" data-section className="section" aria-labelledby="rules-title">
      <div className="section-inner">
        <Reveal className="panel-narrow side-right">
          <div className="px-box px-frost snowcap p-6 sm:p-8">
            <SectionHeading id="rules" kicker="Rules & eligibility" sprite="scroll">
              The <em>code</em> of the North
            </SectionHeading>

            <ol className="mt-6 list-none space-y-4 p-0 sm:mt-7 sm:space-y-5">
              {rules.map((rule, index) => (
                <li key={rule.title} className="grid grid-cols-[40px_1fr] gap-4">
                  <span
                    aria-hidden="true"
                    className="font-pixel grid h-10 w-10 place-items-center bg-berry-700 text-[0.75rem] text-white shadow-[inset_0_3px_0_0_var(--color-berry-500),inset_0_-3px_0_0_var(--color-berry-800),0_0_0_3px_#04060f]"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="h-card">{rule.title}</h3>
                    <p className="mt-1.5 text-[0.9375rem] leading-normal text-snow-300 sm:text-[1.0625rem]">{rule.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <a href="#register" className="px-btn px-btn-pine">
                <Sprite name="check" size={12} />
                Got it — register
              </a>
              <a href="#faq" className="text-snow-300 underline decoration-2 underline-offset-4 hover:text-white">
                Questions first?
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
