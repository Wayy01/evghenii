import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { BookingStatus } from "@/db/schema";
import { addDaysKey, startOfWeekKey, toDateKey, zoned, TZ } from "@/lib/time";

const { bookings, clients, services, media, posts, workingHours, timeOff } = schema;

const DAY = 86_400_000;

function monthKeys(todayKey: string) {
  const [y, m] = todayKey.split("-").map(Number);
  const key = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, "0")}-01`;
  return {
    current: key(y, m),
    next: m === 12 ? key(y + 1, 1) : key(y, m + 1),
    prev: m === 1 ? key(y - 1, 12) : key(y, m - 1),
  };
}

/** Booking row joined with what the admin UI shows next to it. */
const bookingWithRefs = {
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

export type AdminBooking = {
  id: number;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  price: number;
  comment: string;
  source: "online" | "manual";
  createdAt: Date;
  clientId: number;
  clientName: string;
  clientPhone: string;
  serviceId: number;
  serviceRo: string;
  serviceRu: string;
};

function bookingsQuery() {
  return db
    .select(bookingWithRefs)
    .from(bookings)
    .innerJoin(clients, eq(clients.id, bookings.clientId))
    .innerJoin(services, eq(services.id, bookings.serviceId));
}

export async function getOverview(now: Date) {
  const todayKey = toDateKey(now);
  const months = monthKeys(todayKey);
  const monthStart = zoned(months.current);
  const nextMonthStart = zoned(months.next);
  const prevMonthStart = zoned(months.prev);
  // Compare month-to-date against the same stretch of last month.
  const prevCompareEnd = new Date(
    Math.min(prevMonthStart.getTime() + (now.getTime() - monthStart.getTime()), monthStart.getTime()),
  );
  const last30 = new Date(now.getTime() - 30 * DAY);
  const todayStart = zoned(todayKey);
  const tomorrowStart = zoned(addDaysKey(todayKey, 1));
  const weeksFromKey = addDaysKey(startOfWeekKey(todayKey), -7 * 11);

  const revenueBetween = (from: Date, to: Date) =>
    db
      .select({
        total: sql<number>`coalesce(sum(${bookings.price}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(bookings)
      .where(
        and(eq(bookings.status, "completed"), gte(bookings.startsAt, from), lt(bookings.startsAt, to)),
      );

  const [
    [mtd],
    [prev],
    [monthBookings],
    [newClients],
    [noShow],
    weekly,
    today,
    upcoming,
    topServices,
  ] = await Promise.all([
    revenueBetween(monthStart, now),
    revenueBetween(prevMonthStart, prevCompareEnd),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          inArray(bookings.status, ["confirmed", "completed", "no_show"]),
          gte(bookings.startsAt, monthStart),
          lt(bookings.startsAt, nextMonthStart),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(clients)
      .where(gte(clients.createdAt, monthStart)),
    db
      .select({
        noShows: sql<number>`count(*) filter (where ${bookings.status} = 'no_show')::int`,
        attended: sql<number>`count(*) filter (where ${bookings.status} in ('completed', 'no_show'))::int`,
      })
      .from(bookings)
      .where(and(gte(bookings.startsAt, last30), lt(bookings.startsAt, now))),
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${bookings.startsAt} at time zone ${TZ}), 'YYYY-MM-DD')`,
        total: sql<number>`sum(${bookings.price})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(bookings)
      .where(and(eq(bookings.status, "completed"), gte(bookings.startsAt, zoned(weeksFromKey))))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    bookingsQuery()
      .where(and(gte(bookings.startsAt, todayStart), lt(bookings.startsAt, tomorrowStart)))
      .orderBy(asc(bookings.startsAt)),
    bookingsQuery()
      .where(and(eq(bookings.status, "confirmed"), gte(bookings.startsAt, tomorrowStart)))
      .orderBy(asc(bookings.startsAt))
      .limit(6),
    db
      .select({
        id: services.id,
        nameRo: services.nameRo,
        nameRu: services.nameRu,
        count: sql<number>`count(*)::int`,
        total: sql<number>`sum(${bookings.price})::int`,
      })
      .from(bookings)
      .innerJoin(services, eq(services.id, bookings.serviceId))
      .where(and(eq(bookings.status, "completed"), gte(bookings.startsAt, last30)))
      .groupBy(services.id)
      .orderBy(desc(sql`sum(${bookings.price})`)),
  ]);

  const weeklyByKey = new Map(weekly.map((w) => [w.week, w]));
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const key = addDaysKey(weeksFromKey, i * 7);
    const row = weeklyByKey.get(key);
    return { week: key, total: row?.total ?? 0, count: row?.count ?? 0, current: i === 11 };
  });

  return {
    todayKey,
    revenue: { total: mtd.total, count: mtd.count, prevTotal: prev.total },
    bookingsThisMonth: monthBookings.count,
    newClients: newClients.count,
    avgTicket: mtd.count ? Math.round(mtd.total / mtd.count) : 0,
    noShowRate: noShow.attended ? noShow.noShows / noShow.attended : 0,
    weeks,
    today: today as AdminBooking[],
    upcoming: upcoming as AdminBooking[],
    topServices,
  };
}

