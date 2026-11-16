"use server";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { hasLocale } from "@/i18n/config";
import { BOOKING_WINDOW_DAYS, CANCEL_CUTOFF_MS, isSlotFree } from "./availability";
import { normalizePhone } from "@/lib/phone";
import { addDaysKey, toDateKey, zoned } from "./time";

export type CreateBookingResult =
  | { ok: true; token: string }
  | { ok: false; error: "name" | "phone" | "slotTaken" | "generic" };

const input = z.object({
  locale: z.string(),
  service: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim(),
  phone: z.string(),
  comment: z.string().trim().max(500).default(""),
  // Bots fill every field; people never see this one.
  website: z.string().max(0).optional(),
});

const isOverlap = (e: unknown) =>
  typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "23P01";

export async function createBooking(raw: z.input<typeof input>): Promise<CreateBookingResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "generic" };
  const data = parsed.data;
  const locale = hasLocale(data.locale) ? data.locale : "ro";

  if (data.name.length < 2 || data.name.length > 80) return { ok: false, error: "name" };
  const phone = normalizePhone(data.phone);
  if (!phone) return { ok: false, error: "phone" };

  const today = toDateKey(new Date());
  if (data.date < today || data.date > addDaysKey(today, BOOKING_WINDOW_DAYS)) {
    return { ok: false, error: "slotTaken" };
  }

  const [service] = await db
    .select()
    .from(schema.services)
    .where(and(eq(schema.services.slug, data.service), eq(schema.services.active, true)))
    .limit(1);
  if (!service) return { ok: false, error: "generic" };

  if (!(await isSlotFree(data.date, data.time, service.durationMin))) {
    return { ok: false, error: "slotTaken" };
  }

  const startsAt = zoned(data.date, data.time);
  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);
  const token = randomBytes(16).toString("base64url");

  try {
    await db.transaction(async (tx) => {
      const [client] = await tx
        .insert(schema.clients)
        .values({ name: data.name, phone })
        .onConflictDoUpdate({ target: schema.clients.phone, set: { name: data.name } })
        .returning({ id: schema.clients.id });

      await tx.insert(schema.bookings).values({
        clientId: client.id,
        serviceId: service.id,
        startsAt,
        endsAt,
        price: service.price,
        comment: data.comment,
        source: "online",
        locale,
        manageToken: token,
      });
    });
  } catch (e) {
    // Two people raced for the same slot; the exclusion constraint let only one through.
    if (isOverlap(e)) return { ok: false, error: "slotTaken" };
    console.error("createBooking failed", e);
    return { ok: false, error: "generic" };
  }

  return { ok: true, token };
}

export async function cancelBooking(token: string): Promise<{ ok: boolean; reason?: "tooLate" | "notFound" }> {
  const [booking] = await db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.manageToken, token))
    .limit(1);
  if (!booking || booking.status !== "confirmed") return { ok: false, reason: "notFound" };
  if (booking.startsAt.getTime() - Date.now() < CANCEL_CUTOFF_MS) return { ok: false, reason: "tooLate" };

  await db
    .update(schema.bookings)
    .set({ status: "cancelled" })
    .where(eq(schema.bookings.id, booking.id));
  return { ok: true };
}
