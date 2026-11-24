import { RegisterWizard } from "@/components/register/RegisterWizard";
import { Reveal } from "@/components/ui/Reveal";
import { event } from "@/config/event";
import { formatDay, formatTime } from "@/lib/format";
import { SectionHeading } from "./SectionHeading";

/** The reason this site exists: get a team registered. */
export function Register() {
  return (
    <section id="register" data-section className="section !items-start" aria-labelledby="register-title">
      <div className="section-inner">
        <Reveal>
          <SectionHeading
            id="register"
            kicker="Team registration"
            sprite="flag"
            center
            lead={
              <>
                Four short steps, about three minutes. Registration closes{" "}
                <strong className="text-gold-300">
                  {formatDay(event.dates.registrationCloses)} at {formatTime(event.dates.registrationCloses)}
                </strong>
                .
              </>
            }
          >
            Plant your <em>flag</em>
          </SectionHeading>
        </Reveal>

        <Reveal className="mt-12 max-sm:mt-8">
          <RegisterWizard />
        </Reveal>
      </div>
    </section>
  );
}