export async function getCalendarData(fromKey: string, days: number) {
  const from = zoned(fromKey);
  const to = zoned(addDaysKey(fromKey, days));
  const [rows, off, hours, activeServices] = await Promise.all([
    bookingsQuery()
      .where(and(lt(bookings.startsAt, to), gte(bookings.endsAt, from)))
      .orderBy(asc(bookings.startsAt)),
    db
      .select()
      .from(timeOff)
      .where(and(lt(timeOff.startsAt, to), gte(timeOff.endsAt, from)))
      .orderBy(asc(timeOff.startsAt)),
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
      .orderBy(asc(services.sortOrder)),
  ]);
  return { bookings: rows as AdminBooking[], timeOff: off, hours, services: activeServices };
}

export async function getClientsList(query: string) {
  const q = query.trim();
  const digits = q.replace(/\D/g, "");
  const filter = q
    ? or(ilike(clients.name, `%${q}%`), digits.length >= 3 ? ilike(clients.phone, `%${digits}%`) : undefined)
    : undefined;

  return db
    .select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      createdAt: clients.createdAt,
      visits: sql<number>`count(${bookings.id}) filter (where ${bookings.status} = 'completed')::int`,
      spent: sql<number>`coalesce(sum(${bookings.price}) filter (where ${bookings.status} = 'completed'), 0)::int`,
      noShows: sql<number>`count(${bookings.id}) filter (where ${bookings.status} = 'no_show')::int`,
      lastVisit: sql<Date | null>`max(${bookings.startsAt}) filter (where ${bookings.status} = 'completed')`.mapWith(
        (v) => (v ? new Date(v) : null),
      ),
      nextVisit: sql<Date | null>`min(${bookings.startsAt}) filter (where ${bookings.status} = 'confirmed' and ${bookings.startsAt} > now())`.mapWith(
        (v) => (v ? new Date(v) : null),
      ),
    })
    .from(clients)
    .leftJoin(bookings, eq(bookings.clientId, clients.id))
    .where(filter)
    .groupBy(clients.id)
    .orderBy(sql`max(${bookings.startsAt}) filter (where ${bookings.status} = 'completed') desc nulls last`, asc(clients.name))
    .limit(300);
}

export async function getClientDetail(id: number) {
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client) return null;
  const history = (await bookingsQuery()
    .where(eq(bookings.clientId, id))
    .orderBy(desc(bookings.startsAt))) as AdminBooking[];
  const now = Date.now();
  const next = history
    .filter((b) => b.status === "confirmed" && b.startsAt.getTime() > now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
  return { client, history, next };
}

export async function searchClients(query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  const digits = q.replace(/\D/g, "");
  return db
    .select({ id: clients.id, name: clients.name, phone: clients.phone })
    .from(clients)
    .where(or(ilike(clients.name, `%${q}%`), digits.length >= 3 ? ilike(clients.phone, `%${digits}%`) : undefined))
    .orderBy(asc(clients.name))
    .limit(8);
}

export const getAllServices = () =>
  db.select().from(services).orderBy(asc(services.sortOrder), asc(services.id));

// Same order as the public site: his arrangement first, newest first among equals.
export const getAllMedia = () => db.select().from(media).orderBy(asc(media.sortOrder), desc(media.takenAt));

export const getAllPosts = () =>
  db
    .select({
      id: posts.id,
      slug: posts.slug,
      titleRo: posts.titleRo,
      titleRu: posts.titleRu,
      cover: posts.cover,
      published: posts.published,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .orderBy(desc(sql`coalesce(${posts.publishedAt}, ${posts.createdAt})`));

export async function getPost(id: number) {
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return row ?? null;
}

export async function getSettings(now: Date) {
  const [hours, upcomingOff] = await Promise.all([
    db.select().from(workingHours).orderBy(asc(workingHours.weekday)),
    db
      .select()
      .from(timeOff)
      .where(gte(timeOff.endsAt, new Date(now.getTime() - 30 * DAY)))
      .orderBy(asc(timeOff.startsAt)),
  ]);
  return { hours, timeOff: upcomingOff };
}
