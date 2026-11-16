import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fmt, hasLocale } from "@/i18n/config";
import { getSiteDict } from "@/i18n/dictionaries";
import { getPublishedMedia } from "@/lib/content";
import { toReel } from "@/lib/reels";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { BookPrompt } from "@/components/site/work/book-prompt";
import { WorkGallery } from "@/components/site/work/work-gallery";

export async function generateMetadata({ params }: PageProps<"/[locale]/work">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getSiteDict(locale);
  return {
    title: t.meta.workTitle,
    description: t.work.pageLead,
    alternates: { languages: { ro: "/ro/work", ru: "/ru/work" } },
  };
}

export default async function WorkPage({ params }: PageProps<"/[locale]/work">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, media] = await Promise.all([getSiteDict(locale), getPublishedMedia()]);
  const reels = media.map((m) => toReel(m, locale));
  const videoCount = reels.filter((r) => r.kind === "video").length;

  return (
    <>
      <section className="page pt-28 pb-16 lg:pt-36 lg:pb-24">
        <SplitHeading as="h1" immediate className="display text-[clamp(5rem,25vw,15rem)] leading-[0.86]">
          {t.work.pageTitle}
        </SplitHeading>
        <Reveal delay={0.25} className="mt-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-3 lg:mt-8">
          <p className="max-w-[40ch] text-lg text-pretty text-muted">{t.work.pageLead}</p>
          {videoCount > 0 && <p className="label tnum text-muted">{fmt(t.work.count, { n: videoCount })}</p>}
        </Reveal>

        <div className="mt-10 lg:mt-14">
          {reels.length === 0 ? (
            <div className="grid justify-items-start gap-6 rounded-frame border border-dashed border-line-strong px-6 py-14 md:px-12 md:py-20">
              <p className="display max-w-[14ch] text-[clamp(2.5rem,8vw,4.5rem)]">{t.work.empty}</p>
              <ButtonLink href={`/${locale}/book`} variant="ink">
                {t.nav.book}
              </ButtonLink>
            </div>
          ) : (
            <WorkGallery reels={reels} />
          )}
        </div>
      </section>

      <BookPrompt title={t.cta.title} body={t.cta.body} cta={t.nav.book} href={`/${locale}/book`} />
    </>
  );
}
