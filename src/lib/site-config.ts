import { z } from "zod";
import type { Locale } from "@/i18n/config";

// Everything about the public site that the owner can change from the admin
// besides plain text: contact details, menu links and the home page layout.
// Stored as JSON documents in `site_config`; these schemas guard both the
// admin's writes and every read, so a bad row can never break the site.

const localized = z.object({ ro: z.string().trim().max(2000), ru: z.string().trim().max(2000) });
export type Localized = z.infer<typeof localized>;
export const pick = (value: Localized, locale: Locale) => value[locale] || value.ro;

// ------------------------------------------------------------------ contact

export const contactSchema = z.object({
  phone: z.string().trim().min(5).max(40),
  address: localized,
  mapsUrl: z.url().max(600),
  instagram: z.union([z.literal(""), z.url().max(300)]),
  tiktok: z.union([z.literal(""), z.url().max(300)]),
});
export type ContactConfig = z.infer<typeof contactSchema>;

export const defaultContact: ContactConfig = {
  phone: "+373 683 838 77",
  address: { ro: "str. Miron Costin 17/7, Chișinău", ru: "ул. Мирона Костина 17/7, Кишинёв" },
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Miron+Costin+17%2F7%2C+Chi%C8%99in%C4%83u",
  instagram: "https://www.instagram.com/evgheniibarber/",
  tiktok: "https://vt.tiktok.com/ZSCSfaxGe/",
};

/** Contact details in the shape the pages use. */
export type Site = {
  name: string;
  phoneDisplay: string;
  phoneHref: string;
  address: Localized;
  mapsUrl: string;
  instagram: string;
  tiktok: string;
};

export const toSite = (contact: ContactConfig): Site => ({
  name: "Evghenii",
  phoneDisplay: contact.phone,
  phoneHref: `tel:${contact.phone.replace(/[^\d+]/g, "")}`,
  address: contact.address,
  mapsUrl: contact.mapsUrl,
  instagram: contact.instagram,
  tiktok: contact.tiktok,
});

// ---------------------------------------------------------------------- nav

export const navSchema = z.object({
  links: z
    .array(
      z.object({
        label: localized,
        // A path without the locale ("/work", "/#services") or a full URL.
        href: z.string().trim().min(1).max(600),
      }),
    )
    .max(8),
});
export type NavConfig = z.infer<typeof navSchema>;

export const defaultNav: NavConfig = {
  links: [
    { label: { ro: "Lucrări", ru: "Работы" }, href: "/work" },
    { label: { ro: "Servicii", ru: "Услуги" }, href: "/#services" },
    { label: { ro: "Blog", ru: "Блог" }, href: "/blog" },
    { label: { ro: "Studio", ru: "Студия" }, href: "/#studio" },
  ],
};

const EXTERNAL = /^(https?:|tel:|mailto:)/i;
export const isExternalHref = (href: string) => EXTERNAL.test(href);

/** Turns a stored menu target into a real href for the given locale. */
export function resolveHref(locale: Locale, href: string): string {
  if (isExternalHref(href)) return href;
  if (href.startsWith("/#")) return `/${locale}${href.slice(1)}`;
  if (href.startsWith("#")) return `/${locale}${href}`;
  const path = href.startsWith("/") ? href : `/${href}`;
  return `/${locale}${path === "/" ? "" : path}`;
}

// --------------------------------------------------------------------- home

export const HOME_SECTIONS = ["hero", "reels", "about", "services", "feature", "blog", "studio", "cta"] as const;
export type HomeSectionId = (typeof HOME_SECTIONS)[number];

const point = z.object({ title: localized, body: localized, mediaId: z.number().int().positive().nullable() });
export type HomePoint = z.infer<typeof point>;

export const homeSchema = z.object({
  /** Order on the page, top to bottom, and whether each block is shown. */
  sections: z.array(z.object({ id: z.enum(HOME_SECTIONS), enabled: z.boolean() })),
  hero: z.object({
    /** Video in the main frame; none means the first featured video. */
    mediaId: z.number().int().positive().nullable(),
    /** Small image overlapping the frame on wide screens. */
    inset: z.string().max(600).nullable(),
  }),
  about: z.object({
    portrait: z.string().max(600).nullable(),
    points: z.array(point).max(8),
  }),
  /** The dark panel with one video and a short list beside it. */
  feature: z.object({
    mediaId: z.number().int().positive().nullable(),
    steps: z.array(localized).max(8),
  }),
});
export type HomeConfig = z.infer<typeof homeSchema>;

