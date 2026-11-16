import type { HomeSectionId, Localized } from "@/lib/site-config";

/** The copy shown inside each home block, by dictionary key. The rest lives on the Texts screen. */
export const BLOCK_TEXTS: Record<HomeSectionId, string[]> = {
  hero: ["hero.title", "hero.lead", "hero.secondary"],
  reels: ["work.title", "work.lead", "work.all"],
  about: ["about.title", "about.lead", "about.watch"],
  services: ["services.title", "services.lead", "services.note"],
  feature: ["scalp.title", "scalp.body"],
  blog: ["blog.title", "blog.all"],
  studio: ["studio.title", "studio.body"],
  cta: ["cta.title", "cta.body"],
};
export const HOME_TEXT_KEYS = Object.values(BLOCK_TEXTS).flat();

/** Built-in text and current text of each of those keys, in both languages. */
export type HomeTexts = Record<string, { defaults: Localized; value: Localized }>;
