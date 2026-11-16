"use server";
import { refresh, updateTag } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { locales } from "@/i18n/config";
import { getSiteDefaults } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { contentTags } from "@/lib/content";
import { configSchemas, flattenTexts, normalizeHome, type ConfigKey, type HomeConfig } from "@/lib/site-config";

export type CmsResult = { ok: true } | { ok: false; error: "invalid" | "failed" };

const textEdits = z
  .array(
    z.object({
      locale: z.enum(locales),
      key: z.string().min(1).max(200),
      // null (or the built-in text itself) puts the string back to its default.
      value: z.string().max(5000).nullable(),
    }),
  )
  .max(600);

/** Saves edits to the public site copy. Only strings that exist in the dictionary are accepted. */
export async function saveTexts(input: z.input<typeof textEdits>): Promise<CmsResult> {
  await requireAdmin();
  const parsed = textEdits.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const defaults = {
    ro: flattenTexts(await getSiteDefaults("ro")),
    ru: flattenTexts(await getSiteDefaults("ru")),
  };
  const edits = parsed.data.filter((e) => e.key in defaults[e.locale]);

  await db.transaction(async (tx) => {
    for (const edit of edits) {
      const value = edit.value?.trim() ?? "";
      const where = and(eq(schema.siteTexts.locale, edit.locale), eq(schema.siteTexts.key, edit.key));
      if (edit.value === null || value === "" || value === defaults[edit.locale][edit.key]) {
        await tx.delete(schema.siteTexts).where(where);
      } else {
        await tx
          .insert(schema.siteTexts)
          .values({ locale: edit.locale, key: edit.key, value })
          .onConflictDoUpdate({
            target: [schema.siteTexts.locale, schema.siteTexts.key],
            set: { value, updatedAt: new Date() },
          });
      }
    }
  });

  updateTag(contentTags.texts);
  refresh();
  return { ok: true };
}

/** Saves one settings document: "contact", "nav" or "home". */
export async function saveConfig(key: ConfigKey, value: unknown): Promise<CmsResult> {
  await requireAdmin();
  if (!(key in configSchemas)) return { ok: false, error: "invalid" };
  const parsed = configSchemas[key].safeParse(value);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = key === "home" ? normalizeHome(parsed.data as HomeConfig) : parsed.data;

  await db
    .insert(schema.siteConfig)
    .values({ key, value: data })
    .onConflictDoUpdate({ target: schema.siteConfig.key, set: { value: data, updatedAt: new Date() } });

  updateTag(contentTags.config);
  refresh();
  return { ok: true };
}

/** Stores the order of videos and photos as shown on the site: first id first. */
export async function reorderMedia(ids: number[]): Promise<CmsResult> {
  await requireAdmin();
  const parsed = z.array(z.number().int().positive()).min(1).max(2000).safeParse(ids);
  if (!parsed.success) return { ok: false, error: "invalid" };

  await db.transaction(async (tx) => {
    const known = await tx
      .select({ id: schema.media.id })
      .from(schema.media)
      .where(inArray(schema.media.id, parsed.data));
    const valid = new Set(known.map((m) => m.id));
    let position = 0;
    for (const id of parsed.data) {
      if (!valid.has(id)) continue;
      await tx.update(schema.media).set({ sortOrder: position++ }).where(eq(schema.media.id, id));
    }
  });

  updateTag(contentTags.media);
  refresh();
  return { ok: true };
}

/** Sets or clears the picture shown beside a service in the price list. */
export async function setServiceImage(serviceId: number, image: string | null): Promise<CmsResult> {
  await requireAdmin();
  const parsed = z
    .object({ serviceId: z.number().int().positive(), image: z.string().max(600).nullable() })
    .safeParse({ serviceId, image });
  if (!parsed.success) return { ok: false, error: "invalid" };

  await db.update(schema.services).set({ image: parsed.data.image }).where(eq(schema.services.id, serviceId));
  updateTag(contentTags.services);
  refresh();
  return { ok: true };
}
