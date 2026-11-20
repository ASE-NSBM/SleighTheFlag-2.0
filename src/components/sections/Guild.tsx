import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { Sprite } from "@/components/ui/Sprite";
import { event, nav, organizer } from "@/config/event";
import { SectionHeading } from "./SectionHeading";

/** The organisers — ASE, NSBM Green University. */
export function Guild() {
  return (
    <section id="guild" data-section className="section" aria-labelledby="guild-title">
      <div className="section-inner">
        <Reveal>
          <div className="px-box px-frost snowcap p-6 sm:p-9">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <SectionHeading id="guild" kicker="The guild behind the hunt" sprite="tree">
                  Organised by <em>{organizer.shortName}</em>
                </SectionHeading>

                <div className="mt-7 flex items-center gap-5">
                  <div className="shrink-0 bg-white p-1.5 shadow-[0_0_0_4px_var(--color-wood-600),0_0_0_8px_#04060f,0_8px_0_8px_rgb(0_0_0/0.4)]">
                    <Image
                      src={organizer.logo}
                      alt={`${organizer.name} logo`}
                      width={96}
                      height={96}
                      className="block h-20 w-20 sm:h-24 sm:w-24"
                      style={{ imageRendering: "auto" }}
                    />
                  </div>
                  <div>
                    <p className="h-card !text-[0.875rem]">{organizer.name}</p>
                    <p className="mt-1 text-snow-300">{organizer.university}</p>
                    <p className="font-pixel mt-3 text-[0.5625rem] uppercase leading-relaxed tracking-widest text-gold-300">{organizer.motto}</p>
                  </div>
                </div>

                <p className="mt-7 text-snow-200">{organizer.about}</p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {[
                    { title: "Vision", body: organizer.vision, sprite: "eye" as const },
                    { title: "Mission", body: organizer.mission, sprite: "star" as const },
                  ].map((item) => (
                    <div key={item.title} className="bg-night-950/60 p-4 shadow-[inset_3px_3px_0_0_rgb(0_0_0/0.5),inset_-3px_-3px_0_0_rgb(165_222_254/0.08)]">
                      <p className="kicker !text-ice-300">
                        <Sprite name={item.sprite} size={16} />
                        {item.title}
                      </p>
                      <p className="mt-2 text-[1.0625rem] leading-normal text-snow-200">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="kicker">
                  <Sprite name="mail" size={12} />
                  Reach the organisers
                </h3>
                <ul className="mt-5 list-none space-y-4 p-0">
                  <li>
                    <a className="group flex items-center gap-4 no-underline" href={`mailto:${organizer.email}`}>
                      <span className="grid h-11 w-11 shrink-0 place-items-center bg-night-700 text-ice-300 shadow-[0_0_0_3px_#04060f]">
                        <Sprite name="mail" size={24} />
                      </span>
                      <span>
                        <span className="block text-[0.9375rem] text-snow-400">Email</span>
                        <span className="text-snow-50 underline decoration-2 underline-offset-4 group-hover:text-gold-300">{organizer.email}</span>
                      </span>
                    </a>
                  </li>
                  <li>
                    <a className="group flex items-center gap-4 no-underline" href={organizer.phoneHref}>
                      <span className="grid h-11 w-11 shrink-0 place-items-center bg-night-700 text-ice-300 shadow-[0_0_0_3px_#04060f]">
                        <Sprite name="phone" size={24} />
                      </span>
                      <span>
                        <span className="block text-[0.9375rem] text-snow-400">Phone</span>
                        <span className="text-snow-50 underline decoration-2 underline-offset-4 group-hover:text-gold-300">{organizer.phone}</span>
                      </span>
                    </a>
                  </li>
                  <li>
                    <a className="group flex items-center gap-4 no-underline" href={organizer.mapUrl} target="_blank" rel="noopener noreferrer">
                      <span className="grid h-11 w-11 shrink-0 place-items-center bg-night-700 shadow-[0_0_0_3px_#04060f]">
                        <Sprite name="pin" size={32} />
                      </span>
                      <span>
                        <span className="block text-[0.9375rem] text-snow-400">Find us</span>
                        <span className="text-snow-50 underline decoration-2 underline-offset-4 group-hover:text-gold-300">{organizer.address}</span>
                      </span>
                    </a>
                  </li>
                  {organizer.contacts.map((person) => (
                    <li key={person.name} className="flex items-center gap-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center bg-night-700 text-ice-300 shadow-[0_0_0_3px_#04060f]">
                        <Sprite name="user" size={24} />
                      </span>
                      <span>
                        <span className="block text-[0.9375rem] text-snow-400">{person.role}</span>
                        <span className="text-snow-50">
                          {person.name}
                          {person.phone ? ` · ${person.phone}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>

                <h3 className="kicker mt-9">
                  <Sprite name="link" size={12} />
                  Follow {organizer.shortName}
                </h3>
                <ul className="mt-5 flex list-none flex-wrap gap-5 p-0">
                  {organizer.socials.map((social) => (
                    <li key={social.label}>
                      <a className="px-btn px-btn-sm" href={social.url} target="_blank" rel="noopener noreferrer">
                        {social.label}
                        <Sprite name={social.sprite} size={12} />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="stage bg-night-950/90 px-[clamp(16px,4vw,56px)] pb-[calc(var(--hud-h)+28px)] pt-10 shadow-[0_-4px_0_0_#000,0_-8px_0_0_rgb(165_222_254/0.14)] [backdrop-filter:blur(10px)]">
      <div className="mx-auto max-w-[1240px]">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <a href="#spawn" className="flex items-center gap-3 no-underline">
              <Sprite name="flag" size={32} />
              <span className="font-pixel text-[0.6875rem] leading-relaxed text-snow-50">
                {event.name} <span className="text-gold-400">{event.edition}</span>
              </span>
            </a>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
              {nav.slice(1).map((item) => (
                <a key={item.id} href={`#${item.id}`} className="py-1 text-snow-300 underline-offset-4 hover:text-white hover:underline">
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <p className="mt-7 max-w-[90ch] text-[0.9375rem] leading-relaxed text-snow-400">
            © {new Date(event.dates.eventStart).getFullYear()} {organizer.name} ({organizer.shortName}), {organizer.university}. {event.fullName} is an
            independent student event. All voxel artwork on this site is original; the site is not affiliated with or endorsed by Mojang or Microsoft.
          </p>
      </div>
    </footer>
  );
}
