import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getSiteDict } from "@/i18n/dictionaries";
import { SiteI18nProvider } from "@/i18n/client";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { getSite, getSiteConfig } from "@/lib/content";

export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, site, nav] = await Promise.all([getSiteDict(locale), getSite(), getSiteConfig("nav")]);

  return (
    <SiteI18nProvider locale={locale} dict={t} site={site}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-toast) focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
      >
        {t.nav.skip}
      </a>
      <Header locale={locale} t={t} site={site} nav={nav} />
      <main id="main">{children}</main>
      <Footer locale={locale} t={t} site={site} nav={nav} />
    </SiteI18nProvider>
  );
}
