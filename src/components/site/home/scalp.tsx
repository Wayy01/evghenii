import { Check } from "@phosphor-icons/react/dist/ssr";
import type { SiteDict } from "@/i18n/dictionaries";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { AutoVideo } from "./auto-video";

export function Scalp({
  t,
  video,
  poster,
  steps,
}: {
  t: SiteDict;
  video: string;
  poster?: string;
  steps: string[];
}) {
  return (
    <section aria-labelledby="scalp-title" className="page py-4 lg:py-10">
      <div className="grid overflow-hidden rounded-frame bg-inverse text-on-inverse lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
        <div className="order-2 p-6 pb-9 sm:p-10 lg:order-1 lg:p-16 xl:p-20">
          <SplitHeading id="scalp-title" className="display text-[clamp(2.75rem,11vw,5.5rem)]">
            {t.scalp.title}
          </SplitHeading>
          <Reveal y={20} delay={0.1}>
            <p className="mt-5 max-w-[44ch] text-[1.0625rem] leading-relaxed text-on-inverse-muted lg:mt-7 lg:text-lg">
              {t.scalp.body}
            </p>
          </Reveal>
          <Reveal stagger={0.08} y={16} className="mt-8 grid gap-3.5 lg:mt-10">
            {steps.map((check, i) => (
              <p key={i} className="flex items-start gap-3 text-[1.0625rem] font-medium">
                <Check size={20} weight="bold" className="mt-0.5 shrink-0" />
                {check}
              </p>
            ))}
          </Reveal>
        </div>
        <div className="relative order-1 aspect-[4/5] bg-night lg:order-2 lg:aspect-auto lg:min-h-[38rem]">
          <AutoVideo
            src={video}
            poster={poster}
            label={t.scalp.videoLabel}
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
