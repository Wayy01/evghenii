"use server";
// Mutations behind the admin calendar. They return the updated booking so the
// calendar can reconcile its own optimistic state; the calendar does not need a
// router refresh, and the other admin pages are rendered per request anyway.
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { CalActionResult } from "@/components/admin/calendar/types";
import { hasLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { zoned } from "@/lib/time";
import { getCalendarBooking } from "./calendar";

const { bookings, clients, services } = schema;

const id = z.coerce.number().int().positive();
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeKey = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const duration = z.coerce.number().int().min(5).max(12 * 60);

const pgCode = (error: unknown) => {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
};

async function finish(bookingId: number): Promise<CalActionResult> {
  const booking = await getCalendarBooking(bookingId);
  return booking ? { ok: true, booking } : { ok: false, error: "notFound" };
}

/** Runs an update and maps the no-double-booking constraint to a friendly error. */
async function guarded(bookingId: number, run: () => Promise<unknown>): Promise<CalActionResult> {
  try {
    await run();
  } catch (error) {
    if (pgCode(error) === "23P01") return { ok: false, error: "conflict" };
    throw error;
  }
  return finish(bookingId);
}

const timeInput = z.object({ id, date: dateKey, time: timeKey, durationMin: duration.optional() });

/** Moves a booking to a new salon date/time; keeps its length unless a new one is given. */
export async function moveBooking(input: z.input<typeof timeInput>): Promise<CalActionResult> {
  await requireAdmin();
  const parsed = timeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id: bookingId, date, time, durationMin } = parsed.data;

  const [current] = await db
    .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!current) return { ok: false, error: "notFound" };

  const length = durationMin ?? Math.round((current.endsAt.getTime() - current.startsAt.getTime()) / 60_000);
  const startsAt = zoned(date, time);
  const endsAt = new Date(startsAt.getTime() + length * 60_000);
  return guarded(bookingId, () => db.update(bookings).set({ startsAt, endsAt }).where(eq(bookings.id, bookingId)));
}

/** Changes only the length (dragging the bottom edge). */
export async function resizeBooking(input: { id: number; durationMin: number }): Promise<CalActionResult> {
  await requireAdmin();
  const parsed = z.object({ id, durationMin: duration }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id: bookingId, durationMin } = parsed.data;
  return guarded(bookingId, () =>
    db
      .update(bookings)
      .set({ endsAt: sql`${bookings.startsAt} + make_interval(mins => ${durationMin})` })
      .where(eq(bookings.id, bookingId)),
  );
}

export async function setCalendarStatus(input: { id: number; status: string }): Promise<CalActionResult> {
  await requireAdmin();
  const parsed = z
    .object({ id, status: z.enum(["confirmed", "completed", "cancelled", "no_show"]) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id: bookingId, status } = parsed.data;
  // Restoring a cancelled booking re-enters the no-overlap constraint and can conflict.
  return guarded(bookingId, () => db.update(bookings).set({ status }).where(eq(bookings.id, bookingId)));
}

export async function updateBookingDetails(input: {
  id: number;
  price?: number;
  comment?: string;
}): Promise<CalActionResult> {
  await requireAdmin();
  const parsed = z
    .object({
      id,
      price: z.coerce.number().int().min(0).max(100_000).optional(),
      comment: z.string().trim().max(1000).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id: bookingId, ...changes } = parsed.data;
  if (changes.price === undefined && changes.comment === undefined) return finish(bookingId);
  await db.update(bookings).set(changes).where(eq(bookings.id, bookingId));
  return finish(bookingId);
}

const createInput = z.object({
  serviceId: id,
  date: dateKey,
  time: timeKey,
  durationMin: duration.optional(),
  price: z.coerce.number().int().min(0).max(100_000).optional(),
  clientId: id.optional(),
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  comment: z.string().trim().max(1000).default(""),
  locale: z.string().default("ro"),
});

export type CreateCalendarError = "conflict" | "invalid" | "invalidPhone" | "invalidName";

export async function createCalendarBooking(
  input: z.input<typeof createInput>,
): Promise<CalActionResult | { ok: false; error: "invalidPhone" | "invalidName" }> {
  await requireAdmin();
  const parsed = createInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const [service] = await db.select().from(services).where(eq(services.id, data.serviceId)).limit(1);
  if (!service) return { ok: false, error: "invalid" };

  let clientId = data.clientId;
  if (!clientId) {
    if (!data.name || data.name.length < 2) return { ok: false, error: "invalidName" };
    const phone = normalizePhone(data.phone ?? "");
    if (!phone) return { ok: false, error: "invalidPhone" };
    // A phone already on file means a returning client; keep their stored name.
    const [row] = await db
      .insert(clients)
      .values({ name: data.name, phone })
      .onConflictDoUpdate({ target: clients.phone, set: { phone: sql`excluded.phone` } })
      .returning({ id: clients.id });
    clientId = row.id;
  }

  const startsAt = zoned(data.date, data.time);
  const endsAt = new Date(startsAt.getTime() + (data.durationMin ?? service.durationMin) * 60_000);
  try {
    const [row] = await db
      .insert(bookings)
      .values({
        clientId,
        serviceId: service.id,
        startsAt,
        endsAt,
        price: data.price ?? service.price,
        comment: data.comment,
        source: "manual",
        status: "confirmed",
        locale: hasLocale(data.locale) ? data.locale : "ro",
        manageToken: randomBytes(16).toString("base64url"),
      })
      .returning({ id: bookings.id });
    return finish(row.id);
  } catch (error) {
    if (pgCode(error) === "23P01") return { ok: false, error: "conflict" };
    throw error;
  }
}