export const defaultHome: HomeConfig = {
  sections: HOME_SECTIONS.map((id) => ({ id, enabled: true })),
  hero: { mediaId: null, inset: null },
  about: {
    portrait: null,
    points: [
      {
        title: { ro: "După forma feței", ru: "По форме лица" },
        body: {
          ro: "La o față alungită e nevoie de volum pe părți, măcar un pic. La una îngustă, de lungime medie, ca nasul și urechile să nu iasă în evidență.",
          ru: "Вытянутому лицу нужен объём по бокам, хотя бы немного. Узкому подходит средняя длина, чтобы нос и уши не бросались в глаза.",
        },
        mediaId: null,
      },
      {
        title: { ro: "Fără șablon", ru: "Без шаблона" },
        body: {
          ro: "Nu poți tunde pe toți după un șablon. Fiecare client e analizat în parte. Asta le predă și elevilor lui, împreună cu baza de foarfecă.",
          ru: "Нельзя стричь всех по одному шаблону. Каждого клиента он разбирает отдельно. Этому же учит своих учеников, вместе с базой работы ножницами.",
        },
        mediaId: null,
      },
      {
        title: { ro: "Tunsoare și aranjare", ru: "Стрижка и укладка" },
        body: {
          ro: "O frizură bine aleasă și o aranjare corectă schimbă tot. La păr des și pufos, de exemplu, merge un flow sau un side part.",
          ru: "Хорошо подобранная стрижка и правильная укладка меняют всё. Густым пушистым волосам, например, подходит flow или side part.",
        },
        mediaId: null,
      },
      {
        title: { ro: "Accent pe ce e bun", ru: "Акцент на сильном" },
        body: {
          ro: "O frezură aleasă corect scoate în evidență aspectele bune și ia accentul de pe cele rele. Urechile proeminente, de exemplu, par mai mici.",
          ru: "Правильно подобранная стрижка подчёркивает удачные черты и уводит внимание от неудачных. Оттопыренные уши, например, кажутся меньше.",
        },
        mediaId: null,
      },
    ],
  },
  feature: {
    mediaId: null,
    steps: [
      { ro: "Camera arată scalpul de aproape", ru: "Камера показывает кожу головы вблизи" },
      { ro: "Spălare", ru: "Мытьё" },
      { ro: "Îngrijire aplicată direct pe scalp", ru: "Уход наносится прямо на кожу головы" },
    ],
  },
};

/** Keeps every section exactly once, in the stored order, with unknown ones dropped. */
export function normalizeHome(home: HomeConfig): HomeConfig {
  const seen = new Set<HomeSectionId>();
  const sections = home.sections.filter((s) => !seen.has(s.id) && seen.add(s.id));
  for (const id of HOME_SECTIONS) if (!seen.has(id)) sections.push({ id, enabled: true });
  return { ...home, sections };
}

export const configSchemas = { contact: contactSchema, nav: navSchema, home: homeSchema } as const;
export type ConfigKey = keyof typeof configSchemas;
export type ConfigValue<K extends ConfigKey> = z.infer<(typeof configSchemas)[K]>;
export const configDefaults: { [K in ConfigKey]: ConfigValue<K> } = {
  contact: defaultContact,
  nav: defaultNav,
  home: defaultHome,
};

/** Validates a stored document, falling back to the built-in default. */
export function readConfig<K extends ConfigKey>(key: K, value: unknown): ConfigValue<K> {
  const parsed = configSchemas[key].safeParse(value);
  const result = (parsed.success ? parsed.data : configDefaults[key]) as ConfigValue<K>;
  return (key === "home" ? normalizeHome(result as HomeConfig) : result) as ConfigValue<K>;
}

// --------------------------------------------------------------------- texts

/** Flattens a dictionary to `path -> string`, e.g. `hero.title`, `studio.weekdays.0`. */
export function flattenTexts(node: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (typeof node === "string") out[prefix] = node;
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) flattenTexts(value, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

/** Returns a copy of `dict` with each override applied where the path already holds a string. */
export function applyTextOverrides<T>(dict: T, overrides: Record<string, string>): T {
  const copy = structuredClone(dict);
  for (const [path, value] of Object.entries(overrides)) {
    const keys = path.split(".");
    let node: unknown = copy;
    for (const key of keys.slice(0, -1)) node = (node as Record<string, unknown> | undefined)?.[key];
    const last = keys[keys.length - 1];
    if (node && typeof node === "object" && typeof (node as Record<string, unknown>)[last] === "string") {
      (node as Record<string, unknown>)[last] = value;
    }
  }
  return copy;
}
