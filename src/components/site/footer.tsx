import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/i18n/config";
import type { SiteDict } from "@/i18n/dictionaries";
import { resolveHref, pick, type NavConfig, type Site } from "@/lib/site-config";

const external = "group inline-flex items-center gap-1.5 hover:text-fg";

export function Footer({ locale, t, site, nav }: { locale: Locale; t: SiteDict; site: Site; nav: NavConfig }) {
  const links = [
    ...nav.links.map((link) => ({ href: resolveHref(locale, link.href), label: pick(link.label, locale) })),
    { href: `/${locale}/book`, label: t.nav.book },
  ];

  return (
    <footer className="border-t border-line pt-14 pb-[max(2rem,env(safe-area-inset-bottom))] lg:pt-20">
      <div className="page">
        <div className="grid gap-10 text-[0.9375rem] text-muted sm:grid-cols-3">
          <nav aria-label={t.nav.menu} className="grid content-start gap-3">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="w-fit text-fg hover:text-accent-text">
                {link.label}
              </Link>
            ))}
          </nav>
          <address className="grid content-start gap-3 not-italic">
            <a href={site.mapsUrl} target="_blank" rel="noreferrer" className={external}>
              {site.address[locale]}
              <ArrowUpRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <a href={site.phoneHref} className="tnum w-fit hover:text-fg">
              {site.phoneDisplay}
            </a>
          </address>
          <div className="grid content-start gap-3">
            {site.instagram ? (
            <a href={site.instagram} target="_blank" rel="noreferrer" className={external}>
              Instagram
              <ArrowUpRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            ) : null}
            {site.tiktok ? (
            <a href={site.tiktok} target="_blank" rel="noreferrer" className={external}>
              TikTok
              <ArrowUpRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            ) : null}
          </div>
        </div>

        {/* The name set as wide as the page: the sign above the door. */}
        <p aria-hidden className="display mt-14 text-[31vw] leading-[0.8] tracking-[-0.01em] select-none lg:mt-20 xl:text-[26.5rem]">
          Evghenii
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted">
          <p>{t.footer.rights}</p>
          <Link href={`/${locale}/admin`} className="hover:text-fg">
            {t.footer.admin}
          </Link>
        </div>
      </div>
    </footer>
  );
}
