import { Suspense } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/admin/ui";
import { ContactForm } from "@/components/admin/cms/contact-form";
import { HomeEditor } from "@/components/admin/cms/home-editor";
import { HOME_TEXT_KEYS, type HomeTexts } from "@/components/admin/cms/home-texts";
import { MenuEditor } from "@/components/admin/cms/menu-editor";
import { Tabs } from "@/components/admin/manage/controls";
import { buttonClass } from "@/components/ui/button";
import { hasLocale, type Locale } from "@/i18n/config";
import { getAdminDict, type AdminDict } from "@/i18n/dictionaries";
import { getConfigForAdmin, getMediaOptions, getTextEntries } from "@/lib/admin/cms-queries";
import { requireAdmin } from "@/lib/auth";

const TABS = ["home", "menu", "contact"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/site">) {
  const { locale } = await params;
  return { title: (await getAdminDict(hasLocale(locale) ? locale : "ro")).site.title };
}

export default async function SitePage({ params, searchParams }: PageProps<"/[locale]/admin/site">) {
  const { locale: raw } = await params;
  const locale: Locale = hasLocale(raw) ? raw : "ro";
  const t = await getAdminDict(locale);

  return (
    <>
      <PageHeader
        title={t.site.title}
        description={t.site.lead}
        actions={
          <a
            href={`/${locale}`}
            target="_blank"
            rel="noreferrer"
            className={buttonClass({ variant: "outline", size: "sm" }, "h-10")}
          >
            {t.site.viewSite}
            <ArrowSquareOut size={17} />
          </a>
        }
      />
      <Suspense
        fallback={
          <div aria-hidden className="grid gap-6">
            <div className="skeleton h-11 w-80 max-w-full rounded-full" />
            <div className="grid gap-px">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="skeleton h-20" />
              ))}
            </div>
          </div>
        }
      >
        <Site locale={locale} t={t} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Site({
  locale,
  t,
  searchParams,
}: {
  locale: Locale;
  t: AdminDict;
  searchParams: PageProps<"/[locale]/admin/site">["searchParams"];
}) {
  await requireAdmin(locale);
  const query = await searchParams;
  const requested = typeof query.tab === "string" ? query.tab : "";
  const tab: Tab = (TABS as readonly string[]).includes(requested) ? (requested as Tab) : "home";
  const base = `/${locale}/admin/site`;

  return (
    <>
      <Tabs
        label={t.site.tabsLabel}
        value={tab}
        className="mb-7 overflow-x-auto"
        options={TABS.map((value) => ({
          value,
          label: t.site.tabs[value],
          href: value === "home" ? base : `${base}?tab=${value}`,
        }))}
      />
      {tab === "home" ? <HomeTab locale={locale} /> : null}
      {tab === "menu" ? <MenuEditor nav={await getConfigForAdmin("nav")} /> : null}
      {tab === "contact" ? <ContactForm contact={await getConfigForAdmin("contact")} /> : null}
    </>
  );
}

async function HomeTab({ locale }: { locale: Locale }) {
  const [home, media, entries] = await Promise.all([
    getConfigForAdmin("home"),
    getMediaOptions(locale),
    getTextEntries(),
  ]);
  const byKey = new Map(entries.map((entry) => [entry.key, entry]));
  const texts: HomeTexts = Object.fromEntries(
    HOME_TEXT_KEYS.map((key) => {
      const entry = byKey.get(key);
      const defaults = entry?.defaults ?? { ro: "", ru: "" };
      return [key, { defaults, value: { ro: entry?.values.ro ?? defaults.ro, ru: entry?.values.ru ?? defaults.ru } }];
    }),
  );
  return <HomeEditor home={home} texts={texts} media={media} />;
}
