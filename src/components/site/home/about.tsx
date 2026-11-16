import Image from "next/image";
import type { SiteDict } from "@/i18n/dictionaries";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { Principles, type Principle } from "./principles";

export function About({ t, portrait, points }: { t: SiteDict; portrait: string | null; points: Principle[] }) {
  return (
    <section aria-labelledby="about-title" className="border-t border-line py-20 lg:py-36">
      <div className="page grid gap-x-16 gap-y-9 lg:grid-cols-12 lg:grid-rows-[auto_1fr]">
        <div className="lg:col-span-7 lg:col-start-6">
          <SplitHeading id="about-title" className="display text-[clamp(3.25rem,13vw,6.5rem)]">
            {t.about.title}
          </SplitHeading>
          <Reveal y={16} delay={0.1}>
            <p className="mt-4 max-w-[36ch] text-xl leading-snug lg:mt-6 lg:text-2xl">{t.about.lead}</p>
          </Reveal>
        </div>

        {/* Pinned on wide screens while the principles scroll past. */}
        <div className="lg:sticky lg:top-28 lg:col-span-5 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
          {portrait ? (
          <Reveal y={40}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-frame bg-sunken lg:max-h-[calc(100dvh-10rem)] lg:w-full">
              <Image
                src={portrait}
                alt={t.about.title}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover object-[50%_30%]"
              />
            </div>
          </Reveal>
          ) : null}
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          <Principles items={points} watchLabel={t.about.watch} />
        </div>
      </div>
    </section>
  );
}
