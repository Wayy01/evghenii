import "server-only";
import { getTextOverrides } from "@/lib/content";
import { applyTextOverrides } from "@/lib/site-config";
import type { Locale } from "./config";

const site = {
  ro: () => import("./messages/ro.site.json").then((m) => m.default),
  ru: () => import("./messages/ru.site.json").then((m) => m.default),
};
// Booking strings live apart from the marketing copy; the flow is its own surface.
const book = {
  ro: () => import("./messages/ro.book.json").then((m) => m.default),
  ru: () => import("./messages/ru.book.json").then((m) => m.default),
};
const admin = {
  ro: () => import("./messages/ro.admin.json").then((m) => m.default),
  ru: () => import("./messages/ru.admin.json").then((m) => m.default),
};
const calendar = {
  ro: () => import("./messages/ro.calendar.json").then((m) => m.default),
  ru: () => import("./messages/ru.calendar.json").then((m) => m.default),
};

type BookDict = Awaited<ReturnType<(typeof book)["ro"]>>;
export type SiteDict = Awaited<ReturnType<(typeof site)["ro"]>> & BookDict;
export type CalendarDict = Awaited<ReturnType<(typeof calendar)["ro"]>>;
export type AdminDict = Awaited<ReturnType<(typeof admin)["ro"]>> & { cal: CalendarDict };

// The ru files must have exactly the ro shape; these assignments fail type-checking otherwise.
/** The built-in copy, before any edits made in the admin. */
export const getSiteDefaults = async (locale: Locale): Promise<SiteDict> => {
  const [base, booking] = await Promise.all([site[locale](), book[locale]()]);
  return { ...base, ...booking };
};

/** The copy the public site shows: built-in text with the owner's edits on top. */
export const getSiteDict = async (locale: Locale): Promise<SiteDict> => {
  const [defaults, overrides] = await Promise.all([getSiteDefaults(locale), getTextOverrides(locale)]);
  return applyTextOverrides(defaults, overrides);
};
export const getAdminDict = async (locale: Locale): Promise<AdminDict> => {
  const [base, cal] = await Promise.all([admin[locale](), calendar[locale]()]);
  return { ...base, cal };
};
