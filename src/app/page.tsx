import { Boot } from "@/components/hud/Boot";
import { ConsoleEgg } from "@/components/hud/ConsoleEgg";
import { Hud } from "@/components/hud/Hud";
import { ScrollDirector } from "@/components/hud/ScrollDirector";
import { About } from "@/components/sections/About";
import { Faq } from "@/components/sections/Faq";
import { Guild, SiteFooter } from "@/components/sections/Guild";
import { Hero } from "@/components/sections/Hero";
import { Loot } from "@/components/sections/Loot";
import { Realms } from "@/components/sections/Realms";
import { Register } from "@/components/sections/Register";
import { Rules } from "@/components/sections/Rules";
import { Timeline } from "@/components/sections/Timeline";
import { ToastProvider } from "@/components/ui/Toast";
import { WorldMount } from "@/components/world/WorldMount";

/**
 * The home page. One long scroll: each <section data-section> is a stop on the
 * camera's flight around the island (see components/world/engine/camera.ts),
 * and the order here must match `nav` in config/event.ts.
 */
export default function Home() {
  return (
    <ToastProvider>
      <a href="#main" className="skip-link sr-only-focusable">
        Skip to content
      </a>
      <Boot />
      <WorldMount />
      <ScrollDirector />
      <ConsoleEgg />
      <Hud />
      <main id="main" className="stage">
        <Hero />
        <About />
        <Realms />
        <Timeline />
        <Loot />
        <Rules />
        <Register />
        <Faq />
        <Guild />
      </main>
      <SiteFooter />
    </ToastProvider>
  );
}
