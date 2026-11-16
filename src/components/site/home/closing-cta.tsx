import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/i18n/config";
import type { SiteDict } from "@/i18n/dictionaries";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";

/** The page ends on the one action it exists for, set in the accent colour. */
export function ClosingCta({ locale, t }: { locale: Locale; t: SiteDict }) {
  return (
    <section id="closing-cta" aria-labelledby="cta-title" className="page pb-16 lg:pb-28">
      <div className="rounded-frame bg-accent px-6 pt-12 pb-8 text-on-accent sm:px-10 lg:px-16 lg:pt-20 lg:pb-14">
        <SplitHeading id="cta-title" className="display text-[clamp(4.5rem,19vw,12rem)]">
          {t.cta.title}
        </SplitHeading>
        <Reveal y={20} delay={0.15}>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-7 lg:mt-12">
            <p className="max-w-[32ch] text-lg leading-relaxed text-on-accent/85 lg:text-xl">{t.cta.body}</p>
            <Link
              href={`/${locale}/book`}
              className="group inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-on-accent px-8 text-base font-semibold text-accent transition-[opacity,scale] duration-200 hover:opacity-92 active:scale-[0.97] sm:w-auto"
            >
              {t.nav.book}
              <ArrowRight
                size={20}
                weight="bold"
                className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
              />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
