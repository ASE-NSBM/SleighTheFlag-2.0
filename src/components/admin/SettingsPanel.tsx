"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Sprite } from "@/components/ui/Sprite";
import type { SpriteName } from "@/components/ui/sprites";
import { event } from "@/config/event";
import { formatStamp } from "@/lib/format";
import { useAdminData } from "./AdminData";

const REASON = {
  open: "The public form is accepting teams.",
  paused: "Paused by an organiser — the public form is closed.",
  "not-yet": "Closed: the configured opening date has not arrived yet.",
  deadline: "Closed: the configured deadline has passed.",
  full: "Closed: the team cap has been reached.",
} as const;

function Row({ sprite, title, children, control }: { sprite: SpriteName; title: string; children: ReactNode; control: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-b-[3px] border-night-700 py-6 last:border-b-0">
      <div className="flex min-w-0 flex-1 basis-[320px] items-start gap-4">
        <Sprite name={sprite} size={32} />
        <div>
          <h3 className="h-card">{title}</h3>
          <div className="mt-1.5 text-[0.9375rem] leading-normal text-snow-300">{children}</div>
        </div>
      </div>
      {control}
    </div>
  );
}

/** The switches that decide whether the public can register. */
export function SettingsPanel() {
  const { settings, status, saveSettings } = useAdminData();
  const [cap, setCap] = useState<string | null>(null); // null = show the saved value
  const [busy, setBusy] = useState(false);

  if (!settings || !status) return <div className="skeleton mx-auto h-[420px] max-w-[860px]" />;

  const capValue = cap ?? (settings.maxTeams === null ? "" : String(settings.maxTeams));
  const capNumber = capValue.trim() === "" ? null : Number(capValue);
  const capValid = capNumber === null || (Number.isInteger(capNumber) && capNumber >= 1 && capNumber <= 100_000);
  const capChanged = capNumber !== settings.maxTeams;

  const save = async (patch: Parameters<typeof saveSettings>[0]) => {
    setBusy(true);
    const done = await saveSettings(patch);
    setBusy(false);
    return done;
  };

  const saveCap = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (!capValid || !capChanged) return;
    if (await save({ maxTeams: capNumber })) setCap(null);
  };

  return (
    <div className="mx-auto max-w-[860px]">
      <header>
        <p className="kicker">
          <Sprite name="sliders" size={12} />
          Control room
        </p>
        <h1 className="adm-h1 mt-3">Settings</h1>
      </header>

      <div className={`mt-7 flex items-start gap-4 px-5 py-4 ${status.open ? "bg-pine-800/55 shadow-[0_0_0_3px_var(--color-pine-600)]" : "bg-berry-800/45 shadow-[0_0_0_3px_var(--color-berry-600)]"}`} role="status">
        <Sprite name={status.open ? "flag" : "lock"} size={32} />
        <div>
          <p className="h-card">{status.open ? "Registration is open" : "Registration is closed"}</p>
          <p className="mt-1 text-snow-200">
            {REASON[status.reason]} {status.teams} {status.teams === 1 ? "team" : "teams"} so far.
          </p>
        </div>
      </div>

      <section className="px-box px-solid mt-7 px-6" aria-label="Registration">
        <Row
          sprite="flag"
          title="Accept registrations"
          control={
            <button
              type="button"
              role="switch"
              className="switch"
              aria-checked={settings.registrationOpen}
              aria-label="Accept registrations"
              disabled={busy}
              onClick={() => void save({ registrationOpen: !settings.registrationOpen })}
            />
          }
        >
          The master switch. Turn it off to pause the public form instantly — for example while you fix a problem. Teams already registered are not affected.
        </Row>

        <Row
          sprite="clock"
          title="Ignore the configured dates"
          control={
            <button
              type="button"
              role="switch"
              className="switch"
              aria-checked={settings.ignoreDeadline}
              aria-label="Ignore the configured dates"
              disabled={busy}
              onClick={() => void save({ ignoreDeadline: !settings.ignoreDeadline })}
            />
          }
        >
          Normally the form is open from <span className="text-gold-300">{formatStamp(event.dates.registrationOpens)}</span> to{" "}
          <span className="text-gold-300">{formatStamp(event.dates.registrationCloses)}</span>. Switch this on to keep accepting teams outside that window (late entries, a
          deadline extension).
        </Row>

        <Row
          sprite="party"
          title="Team cap"
          control={
            <form className="flex items-start gap-4" onSubmit={saveCap} noValidate>
              <div>
                <label htmlFor="settings-cap" className="sr-only">
                  Maximum number of teams (leave empty for no limit)
                </label>
                <input
                  id="settings-cap"
                  className="px-input data !w-[120px]"
                  inputMode="numeric"
                  placeholder="No limit"
                  aria-invalid={!capValid || undefined}
                  aria-describedby={capValid ? undefined : "settings-cap-error"}
                  value={capValue}
                  onChange={(e) => setCap(e.target.value.replace(/[^\d]/g, ""))}
                />
                {!capValid && (
                  <p id="settings-cap-error" className="px-error !mt-2 !text-[0.875rem]" role="alert">
                    1 – 100,000
                  </p>
                )}
              </div>
              <button type="submit" className="px-btn px-btn-pine" disabled={busy || !capValid || !capChanged}>
                Save
              </button>
            </form>
          }
        >
          Close the form automatically once this many teams have registered (rejected teams don&apos;t count). Leave it empty for no limit.
        </Row>
      </section>

      <section className="px-box px-solid mt-7 p-6" aria-labelledby="settings-export">
        <h2 id="settings-export" className="kicker">
          <Sprite name="download" size={12} />
          Take the data with you
        </h2>
        <p className="mt-3 text-snow-300">Every export is generated fresh from the live list.</p>
        <div className="mt-5 flex flex-wrap gap-4">
          <a className="px-btn px-btn-pine" href="/api/admin/export?format=xlsx" download>
            Excel workbook
          </a>
          <a className="px-btn px-btn-ghost" href="/api/admin/export?format=csv&layout=teams" download>
            CSV · teams
          </a>
          <a className="px-btn px-btn-ghost" href="/api/admin/export?format=csv&layout=participants" download>
            CSV · participants
          </a>
          <a className="px-btn px-btn-ghost" href="/api/admin/export?format=json" download>
            JSON
          </a>
        </div>
      </section>

      <p className="mt-7 text-[0.9375rem] leading-relaxed text-snow-400">
        Dates, team size ({event.team.minSize}–{event.team.maxSize}), prizes, rules and all the wording on the public site live in{" "}
        <code className="data text-snow-200">src/config/event.ts</code>. The admin sign-in is set with the <code className="data text-snow-200">ADMIN_USERNAME</code> and{" "}
        <code className="data text-snow-200">ADMIN_PASSWORD</code> environment variables.
      </p>
    </div>
  );
}
