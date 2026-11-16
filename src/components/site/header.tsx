import { Suspense } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { SiteDict } from "@/i18n/dictionaries";
import { ButtonLink } from "@/components/ui/button";
import { resolveHref, pick, type NavConfig, type Site } from "@/lib/site-config";
import { HeaderShell } from "./header-shell";
import { LocaleSwitch, LocaleSwitchFallback } from "./locale-switch";
import { MobileMenu } from "./mobile-menu";
import { Wordmark } from "./wordmark";

export function Header({ locale, t, site, nav }: { locale: Locale; t: SiteDict; site: Site; nav: NavConfig }) {
  const links = nav.links.map((link) => ({ href: resolveHref(locale, link.href), label: pick(link.label, locale) }));
  const bookHref = `/${locale}/book`;

  const localeSwitch = (className?: string) => (
    <Suspense fallback={<LocaleSwitchFallback locale={locale} label={t.nav.language} className={className} />}>
      <LocaleSwitch locale={locale} label={t.nav.language} className={className} />
    </Suspense>
  );

  return (
    <HeaderShell>
      <div className="page flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        <Wordmark locale={locale} label={t.nav.home} />

        <nav aria-label={t.nav.menu} className="hidden items-center gap-9 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="group relative py-2 text-[0.9375rem] font-medium text-fg">
              {link.label}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 h-px origin-left scale-x-0 bg-fg transition-transform duration-300 ease-out-expo group-hover:scale-x-100"
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 lg:gap-3">
          {localeSwitch("max-sm:hidden")}
          <ButtonLink href={bookHref} size="sm" className="h-10 px-5 max-sm:hidden">
            {t.nav.book}
          </ButtonLink>
          <MobileMenu
            links={links}
            bookHref={bookHref}
            labels={{ menu: t.nav.menu, close: t.nav.close, book: t.nav.book }}
            contact={{
              phone: site.phoneDisplay,
              phoneHref: site.phoneHref,
              address: site.address[locale],
              mapsUrl: site.mapsUrl,
              instagram: site.instagram,
              tiktok: site.tiktok,
            }}
            wordmark={<Wordmark locale={locale} label={t.nav.home} />}
            localeSwitch={localeSwitch()}
          />
        </div>
      </div>
    </HeaderShell>
  );
}
