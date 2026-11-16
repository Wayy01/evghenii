import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getSiteDict } from "@/i18n/dictionaries";
import { BookingFlow, BookingFlowSkeleton } from "@/components/site/booking/booking-flow";
import { getActiveServices } from "@/lib/content";
import { toServiceView } from "@/lib/services-view";

export async function generateMetadata({ params }: PageProps<"/[locale]/book">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getSiteDict(locale);
  return { title: t.meta.bookTitle };
}

export default async function BookPage({ params }: PageProps<"/[locale]/book">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, services] = await Promise.all([getSiteDict(locale), getActiveServices()]);

  return (
    <section className="page pt-24 pb-36 lg:pt-32 lg:pb-28">
      <h1 className="label text-muted">{t.book.title}</h1>
      {/* The chosen service, day and time live in the URL, which is request-time data. */}
      <Suspense fallback={<BookingFlowSkeleton />}>
        <BookingFlow
          services={services.map((service) => {
            const view = toServiceView(service, locale);
            return {
              slug: view.slug,
              category: view.category,
              name: view.name,
              description: view.description,
              price: view.price,
              duration: view.duration,
              image: view.image,
            };
          })}
        />
      </Suspense>
    </section>
  );
}
