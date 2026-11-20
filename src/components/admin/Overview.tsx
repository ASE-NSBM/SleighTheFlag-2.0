"use client";

import Link from "next/link";
import { useMemo } from "react";
import { TeamCrest } from "@/components/ui/PixelAvatar";
import { Sprite } from "@/components/ui/Sprite";
import type { SpriteName } from "@/components/ui/sprites";
import { event, TIMEZONE } from "@/config/event";
import { formatShortDay, formatStamp, plural, timeAgo } from "@/lib/format";
import type { Team } from "@/lib/types";
import { useAdminData } from "./AdminData";
import { EmptyState, StatusChip, useNow } from "./bits";

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE });
const DAY = 86_400_000;
const WINDOW = 14;

function Stat({ sprite, value, label, hint }: { sprite: SpriteName; value: number | string; label: string; hint?: string }) {
  return (
    <div className="px-box px-solid stat">
      <div className="grid h-14 w-14 place-items-center bg-night-950/70 shadow-[inset_3px_3px_0_0_rgb(0_0_0/0.5),inset_-3px_-3px_0_0_rgb(255_255_255/0.07)]">
        <Sprite name={sprite} size={32} />
      </div>
      <div className="min-w-0">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {hint && <div className="mt-1 truncate text-[0.875rem] text-snow-400">{hint}</div>}
      </div>
    </div>
  );
}

