// Pure date math shared by the calendar page (server) and the calendar UI (client).
// Every day key is a salon-local `YYYY-MM-DD`; every minute count is salon wall time.
import type { Locale } from "@/i18n/config";
import {
  addDaysKey,
  formatDateKey,
  fromMinutes,
  isoWeekday,
  startOfWeekKey,
  toDateKey,
  toMinutes,
  toTimeKey,
  zoned,
} from "@/lib/time";
import type { CalBooking, CalHours, CalTimeOff, CalView } from "./types";

export const SNAP_MIN = 15;
export const DAY_MS = 86_400_000;

export const isDateKey = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const parseView = (v: unknown): CalView | null => (v === "day" || v === "week" ? v : null);

export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / DAY_MS);
}

/** The days a view shows for an anchor date. */
export const rangeFor = (view: CalView, anchor: string): { from: string; days: number } =>
  view === "day" ? { from: anchor, days: 1 } : { from: startOfWeekKey(anchor), days: 7 };

export const stepAnchor = (view: CalView, anchor: string, dir: 1 | -1) =>
  addDaysKey(anchor, (view === "day" ? 1 : 7) * dir);

export const daysOf = (from: string, days: number) => Array.from({ length: days }, (_, i) => addDaysKey(from, i));

/** Weeks kept in the phone day strip on each side of the current one. */
export const STRIP_WEEKS_AROUND = 2;

/** The window of days the day strip can scroll through, centred on the anchor's week. */
export function stripRange(anchor: string): { from: string; days: number } {
  return {
    from: addDaysKey(startOfWeekKey(anchor), -7 * STRIP_WEEKS_AROUND),
    days: 7 * (STRIP_WEEKS_AROUND * 2 + 1),
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const noDot = (s: string) => s.replace(/\./g, "");

export function rangeTitle(view: CalView, anchor: string, locale: Locale): string {
  if (view === "day") return cap(formatDateKey(anchor, locale, { weekday: "long", day: "numeric", month: "long" }));
  const { from, days } = rangeFor(view, anchor);
  const to = addDaysKey(from, days - 1);
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  // Russian dates end in a "г." year marker that only adds noise to a heading.
  const end = formatDateKey(to, locale, { day: "numeric", month: "long", year: "numeric" }).replace(/s*г.$/, "");
  const start = formatDateKey(from, locale, sameMonth ? { day: "numeric" } : { day: "numeric", month: "long" });
  return `${start} - ${end}`;
}

/** Shorter title for phones. */
export function rangeTitleShort(view: CalView, anchor: string, locale: Locale): string {
  if (view === "day") return cap(noDot(formatDateKey(anchor, locale, { weekday: "short", day: "numeric", month: "short" })));
  const { from, days } = rangeFor(view, anchor);
  const to = addDaysKey(from, days - 1);
  const short = (k: string) => noDot(formatDateKey(k, locale, { day: "numeric", month: "short" }));
  return from.slice(0, 7) === to.slice(0, 7)
    ? `${formatDateKey(from, locale, { day: "numeric" })} - ${short(to)}`
    : `${short(from)} - ${short(to)}`;
}

// ------------------------------------------------------------------ instants

export const dayKeyOf = (ms: number) => toDateKey(new Date(ms));
export const minuteOf = (ms: number) => toMinutes(toTimeKey(new Date(ms)));
export const instant = (dateKey: string, minutes: number) => zoned(dateKey, fromMinutes(minutes)).getTime();
export const snap = (minutes: number, step = SNAP_MIN) => Math.round(minutes / step) * step;
export const durationMin = (b: { start: number; end: number }) => Math.round((b.end - b.start) / 60_000);

// --------------------------------------------------------------- hours band

export type HourBand = { startHour: number; endHour: number };

/**
 * Hours shown in the time grid: earliest opening to latest closing across the
 * visible days, plus an hour of breathing room each side, never hiding a booking.
 */
export function hourBand(dayKeys: string[], hours: CalHours[], bookings: CalBooking[]): HourBand {
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  let min = Infinity;
  let max = -Infinity;
  for (const key of dayKeys) {
    const h = byDay.get(isoWeekday(key));
    if (!h?.isOpen) continue;
    min = Math.min(min, toMinutes(h.openTime));
    max = Math.max(max, toMinutes(h.closeTime));
  }
  if (!Number.isFinite(min)) {
    min = 9 * 60;
    max = 20 * 60;
  }
  let startHour = Math.max(7, Math.floor(min / 60) - 1);
  let endHour = Math.min(22, Math.ceil(max / 60) + 1);
  const visible = new Set(dayKeys);
  for (const b of bookings) {
    const key = dayKeyOf(b.start);
    if (!visible.has(key)) continue;
    const s = minuteOf(b.start);
    const e = dayKeyOf(b.end) === key ? minuteOf(b.end) : 24 * 60;
    startHour = Math.min(startHour, Math.floor(s / 60));
    endHour = Math.max(endHour, Math.ceil(e / 60));
  }
  return { startHour: Math.max(0, startHour), endHour: Math.min(24, Math.max(endHour, startHour + 1)) };
}

export function workingWindow(dateKey: string, hours: CalHours[]): { open: number; close: number } | null {
  const h = hours.find((x) => x.weekday === isoWeekday(dateKey));
  return h?.isOpen ? { open: toMinutes(h.openTime), close: toMinutes(h.closeTime) } : null;
}

/** True when [start, end) falls outside the working day or touches time off. */
export function isOutsideHours(start: number, end: number, hours: CalHours[], timeOff: CalTimeOff[]): boolean {
  const key = dayKeyOf(start);
  const win = workingWindow(key, hours);
  if (!win) return true;
  const s = minuteOf(start);
  const e = s + Math.round((end - start) / 60_000);
  if (s < win.open || e > win.close) return true;
  return timeOff.some((o) => o.start < end && o.end > start);
}

// ----------------------------------------------------------- overlap layout

export type Placed = { booking: CalBooking; col: number; cols: number };

/** Classic column packing so overlapping blocks sit side by side instead of on top of each other. */
export function placeDay(bookings: CalBooking[]): Placed[] {
  const sorted = [...bookings].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((p) => p.col + 1));
    cluster.forEach((p) => (p.cols = cols));
    out.push(...cluster);
    cluster = [];
  };
  for (const b of sorted) {
    if (b.start >= clusterEnd && cluster.length) flush();
    const used = new Set(cluster.filter((p) => p.booking.end > b.start).map((p) => p.col));
    let col = 0;
    while (used.has(col)) col++;
    cluster.push({ booking: b, col, cols: 1 });
    clusterEnd = Math.max(clusterEnd, b.end);
  }
  if (cluster.length) flush();
  return out;
}

/** Statuses that occupy the chair (and count toward totals). */
export const isLive = (s: CalBooking["status"]) => s === "confirmed" || s === "completed";
