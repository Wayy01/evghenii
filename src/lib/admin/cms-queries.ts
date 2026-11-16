import "server-only";
import { asc, desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { locales, type Locale } from "@/i18n/config";
import { getSiteDefaults } from "@/i18n/dictionaries";
import { flattenTexts, readConfig, type ConfigKey, type ConfigValue } from "@/lib/site-config";

/** One editable string of the public site, with its built-in text and the current edit (if any). */
export type TextEntry = {
  key: string;
  defaults: Record<Locale, string>;
  /** null when the built-in text is in use. */
  values: Record<Locale, string | null>;
};

/** Every string of the public site, in dictionary order. Uncached: the admin always sees live data. */
export async function getTextEntries(): Promise<TextEntry[]> {
  const [ro, ru, rows] = await Promise.all([
    getSiteDefaults("ro"),
    getSiteDefaults("ru"),
    db.select().from(schema.siteTexts),
  ]);
  const flat = { ro: flattenTexts(ro), ru: flattenTexts(ru) };
  const edits = new Map(rows.map((r) => [`${r.locale}:${r.key}`, r.value]));
  return Object.keys(flat.ro).map((key) => ({
    key,
    defaults: { ro: flat.ro[key], ru: flat.ru[key] ?? flat.ro[key] },
    values: Object.fromEntries(locales.map((l) => [l, edits.get(`${l}:${key}`) ?? null])) as Record<Locale, string | null>,
  }));
}

/** A settings document straight from the database, validated, with defaults for anything unset. */
export async function getConfigForAdmin<K extends ConfigKey>(key: K): Promise<ConfigValue<K>> {
  const rows = await db.select().from(schema.siteConfig);
  return readConfig(key, rows.find((r) => r.key === key)?.value);
}

/** What the media pickers offer: every video and photo, in the order the site shows them. */
export type MediaOption = {
  id: number;
  kind: "video" | "photo";
  src: string;
  poster: string | null;
  caption: string;
  published: boolean;
};

export async function getMediaOptions(locale: Locale): Promise<MediaOption[]> {
  const rows = await db
    .select()
    .from(schema.media)
    .orderBy(asc(schema.media.sortOrder), desc(schema.media.takenAt));
  return rows.map((m) => ({
    id: m.id,
    kind: m.kind,
    src: m.src,
    poster: m.poster,
    caption: (locale === "ru" ? m.captionRu : m.captionRo) || m.captionRo,
    published: m.published,
  }));
}