function Card({ title, sprite, children, action }: { title: string; sprite: SpriteName; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="px-box px-solid p-5">
      <header className="mb-5 flex items-center justify-between gap-4">
        <h2 className="kicker">
          <Sprite name={sprite} size={16} />
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function compute(teams: Team[], now: number | null) {
  const active = teams.filter((team) => team.status !== "rejected");
  const players = active.reduce((sum, team) => sum + team.members.length, 0);
  const byStatus = { pending: 0, approved: 0, rejected: 0 };
  for (const team of teams) byStatus[team.status]++;

  const universities = new Map<string, number>();
  for (const team of active) universities.set(team.university, (universities.get(team.university) ?? 0) + 1);
  const topUniversities = [...universities].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const sizes = new Map<number, number>();
  for (const team of active) sizes.set(team.members.length, (sizes.get(team.members.length) ?? 0) + 1);
  const sizeRows = Array.from({ length: event.team.maxSize }, (_, i) => i + 1)
    .filter((size) => size >= event.team.minSize || sizes.has(size))
    .map((size) => [size, sizes.get(size) ?? 0] as const);

  // Registrations per day, for the last two weeks (Sri Lanka calendar days).
  const days: { key: string; label: string; count: number }[] = [];
  if (now !== null) {
    const counts = new Map<string, number>();
    for (const team of teams) {
      const key = dayKey.format(new Date(team.createdAt));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (let i = WINDOW - 1; i >= 0; i--) {
      const date = new Date(now - i * DAY);
      const key = dayKey.format(date);
      days.push({ key, label: formatShortDay(date.toISOString()), count: counts.get(key) ?? 0 });
    }
  }

  return { active: active.length, players, byStatus, universities: universities.size, topUniversities, sizeRows, days };
}

export function Overview() {
  const { teams, loading, error, refresh, status } = useAdminData();
  const now = useNow();
  const stats = useMemo(() => compute(teams, now), [teams, now]);
  const today = stats.days.at(-1)?.count ?? 0;
  const peak = Math.max(1, ...stats.days.map((day) => day.count));
  const total = teams.length || 1;
  const recent = teams.slice(0, 6);

  return (
    <div className="mx-auto max-w-[1280px]">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="kicker">
            <Sprite name="grid" size={12} />
            Control room
          </p>
          <h1 className="adm-h1 mt-3">Overview</h1>
          <p className="mt-2 text-snow-300">
            Registration closes <span className="text-gold-300">{formatStamp(event.dates.registrationCloses)}</span> · the hunt starts{" "}
            <span className="text-gold-300">{formatStamp(event.dates.eventStart)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button type="button" className="px-btn px-btn-ghost" onClick={() => void refresh()}>
            <Sprite name="clock" size={16} />
            Refresh
          </button>
          <a className="px-btn px-btn-pine" href="/api/admin/export?format=xlsx" download>
            <Sprite name="download" size={12} />
            Export Excel
          </a>
        </div>
      </header>

      {error && (
        <p className="mt-6 flex gap-3 bg-berry-800/45 px-4 py-3 text-berry-300 shadow-[0_0_0_2px_var(--color-berry-600)]" role="alert">
          <Sprite name="alert" size={12} className="mt-[7px]" />
          <span>{error}</span>
        </p>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Stat sprite="flag" value={loading ? "–" : stats.active} label="Teams" hint={loading ? undefined : `${today} joined today`} />
        <Stat sprite="party" value={loading ? "–" : stats.players} label="Players" hint={stats.active ? `${(stats.players / stats.active).toFixed(1)} per team` : undefined} />
        <Stat sprite="cap" value={loading ? "–" : stats.universities} label="Universities" />
        <Stat
          sprite="clock"
          value={loading ? "–" : stats.byStatus.pending}
          label="Waiting for review"
          hint={status?.open === false ? "Registration is closed" : stats.byStatus.pending ? "Needs your attention" : "All caught up"}
        />
      </div>

      <div className="mt-7 grid gap-7 xl:grid-cols-[1.6fr_1fr]">
        <Card title={`Registrations · last ${WINDOW} days`} sprite="clock">
          {stats.days.length === 0 ? (
            <div className="skeleton h-[200px]" />
          ) : (
            <div
              role="img"
              aria-label={`Registrations per day over the last ${WINDOW} days. ${stats.days.map((day) => `${day.label}: ${day.count}`).join(", ")}.`}
              className="flex h-[210px] items-end gap-1.5 sm:gap-2.5"
            >
              {stats.days.map((day, index) => (
                <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${day.label}: ${plural(day.count, "team")}`}>
                  <span className={`font-pixel text-[0.5rem] ${day.count ? "text-snow-100" : "text-transparent"}`}>{day.count}</span>
                  <div
                    className="w-full origin-bottom"
                    style={{
                      height: `${Math.max(day.count ? 6 : 2, (day.count / peak) * 72)}%`,
                      background: day.count
                        ? index === stats.days.length - 1
                          ? "linear-gradient(180deg,#fff0b8 0 12%,#ffc93c 12% 100%)"
                          : "linear-gradient(180deg,#8ef0a8 0 12%,#2fae60 12% 100%)"
                        : "rgb(255 255 255 / 0.09)",
                      boxShadow: day.count ? "inset -3px 0 0 0 rgb(0 0 0 / 0.22)" : undefined,
                      animation: "grow-y 600ms cubic-bezier(0.22,1,0.36,1) both",
                      animationDelay: `${index * 28}ms`,
                    }}
                  />
                  <span className="font-pixel h-3 whitespace-nowrap text-[0.4375rem] text-snow-400">{index % 2 === 1 || index === stats.days.length - 1 ? day.label : ""}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Review status" sprite="scroll">
          <div className="flex h-7 w-full overflow-hidden bg-night-950 shadow-[0_0_0_3px_#04060f]" role="img" aria-label={`${stats.byStatus.approved} approved, ${stats.byStatus.pending} pending, ${stats.byStatus.rejected} rejected`}>
            <div style={{ width: `${(stats.byStatus.approved / total) * 100}%` }} className="bg-pine-500 shadow-[inset_0_4px_0_0_var(--color-pine-300)]" />
            <div style={{ width: `${(stats.byStatus.pending / total) * 100}%` }} className="bg-gold-500 shadow-[inset_0_4px_0_0_var(--color-gold-200)]" />
            <div style={{ width: `${(stats.byStatus.rejected / total) * 100}%` }} className="bg-berry-600 shadow-[inset_0_4px_0_0_var(--color-berry-400)]" />
          </div>
          <ul className="mt-5 list-none space-y-3 p-0">
            {(["approved", "pending", "rejected"] as const).map((key) => (
              <li key={key} className="flex items-center justify-between gap-4">
                <StatusChip status={key} />
                <span className="font-pixel text-[0.75rem] text-snow-50">{stats.byStatus[key]}</span>
              </li>
            ))}
          </ul>

          <h3 className="kicker mt-7 !text-snow-400">Team sizes</h3>
          <ul className="mt-4 list-none space-y-3 p-0">
            {stats.sizeRows.map(([size, count]) => (
              <li key={size} className="grid grid-cols-[84px_1fr_28px] items-center gap-3">
                <span className="text-[0.9375rem] text-snow-300">{plural(size, "player")}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(count / Math.max(1, stats.active)) * 100}%`, "--bar": "#38a3e6", "--bar-hi": "#a5defe" } as React.CSSProperties} />
                </div>
                <span className="font-pixel text-right text-[0.625rem] text-snow-100">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-7 grid gap-7 xl:grid-cols-2">
        <Card title="Universities on the island" sprite="cap">
          {stats.topUniversities.length === 0 ? (
            <EmptyState sprite="cap" title="No universities yet" />
          ) : (
            <ol className="list-none space-y-4 p-0">
              {stats.topUniversities.map(([name, count], index) => (
                <li key={name}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-4">
                    <span className="min-w-0 truncate text-snow-100">
                      <span className="font-pixel mr-2 text-[0.5625rem] text-gold-400">{index + 1}</span>
                      {name}
                    </span>
                    <span className="font-pixel shrink-0 text-[0.625rem] text-snow-100">{plural(count, "team")}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(count / stats.topUniversities[0][1]) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card
          title="Latest arrivals"
          sprite="flag"
          action={
            <Link href="/admin/teams" className="text-[0.9375rem] text-ice-300 underline decoration-2 underline-offset-4 hover:text-white">
              All teams
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="skeleton h-12" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState sprite="snowflake" title="No teams yet">
              Share the registration link — new teams appear here the moment they sign up.
            </EmptyState>
          ) : (
            <ul className="list-none space-y-1 p-0">
              {recent.map((team) => (
                <li key={team.id}>
                  <Link href={`/admin/teams?team=${team.id}`} className="-mx-2 flex items-center gap-4 px-2 py-2 no-underline hover:bg-white/5">
                    <span className="shadow-[0_0_0_3px_#04060f]">
                      <TeamCrest seed={team.name} size={36} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-snow-50">{team.name}</span>
                      <span className="block truncate text-[0.875rem] text-snow-400">
                        {team.university} · {plural(team.members.length, "player")}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-right text-[0.875rem] text-snow-400 sm:block">{now === null ? "" : timeAgo(team.createdAt, now)}</span>
                    <StatusChip status={team.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
