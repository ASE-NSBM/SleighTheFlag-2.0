import { TIMEZONE } from "@/config/event";

/** Date helpers that always speak Sri Lanka time, on the server and in the browser. */

const dayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const longDayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "numeric", minute: "2-digit", hour12: true });
const stampFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

/** "Sat, 12 Dec 2026" */
export const formatDay = (iso: string) => dayFormat.format(new Date(iso));
/** "Saturday 12 December 2026" — spelled out, for search snippets and answer engines. */
export const formatLongDay = (iso: string) => longDayFormat.format(new Date(iso));
/** "12 Dec" */
export const formatShortDay = (iso: string) => shortDayFormat.format(new Date(iso));
/** "11:59 PM" */
export const formatTime = (iso: string) => timeFormat.format(new Date(iso));
/** "12 Dec, 11:59 pm" */
export const formatStamp = (iso: string) => stampFormat.format(new Date(iso));

/** "3 minutes ago", "2 days ago" — `now` is passed in so rendering stays pure. */
export function timeAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
