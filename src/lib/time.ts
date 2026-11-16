import { TZDate } from "@date-fns/tz";
import type { Locale } from "@/i18n/config";

// The chair is in Chișinău; every slot, report and calendar day is in salon time,
// regardless of where the browser or server is.
export const TZ = "Europe/Chisinau";

export const intlLocale: Record<Locale, string> = { ro: "ro-RO", ru: "ru-RU" };

const dateKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeKeyFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Salon-local calendar day of an instant, as `YYYY-MM-DD`. */
export const toDateKey = (d: Date) => dateKeyFmt.format(d);

/** Salon-local wall time of an instant, as `HH:mm`. */
export const toTimeKey = (d: Date) => timeKeyFmt.format(d);

/** The instant at which the salon clock shows `dateKey timeKey`. */
export function zoned(dateKey: string, timeKey = "00:00"): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = timeKey.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, TZ).getTime());
}

export function addDaysKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** ISO weekday, Monday = 1 … Sunday = 7. */
export function isoWeekday(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

/** Monday of the ISO week containing `dateKey`. */
export const startOfWeekKey = (dateKey: string) => addDaysKey(dateKey, 1 - isoWeekday(dateKey));

export const toMinutes = (timeKey: string) => {
  const [h, m] = timeKey.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

export function formatInTz(
  value: Date | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intlLocale[locale], { timeZone: TZ, ...options }).format(date);
}

/** Formats a `YYYY-MM-DD` day key (noon avoids any DST edge). */
export const formatDateKey = (
  dateKey: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
) => formatInTz(zoned(dateKey, "12:00"), locale, options);

export const formatPrice = (amount: number, locale: Locale) =>
  `${new Intl.NumberFormat(intlLocale[locale]).format(amount)} ${locale === "ru" ? "лей" : "lei"}`;
