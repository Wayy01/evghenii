"use server";
import { refresh, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { ActionResult } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { contentTags } from "@/lib/content";
import { zoned } from "@/lib/time";

// Media mutations the shared admin actions do not cover: photos, and the date a piece is filed under.

const uploadedPath = z.string().regex(/^\/files\/[\w./-]+$/);

const photoSchema = z.object({
  src: uploadedPath,
  width: z.number().int().min(1).max(12000),
  height: z.number().int().min(1).max(12000),
});

export async function createPhoto(input: z.input<typeof photoSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = photoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const [row] = await db
    .insert(schema.media)
    .values({ ...parsed.data, kind: "photo", published: true, featured: false })
    .returning({ id: schema.media.id });
  updateTag(contentTags.media);
  refresh();
  return { ok: true, id: row.id };
}

const dateSchema = z.object({
  id: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** The public gallery is ordered by this date, newest first. */
export async function setMediaDate(mediaId: number, date: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = dateSchema.safeParse({ id: mediaId, date });
  if (!parsed.success) return { ok: false, error: "invalid" };
  await db
    .update(schema.media)
    .set({ takenAt: zoned(parsed.data.date, "12:00") })
    .where(eq(schema.media.id, parsed.data.id));
  updateTag(contentTags.media);
  refresh();
  return { ok: true };
}
