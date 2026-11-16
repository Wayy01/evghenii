import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { TextsEditor } from "@/components/admin/texts/texts-editor";
import { hasLocale, type Locale } from "@/i18n/config";
import { getAdminDict } from "@/i18n/dictionaries";
import { getTextEntries } from "@/lib/admin/cms-queries";
import { requireAdmin } from "@/lib/auth";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/texts">) {
  const { locale } = await params;
  return { title: (await getAdminDict(hasLocale(locale) ? locale : "ro")).texts.title };
}

export default async function TextsPage({ params }: PageProps<"/[locale]/admin/texts">) {
  const { locale: raw } = await params;
  const locale: Locale = hasLocale(raw) ? raw : "ro";
  const t = await getAdminDict(locale);

  return (
    <>
      <PageHeader title={t.texts.title} description={t.texts.lead} />
      <Suspense fallback={<TextsSkeleton />}>
        <Texts locale={locale} />
      </Suspense>
    </>
  );
}

async function Texts({ locale }: { locale: Locale }) {
  await requireAdmin(locale);
  return <TextsEditor entries={await getTextEntries()} />;
}

/** Shaped like the editor: section index, search bar, then rows of paired fields. */
function TextsSkeleton() {
  return (
    <div aria-hidden className="grid gap-x-10 lg:grid-cols-[200px_minmax(0,1fr)]">
      <div className="hidden content-start gap-2 lg:grid">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="skeleton h-9" />
        ))}
      </div>
      <div>
        <div className="skeleton h-11" />
        <div className="skeleton mt-10 h-8 w-56" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="mt-4 grid gap-x-8 gap-y-3 border-t border-line pt-5 xl:grid-cols-[180px_minmax(0,1fr)]">
            <div className="skeleton h-5 w-28" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="skeleton h-11" />
              <div className="skeleton h-11" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
