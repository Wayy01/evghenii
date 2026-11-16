"use client";
import { createContext, use } from "react";
import type { Locale } from "./config";
import type { Site } from "@/lib/site-config";
import type { AdminDict, SiteDict } from "./dictionaries";

type Ctx<T> = { locale: Locale; t: T };

const SiteContext = createContext<(Ctx<SiteDict> & { site: Site }) | null>(null);
const AdminContext = createContext<Ctx<AdminDict> | null>(null);

export function SiteI18nProvider({
  locale,
  dict,
  site,
  children,
}: {
  locale: Locale;
  dict: SiteDict;
  /** Contact details, editable in the admin. */
  site: Site;
  children: React.ReactNode;
}) {
  return <SiteContext value={{ locale, t: dict, site }}>{children}</SiteContext>;
}

export function AdminI18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: AdminDict;
  children: React.ReactNode;
}) {
  return <AdminContext value={{ locale, t: dict }}>{children}</AdminContext>;
}

export function useSiteI18n() {
  const value = use(SiteContext);
  if (!value) throw new Error("useSiteI18n must be used inside SiteI18nProvider");
  return value;
}

export function useAdminI18n() {
  const value = use(AdminContext);
  if (!value) throw new Error("useAdminI18n must be used inside AdminI18nProvider");
  return value;
}
