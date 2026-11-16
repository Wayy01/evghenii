export const locales = ["ro", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ro";
export const LOCALE_COOKIE = "ev_locale";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

/** Picks the column for the active locale from a `…Ro` / `…Ru` pair. */
export const tr = (locale: Locale, ro: string, ru: string) => (locale === "ru" ? ru : ro);

/** Replaces `{name}` placeholders in a dictionary string. */
export const fmt = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
