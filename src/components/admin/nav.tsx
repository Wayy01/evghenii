"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowSquareOut,
  CalendarBlank,
  DotsThree,
  FilmStrip,
  GearSix,
  House,
  Layout,
  Scissors,
  SignOut,
  TextAa,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { useAdminI18n } from "@/i18n/client";
import { locales, type Locale } from "@/i18n/config";
import { logoutAction } from "@/lib/admin/auth-actions";
import { cn } from "@/lib/cn";

type NavKey = "overview" | "calendar" | "clients" | "services" | "content" | "site" | "texts" | "settings";
type Item = { key: NavKey; href: string; icon: Icon };

const navItems = (locale: Locale): Item[] => [
  { key: "overview", href: `/${locale}/admin`, icon: House },
  { key: "calendar", href: `/${locale}/admin/calendar`, icon: CalendarBlank },
  { key: "clients", href: `/${locale}/admin/clients`, icon: UsersThree },
  { key: "content", href: `/${locale}/admin/content`, icon: FilmStrip },
  { key: "services", href: `/${locale}/admin/services`, icon: Scissors },
  { key: "site", href: `/${locale}/admin/site`, icon: Layout },
  { key: "texts", href: `/${locale}/admin/texts`, icon: TextAa },
  { key: "settings", href: `/${locale}/admin/settings`, icon: GearSix },
];

/** The phone tab bar holds the first four; the rest live behind "More". */
const PRIMARY_TABS = 4;

const isActive = (href: string, pathname: string | null, locale: Locale) =>
  !!pathname && (href === `/${locale}/admin` ? pathname === href : pathname.startsWith(href));

/** Same admin screen in the other language. */
const switchHref = (pathname: string | null, target: Locale) =>
  pathname ? pathname.replace(/^\/[a-z]{2}(?=\/|$)/, `/${target}`) : `/${target}/admin`;

function LocaleToggle({ pathname }: { pathname: string | null }) {
  const { locale, t } = useAdminI18n();
  return (
    <div role="group" aria-label={t.nav.language} className="flex items-center gap-0.5 text-sm font-semibold">
      {locales.map((l) => (
        <Link
          key={l}
          href={switchHref(pathname, l)}
          hrefLang={l}
          aria-current={l === locale ? "true" : undefined}
          className={cn(
            "inline-flex h-9 min-w-10 items-center justify-center rounded-full px-2.5 uppercase transition-colors duration-200",
            l === locale ? "bg-fg/8 text-fg" : "text-muted hover:text-fg",
          )}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}

function LogoutButton({ className }: { className?: string }) {
  const { locale, t } = useAdminI18n();
  return (
    <form action={logoutAction}>
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className={className}>
        <SignOut size={20} />
        {t.nav.logout}
      </button>
    </form>
  );
}

const sideLink =
  "flex h-11 items-center gap-3 rounded-full px-4 text-[0.9375rem] font-medium transition-colors duration-200";

/**
 * Admin navigation: a fixed sidebar from `lg` up, a bottom tab bar on phones.
 * `pathname` is null while the URL is not known yet, so nothing is highlighted.
 */
export function AdminNav({ pathname }: { pathname: string | null }) {
  const { locale, t } = useAdminI18n();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = navItems(locale);
  const tabs = items.slice(0, PRIMARY_TABS);
  const rest = items.slice(PRIMARY_TABS);
  const restActive = rest.some((item) => isActive(item.href, pathname, locale));

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-(--z-chrome) hidden w-[248px] flex-col border-r border-line bg-bg px-4 pt-7 pb-5 lg:flex">
        <Link href={`/${locale}/admin`} className="px-4">
          <span className="display block text-[2rem] leading-none">Evghenii</span>
          <span className="label mt-2 block text-muted">{t.meta.title}</span>
        </Link>

        <nav aria-label={t.meta.title} className="mt-9 grid gap-1">
          {items.map((item) => {
            const active = isActive(item.href, pathname, locale);
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  sideLink,
                  active ? "bg-accent-soft font-semibold text-accent-text" : "text-muted hover:bg-fg/6 hover:text-fg",
                )}
              >
                <item.icon size={20} weight={active ? "fill" : "regular"} />
                {t.nav[item.key]}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-1 border-t border-line pt-4">
          <Link href={`/${locale}`} className={cn(sideLink, "text-muted hover:bg-fg/6 hover:text-fg")}>
            <ArrowSquareOut size={20} />
            {t.nav.viewSite}
          </Link>
          <LogoutButton className={cn(sideLink, "w-full text-muted hover:bg-fg/6 hover:text-fg")} />
          <div className="mt-2 px-2">
            <LocaleToggle pathname={pathname} />
          </div>
        </div>
      </aside>

      <nav
        aria-label={t.meta.title}
        className="fixed inset-x-0 bottom-0 z-(--z-chrome) grid grid-cols-5 border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      >
        {tabs.map((item) => {
          const active = isActive(item.href, pathname, locale);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[60px] flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold transition-colors duration-200",
                active ? "text-accent-text" : "text-muted",
              )}
            >
              <item.icon size={24} weight={active ? "fill" : "regular"} />
              {t.nav[item.key]}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={cn(
            "flex h-[60px] flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold",
            restActive ? "text-accent-text" : "text-muted",
          )}
        >
          <DotsThree size={24} weight="bold" />
          {t.nav.more}
        </button>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t.nav.more} closeLabel={t.common.close}>
        <div className="grid">
          {rest.map((item) => {
            const active = isActive(item.href, pathname, locale);
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 items-center gap-3.5 border-b border-line text-base font-medium",
                  active && "text-accent-text",
                )}
              >
                <item.icon size={22} weight={active ? "fill" : "regular"} />
                {t.nav[item.key]}
              </Link>
            );
          })}
          <Link href={`/${locale}`} className="flex h-14 items-center gap-3.5 border-b border-line text-base font-medium">
            <ArrowSquareOut size={22} />
            {t.nav.viewSite}
          </Link>
          <div className="flex h-14 items-center justify-between border-b border-line">
            <span className="text-base font-medium">{t.nav.language}</span>
            <LocaleToggle pathname={pathname} />
          </div>
          <LogoutButton className="flex h-14 w-full items-center gap-3.5 text-base font-medium text-danger" />
        </div>
      </Sheet>
    </>
  );
}

/** Reads the URL, so it must render inside Suspense; `AdminNav` with a null path is its fallback. */
export function ActiveAdminNav() {
  return <AdminNav pathname={usePathname()} />;
}
