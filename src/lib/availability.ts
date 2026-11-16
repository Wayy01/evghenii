import "server-only";
import { and, gt, inArray, lt, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { addDaysKey, fromMinutes, isoWeekday, toMinutes, zoned } from "./time";

export const SLOT_STEP_MIN = 30;
/** Online bookings must start at least this far in the future. */
export const LEAD_TIME_MIN = 60;
export const BOOKING_WINDOW_DAYS = 28;
/** Clients can cancel online until this long before the appointment. */
export const CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000;

export type DayAvailability = { date: string; open: boolean; slots: string[] };

type Range = { start: number; end: number };

async function loadBusy(from: Date, to: Date, excludeBookingId?: number): Promise<Range[]> {
  const bookingFilters = [
    inArray(schema.bookings.status, ["confirmed", "completed"]),
    lt(schema.bookings.startsAt, to),
    gt(schema.bookings.endsAt, from),
  ];
  if (excludeBookingId) bookingFilters.push(ne(schema.bookings.id, excludeBookingId));

  const [busyBookings, off] = await Promise.all([
    db
      .select({ s: schema.bookings.startsAt, e: schema.bookings.endsAt })
      .from(schema.bookings)
      .where(and(...bookingFilters)),
    db
      .select({ s: schema.timeOff.startsAt, e: schema.timeOff.endsAt })
      .from(schema.timeOff)
      .where(and(lt(schema.timeOff.startsAt, to), gt(schema.timeOff.endsAt, from))),
  ]);
  return [...busyBookings, ...off].map((r) => ({ start: r.s.getTime(), end: r.e.getTime() }));
}

/** Free start times per salon-local day, for a service of `durationMin`. */
export async function getAvailability(opts: {
  durationMin: number;
  from: string;
  days: number;
  excludeBookingId?: number;
  now?: number;
}): Promise<DayAvailability[]> {
  const { durationMin, from, days } = opts;
  const now = opts.now ?? Date.now();
  const rangeStart = zoned(from);
  const rangeEnd = zoned(addDaysKey(from, days));

  const [hours, busy] = await Promise.all([
    db.select().from(schema.workingHours),
    loadBusy(rangeStart, rangeEnd, opts.excludeBookingId),
  ]);
  const hoursByDay = new Map(hours.map((h) => [h.weekday, h]));
  const earliest = now + LEAD_TIME_MIN * 60_000;

  const result: DayAvailability[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysKey(from, i);
    const wh = hoursByDay.get(isoWeekday(date));
    if (!wh?.isOpen) {
      result.push({ date, open: false, slots: [] });
      continue;
    }
    const slots: string[] = [];
    const close = toMinutes(wh.closeTime);
    for (let m = toMinutes(wh.openTime); m + durationMin <= close; m += SLOT_STEP_MIN) {
      const start = zoned(date, fromMinutes(m)).getTime();
      const end = start + durationMin * 60_000;
      if (start < earliest) continue;
      if (busy.some((b) => b.start < end && b.end > start)) continue;
      slots.push(fromMinutes(m));
    }
    result.push({ date, open: true, slots });
  }
  return result;
}

/** Re-checks one requested slot right before it is written. */
export async function isSlotFree(
  date: string,
  time: string,
  durationMin: number,
  excludeBookingId?: number,
): Promise<boolean> {
  const [day] = await getAvailability({ durationMin, from: date, days: 1, excludeBookingId });
  return day.slots.includes(time);
}
