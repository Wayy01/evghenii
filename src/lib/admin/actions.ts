"use server";
import { randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { hasLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/auth";
import { getAvailability, LEAD_TIME_MIN } from "@/lib/availability";
import { contentTags } from "@/lib/content";
import { zoned } from "@/lib/time";
import { normalizePhone } from "@/lib/phone";
import { searchClients } from "./queries";
import { UPLOAD_ROOT } from "./uploads";

const { bookings, clients, services, media, posts, workingHours, timeOff } = schema;

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

/** Postgres error code, whether drizzle wrapped the driver error or not. */
function pgCode(error: unknown): string | undefined {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}
const EXCLUSION_VIOLATION = "23P01";
const UNIQUE_VIOLATION = "23505";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeKey = z.string().regex(/^\d{2}:\d{2}$/);
const id = z.coerce.number().int().positive();

// ---------------------------------------------------------------- bookings

const statusSchema = z.enum(["confirmed", "completed", "cancelled", "no_show"]);

export async function setBookingStatus(bookingId: number, status: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z.object({ id, status: statusSchema }).safeParse({ id: bookingId, status });
  if (!parsed.success) return fail("invalid");
  try {
    await db.update(bookings).set({ status: parsed.data.status }).where(eq(bookings.id, parsed.data.id));
  } catch (error) {
    if (pgCode(error) === EXCLUSION_VIOLATION) return fail("conflict");
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function setBookingPrice(bookingId: number, price: number): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({ id, price: z.coerce.number().int().min(0).max(100_000) })
    .safeParse({ id: bookingId, price });
  if (!parsed.success) return fail("invalid");
  await db.update(bookings).set({ price: parsed.data.price }).where(eq(bookings.id, parsed.data.id));
  refresh();
  return { ok: true };
}

const newBookingSchema = z.object({
  serviceId: id,
  date: dateKey,
  time: timeKey,
  clientId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  comment: z.string().trim().max(1000).default(""),
  locale: z.string().default("ro"),
});

export async function createManualBooking(input: z.input<typeof newBookingSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = newBookingSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const data = parsed.data;

  const [service] = await db.select().from(services).where(eq(services.id, data.serviceId)).limit(1);
  if (!service) return fail("invalid");

  let clientId = data.clientId;
  if (!clientId) {
    const phone = normalizePhone(data.phone ?? "");
    if (!phone) return fail("invalidPhone");
    if (!data.name) return fail("invalid");
    const [row] = await db
      .insert(clients)
      .values({ name: data.name, phone })
      .onConflictDoUpdate({ target: clients.phone, set: { phone: sql`excluded.phone` } })
      .returning({ id: clients.id });
    clientId = row.id;
  }

  const startsAt = zoned(data.date, data.time);
  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);
  try {
    const [row] = await db
      .insert(bookings)
      .values({
        clientId,
        serviceId: service.id,
        startsAt,
        endsAt,
        price: service.price,
        comment: data.comment,
        source: "manual",
        status: "confirmed",
        locale: hasLocale(data.locale) ? data.locale : "ro",
        manageToken: randomBytes(16).toString("base64url"),
      })
      .returning({ id: bookings.id });
    refresh();
    return { ok: true, id: row.id };
  } catch (error) {
    if (pgCode(error) === EXCLUSION_VIOLATION) return fail("conflict");
    throw error;
  }
}

export async function findClients(query: string) {
  await requireAdmin();
  return searchClients(String(query).slice(0, 80));
}

// ----------------------------------------------------------------- clients

const clientSchema = z.object({
  id,
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(40),
  notes: z.string().max(4000).default(""),
});

export async function updateClient(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("invalid");
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return fail("invalidPhone");
  try {
    await db
      .update(clients)
      .set({ name: parsed.data.name, phone, notes: parsed.data.notes })
      .where(eq(clients.id, parsed.data.id));
  } catch (error) {
    if (pgCode(error) === UNIQUE_VIOLATION) return fail("phoneTaken");
    throw error;
  }
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- services

const serviceSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum(["hair", "beard", "color"]),
  nameRo: z.string().trim().min(1).max(120),
  nameRu: z.string().trim().min(1).max(120),
  descriptionRo: z.string().trim().max(600).default(""),
  descriptionRu: z.string().trim().max(600).default(""),
  price: z.coerce.number().int().min(0).max(100_000),
  durationMin: z.coerce.number().int().min(5).max(480),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export async function saveService(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const raw = Object.fromEntries(formData);
  const parsed = serviceSchema.safeParse({ ...raw, id: raw.id || undefined, active: raw.active ?? "false" });
  if (!parsed.success) return fail("invalid");
  const { id: serviceId, ...values } = parsed.data;
  try {
    if (serviceId) {
      await db.update(services).set(values).where(eq(services.id, serviceId));
    } else {
      await db.insert(services).values(values);
    }
  } catch (error) {
    if (pgCode(error) === UNIQUE_VIOLATION) return fail("slugTaken");
    throw error;
  }
  updateTag(contentTags.services);
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------- media

const mediaPatchSchema = z.object({
  captionRo: z.string().trim().max(300).optional(),
  captionRu: z.string().trim().max(300).optional(),
  instagramUrl: z.union([z.literal(""), z.url().max(500)]).optional(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export async function updateMedia(
  mediaId: number,
  patch: z.input<typeof mediaPatchSchema>,
): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = id.safeParse(mediaId);
  const parsed = mediaPatchSchema.safeParse(patch);
  if (!parsedId.success || !parsed.success) return fail("invalid");
  const { instagramUrl, ...rest } = parsed.data;
  await db
    .update(media)
    .set({ ...rest, ...(instagramUrl !== undefined ? { instagramUrl: instagramUrl || null } : {}) })
    .where(eq(media.id, parsedId.data));
  updateTag(contentTags.media);
  updateTag(contentTags.posts);
  refresh();
  return { ok: true };
}

const uploadedPath = z.string().regex(/^\/files\/[\w./-]+$/);

const newMediaSchema = z.object({
  src: uploadedPath,
  poster: uploadedPath.nullable(),
  width: z.number().int().min(1).max(8000),
  height: z.number().int().min(1).max(8000),
  durationS: z.number().int().min(0).max(36_000).nullable(),
  captionRo: z.string().trim().max(300).default(""),
  captionRu: z.string().trim().max(300).default(""),
});

export async function createMedia(input: z.input<typeof newMediaSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = newMediaSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const [row] = await db
    .insert(media)
    .values({ ...parsed.data, kind: "video", published: true, featured: false })
    .returning({ id: media.id });
  updateTag(contentTags.media);
  refresh();
  return { ok: true, id: row.id };
}

async function removeUploaded(publicPath: string | null) {
  if (!publicPath?.startsWith("/files/")) return;
  const target = path.resolve(UPLOAD_ROOT, publicPath.slice("/files/".length));
  if (!target.startsWith(UPLOAD_ROOT + path.sep)) return;
  await unlink(target).catch(() => {});
}

export async function deleteMedia(mediaId: number): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = id.safeParse(mediaId);
  if (!parsedId.success) return fail("invalid");
  const [row] = await db.delete(media).where(eq(media.id, parsedId.data)).returning();
  if (row) {
    await removeUploaded(row.src);
    await removeUploaded(row.poster);
  }
  updateTag(contentTags.media);
  updateTag(contentTags.posts);
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------- posts

const postSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  locale: z.string().default("ro"),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  titleRo: z.string().trim().min(1).max(200),
  titleRu: z.string().trim().min(1).max(200),
  excerptRo: z.string().trim().max(400).default(""),
  excerptRu: z.string().trim().max(400).default(""),
  bodyRo: z.string().max(40_000).default(""),
  bodyRu: z.string().max(40_000).default(""),
  cover: z.string().trim().max(500).default(""),
  videoId: z.coerce.number().int().positive().optional(),
  published: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  publishedDate: z.union([z.literal(""), dateKey]).default(""),
  publishedTime: z.union([z.literal(""), timeKey]).default(""),
});

export async function savePost(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const raw = Object.fromEntries(formData);
  const parsed = postSchema.safeParse({
    ...raw,
    id: raw.id || undefined,
    videoId: raw.videoId || undefined,
    published: raw.published ?? "false",
  });
  if (!parsed.success) return fail("invalid");
  const { id: postId, locale, publishedDate, publishedTime, cover, videoId, ...fields } = parsed.data;

  const publishedAt = publishedDate
    ? zoned(publishedDate, publishedTime || "09:00")
    : fields.published
      ? new Date()
      : null;
  const values = { ...fields, cover: cover || null, videoId: videoId ?? null, publishedAt, updatedAt: new Date() };

  let savedId = postId;
  try {
    if (postId) {
      await db.update(posts).set(values).where(eq(posts.id, postId));
    } else {
      const [row] = await db.insert(posts).values(values).returning({ id: posts.id });
      savedId = row.id;
    }
  } catch (error) {
    if (pgCode(error) === UNIQUE_VIOLATION) return fail("slugTaken");
    throw error;
  }
  updateTag(contentTags.posts);
  if (!postId) redirect(`/${hasLocale(locale) ? locale : "ro"}/admin/content/posts/${savedId}`);
  refresh();
  return { ok: true, id: savedId };
}

export async function deletePost(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id, locale: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await db.delete(posts).where(eq(posts.id, parsed.data.id));
  updateTag(contentTags.posts);
  redirect(`/${hasLocale(parsed.data.locale) ? parsed.data.locale : "ro"}/admin/content?tab=posts`);
}

// ---------------------------------------------------------------- settings

export async function saveWorkingHours(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const rows: { weekday: number; isOpen: boolean; openTime: string; closeTime: string }[] = [];
  for (let weekday = 1; weekday <= 7; weekday++) {
    const parsed = z
      .object({ isOpen: z.boolean(), openTime: timeKey, closeTime: timeKey })
      .safeParse({
        isOpen: formData.get(`open-${weekday}`) === "on",
        openTime: formData.get(`from-${weekday}`),
        closeTime: formData.get(`to-${weekday}`),
      });
    if (!parsed.success) return fail("invalid");
    if (parsed.data.isOpen && parsed.data.closeTime <= parsed.data.openTime) return fail("invalidHours");
    rows.push({ weekday, ...parsed.data });
  }
  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(workingHours)
        .values(row)
        .onConflictDoUpdate({
          target: workingHours.weekday,
          set: { isOpen: row.isOpen, openTime: row.openTime, closeTime: row.closeTime },
        });
    }
  });
  updateTag(contentTags.hours);
  refresh();
  return { ok: true };
}

const timeOffSchema = z.object({
  startDate: dateKey,
  startTime: timeKey,
  endDate: dateKey,
  endTime: timeKey,
  reason: z.string().trim().max(200).default(""),
});

export async function addTimeOff(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = timeOffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("invalid");
  const startsAt = zoned(parsed.data.startDate, parsed.data.startTime);
  const endsAt = zoned(parsed.data.endDate, parsed.data.endTime);
  if (endsAt <= startsAt) return fail("invalidRange");
  await db.insert(timeOff).values({ startsAt, endsAt, reason: parsed.data.reason });
  refresh();
  return { ok: true };
}

export async function deleteTimeOff(timeOffId: number): Promise<ActionResult> {
  await requireAdmin();
  const parsedId = id.safeParse(timeOffId);
  if (!parsedId.success) return fail("invalid");
  await db.delete(timeOff).where(eq(timeOff.id, parsedId.data));
  refresh();
  return { ok: true };
}

/** Free start times for a manual booking. Unlike online booking, earlier slots of the same day stay open (walk-ins). */
export async function getSlotsForAdmin(serviceId: number, date: string) {
  await requireAdmin();
  const parsed = z.object({ serviceId: id, date: dateKey }).safeParse({ serviceId, date });
  if (!parsed.success) return null;
  const [service] = await db
    .select({ durationMin: services.durationMin })
    .from(services)
    .where(eq(services.id, parsed.data.serviceId))
    .limit(1);
  if (!service) return null;
  const [day] = await getAvailability({
    durationMin: service.durationMin,
    from: parsed.data.date,
    days: 1,
    now: zoned(parsed.data.date).getTime() - LEAD_TIME_MIN * 60_000,
  });
  return day;
}
