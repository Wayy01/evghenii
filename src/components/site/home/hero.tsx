import { Suspense } from "react";
import type { Locale } from "@/i18n/config";
import type { SiteDict } from "@/i18n/dictionaries";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { ButtonLink } from "@/components/ui/button";
import { HeroMedia } from "./hero-media";
import { NextSlot, NextSlotSkeleton } from "./next-slot";

export function Hero({
  locale,
  t,
  video,
  poster,
  inset,
}: {
  locale: Locale;
  t: SiteDict;
  video: string;
  poster?: string;
  inset?: string;
}) {
  return (
    <section className="flex flex-col lg:min-h-[100dvh]">
      <div className="page grid flex-1 gap-x-10 gap-y-9 pt-[5.5rem] md:grid-cols-12 md:items-center md:pt-24 lg:pb-9">
        <div className="md:col-span-7 lg:col-span-8">
          <SplitHeading
            as="h1"
            immediate
            className="display text-[clamp(4rem,20.5vw,6.25rem)] lg:text-[clamp(5.25rem,8.2vw,7.5rem)]"
          >
            {t.hero.title}
          </SplitHeading>
          <Reveal delay={0.35} y={20}>
            <p className="mt-5 max-w-[34ch] text-[1.0625rem] leading-relaxed text-muted lg:mt-8 lg:text-xl">
              {t.hero.lead}
            </p>
          </Reveal>
          {/* The sticky mobile bar takes over once this row has scrolled away. */}
          <Reveal delay={0.5} y={20}>
            <div id="hero-cta" className="mt-7 flex gap-3 lg:mt-10">
              <ButtonLink href={`/${locale}/book`} size="lg" className="flex-1 px-4 sm:flex-none sm:px-7">
                {t.nav.book}
              </ButtonLink>
              <ButtonLink
                href={`/${locale}/work`}
                size="lg"
                variant="outline"
                className="flex-1 px-4 sm:flex-none sm:px-7"
              >
                {t.hero.secondary}
              </ButtonLink>
            </div>
          </Reveal>
        </div>

        <div className="md:col-span-5 lg:col-span-4 lg:justify-self-end">
          <HeroMedia video={video} poster={poster} inset={inset} label={t.hero.videoLabel} />
        </div>
      </div>

      <div className="page mt-9 lg:mt-0">
        <Suspense fallback={<NextSlotSkeleton label={t.next.loading} />}>
          <NextSlot locale={locale} t={t} />
        </Suspense>
      </div>
    </section>
  );
}
