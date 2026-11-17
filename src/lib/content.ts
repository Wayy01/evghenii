import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Locale } from "@/i18n/config";
import { readConfig, toSite, type ConfigKey, type ConfigValue } from "./site-config";

// Public content is cached and tagged; admin mutations call updateTag(<tag>)
// so edits show up on the next request.
export const contentTags = {
  services: "services",
  media: "media",
  posts: "posts",
  hours: "hours",
  texts: "texts",
  config: "config",
} as const;

// The database is reachable only from the running app, never from the build, so each
// loader waits for a real request before reading. Results stay cached across requests.

export async function getActiveServices() {
  await connection();
  return activeServices();
}

async function activeServices() {
  "use cache";
  cacheTag(contentTags.services);
  cacheLife("hours");
  return db
    .select()
    .from(schema.services)
    .where(eq(schema.services.active, true))
    .orderBy(asc(schema.services.sortOrder), asc(schema.services.id));
}

export async function getPublishedMedia() {
  await connection();
  return publishedMedia();
}

async function publishedMedia() {
  "use cache";
  cacheTag(contentTags.media);
  cacheLife("hours");
  return db
    .select()
    .from(schema.media)
    .where(eq(schema.media.published, true))
    .orderBy(asc(schema.media.sortOrder), desc(schema.media.takenAt));
}

export async function getPublishedPosts() {
  await connection();
  return publishedPosts();
}

async function publishedPosts() {
  "use cache";
  cacheTag(contentTags.posts);
  cacheLife("hours");
  return db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.published, true))
    .orderBy(desc(schema.posts.publishedAt));
}

export async function getPublishedPost(slug: string) {
  await connection();
  return publishedPost(slug);
}

async function publishedPost(slug: string) {
  "use cache";
  cacheTag(contentTags.posts, contentTags.media);
  cacheLife("hours");
  const [row] = await db
    .select({ post: schema.posts, video: schema.media })
    .from(schema.posts)
    .leftJoin(schema.media, eq(schema.media.id, schema.posts.videoId))
    .where(and(eq(schema.posts.slug, slug), eq(schema.posts.published, true)))
    .limit(1);
  return row ?? null;
}

export async function getWorkingHours() {
  await connection();
  return workingHours();
}

async function workingHours() {
  "use cache";
  cacheTag(contentTags.hours);
  cacheLife("hours");
  return db.select().from(schema.workingHours).orderBy(asc(schema.workingHours.weekday));
}

/** The owner's edits to the site copy for one locale, as `dictionary path -> text`. */
export async function getTextOverrides(locale: Locale): Promise<Record<string, string>> {
  await connection();
  return textOverrides(locale);
}

async function textOverrides(locale: Locale): Promise<Record<string, string>> {
  "use cache";
  cacheTag(contentTags.texts);
  cacheLife("hours");
  const rows = await db
    .select({ key: schema.siteTexts.key, value: schema.siteTexts.value })
    .from(schema.siteTexts)
    .where(eq(schema.siteTexts.locale, locale));
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** One settings document (contact, nav or home), validated, with defaults for anything unset. */
export async function getSiteConfig<K extends ConfigKey>(key: K): Promise<ConfigValue<K>> {
  await connection();
  return siteConfig(key);
}

async function siteConfig<K extends ConfigKey>(key: K): Promise<ConfigValue<K>> {
  "use cache";
  cacheTag(contentTags.config);
  cacheLife("hours");
  const [row] = await db.select().from(schema.siteConfig).where(eq(schema.siteConfig.key, key)).limit(1);
  return readConfig(key, row?.value);
}

/** Contact details in the shape the pages use. */
export const getSite = async () => toSite(await getSiteConfig("contact"));
