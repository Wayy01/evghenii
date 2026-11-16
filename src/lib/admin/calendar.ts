import "server-only";
import { and, asc, eq, gt, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CalBooking, CalHours, CalRangeData, CalService } from "@/components/admin/calendar/types";
import { addDaysKey, zoned } from "@/lib/time";

const { bookings, clients, services, workingHours, timeOff } = schema;

const bookingColumns = {
  id: bookings.id,
  startsAt: bookings.startsAt,
  endsAt: bookings.endsAt,
  status: bookings.status,
  price: bookings.price,
  comment: bookings.comment,
  source: bookings.source,
  createdAt: bookings.createdAt,
  clientId: clients.id,
  clientName: clients.name,
  clientPhone: clients.phone,
  serviceId: services.id,
  serviceRo: services.nameRo,
  serviceRu: services.nameRu,
};

type Row = {
  id: number;
  startsAt: Date;
  endsAt: Date;
  status: CalBooking["status"];
  price: number;
  comment: string;
  source: CalBooking["source"];
  createdAt: Date;
  clientId: number;
  clientName: string;
  clientPhone: string;
  serviceId: number;
  serviceRo: string;
  serviceRu: string;
};

const toCal = ({ startsAt, endsAt, createdAt, ...rest }: Row): CalBooking => ({
  ...rest,
  start: startsAt.getTime(),
  end: endsAt.getTime(),
  createdAt: createdAt.getTime(),
});

const bookingsWithRefs = () =>
  db
    .select(bookingColumns)
    .from(bookings)
    .innerJoin(clients, eq(clients.id, bookings.clientId))
    .innerJoin(services, eq(services.id, bookings.serviceId));

export async function getCalendarBooking(id: number): Promise<CalBooking | null> {
  const [row] = await bookingsWithRefs().where(eq(bookings.id, id)).limit(1);
  return row ? toCal(row as Row) : null;
}

/** Bookings and time off touching the salon days [from, from + days). */
export async function getCalendarRange(from: string, days: number): Promise<CalRangeData> {
  const start = zoned(from);
  const end = zoned(addDaysKey(from, days));
  const [rows, off] = await Promise.all([
    bookingsWithRefs()
      .where(and(lt(bookings.startsAt, end), gt(bookings.endsAt, start)))
      .orderBy(asc(bookings.startsAt)),
    db
      .select()
      .from(timeOff)
      .where(and(lt(timeOff.startsAt, end), gt(timeOff.endsAt, start)))
      .orderBy(asc(timeOff.startsAt)),
  ]);
  return {
    bookings: (rows as Row[]).map(toCal),
    timeOff: off.map((o) => ({ id: o.id, start: o.startsAt.getTime(), end: o.endsAt.getTime(), reason: o.reason })),
  };
}

/** Live bookings per salon day, for the mini month's markers. */
export async function getDayCounts(from: string, days: number): Promise<Record<string, number>> {
  const start = zoned(from);
  const end = zoned(addDaysKey(from, days));
  const day = sql<string>`to_char(${bookings.startsAt} at time zone 'Europe/Chisinau', 'YYYY-MM-DD')`;
  const rows = await db
    .select({ day, n: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        lt(bookings.startsAt, end),
        gt(bookings.endsAt, start),
        sql`${bookings.status} in ('confirmed', 'completed')`,
      ),
    )
    .groupBy(day);
  return Object.fromEntries(rows.map((r) => [r.day, r.n]));
}

export async function getCalendarStatics(): Promise<{ hours: CalHours[]; services: CalService[] }> {
  const [hours, active] = await Promise.all([
    db.select().from(workingHours).orderBy(asc(workingHours.weekday)),
    db
      .select({
        id: services.id,
        nameRo: services.nameRo,
        nameRu: services.nameRu,
        durationMin: services.durationMin,
        price: services.price,
      })
      .from(services)
      .where(eq(services.active, true))
      .orderBy(asc(services.sortOrder), asc(services.id)),
  ]);
  return { hours, services: active };
}
