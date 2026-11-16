import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { ServicesManager } from "@/components/admin/manage/services-manager";
import { hasLocale, type Locale } from "@/i18n/config";
import { getAdminDict } from "@/i18n/dictionaries";
import { getMediaOptions } from "@/lib/admin/cms-queries";
import { getAllServices } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/services">) {
  const { locale } = await params;
  return { title: (await getAdminDict(hasLocale(locale) ? locale : "ro")).services.title };
}

export default async function ServicesPage({ params }: PageProps<"/[locale]/admin/services">) {
  const { locale: raw } = await params;
  const locale: Locale = hasLocale(raw) ? raw : "ro";
  const t = await getAdminDict(locale);

  return (
    <Suspense
      fallback={
        <>
          <PageHeader title={t.services.title} description={t.services.lead} />
          <div aria-hidden className="grid gap-10">
            {[3, 2, 1].map((rows) => (
              <div key={rows} className="grid gap-x-10 gap-y-3 border-t border-line-strong pt-5 lg:grid-cols-[200px_minmax(0,1fr)]">
                <div className="skeleton h-8 w-32" />
                <div className="grid gap-3">
                  {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="skeleton h-14" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      }
    >
      <Services locale={locale} />
    </Suspense>
  );
}

async function Services({ locale }: { locale: Locale }) {
  await requireAdmin(locale);
  const [services, media] = await Promise.all([getAllServices(), getMediaOptions(locale)]);
  return (
    <ServicesManager
      media={media}
      services={services.map((s) => ({
        id: s.id,
        slug: s.slug,
        category: s.category,
        nameRo: s.nameRo,
        nameRu: s.nameRu,
        descriptionRo: s.descriptionRo,
        descriptionRu: s.descriptionRu,
        price: s.price,
        durationMin: s.durationMin,
        active: s.active,
        sortOrder: s.sortOrder,
        image: s.image,
      }))}
    />
  );
}
