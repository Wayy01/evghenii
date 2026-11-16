"use client";
import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useSiteI18n } from "@/i18n/client";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { IconButton } from "@/components/ui/button";
import type { Reel } from "@/lib/reels";
import { ReelCard } from "../reel-card";

// The rail starts on the page gutter and runs off the right edge of the viewport.
const gutter =
  "[--gutter:1.125rem] md:[--gutter:2.5rem] xl:[--gutter:3.5rem] [--edge:max(var(--gutter),calc((100%-var(--container-page))/2+var(--gutter)))]";

export function ReelsRail({ reels }: { reels: Reel[] }) {
  const { locale, t } = useSiteI18n();
  const scroller = useRef<HTMLDivElement>(null);

  const step = (direction: 1 | -1) => {
    const el = scroller.current!;
    el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
  };

  return (
    <section aria-labelledby="work-title" className="overflow-x-clip py-20 lg:py-36">
      <div className="page flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <SplitHeading id="work-title" className="display text-[clamp(3.25rem,13vw,6.5rem)]">
            {t.work.title}
          </SplitHeading>
          <Reveal y={16} delay={0.1}>
            <p className="mt-4 max-w-[46ch] text-[1.0625rem] leading-relaxed text-muted">{t.work.lead}</p>
          </Reveal>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/work`}
            className="group mr-2 inline-flex h-11 items-center gap-2 text-[0.9375rem] font-semibold"
          >
            <span className="border-b border-fg pb-0.5">{t.work.all}</span>
            <ArrowRight
              size={18}
              weight="bold"
              className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
            />
          </Link>
          <IconButton
            label={t.work.prev}
            onClick={() => step(-1)}
            className="border border-line-strong max-md:hidden"
          >
            <ArrowLeft size={20} />
          </IconButton>
          <IconButton
            label={t.work.next}
            onClick={() => step(1)}
            className="border border-line-strong max-md:hidden"
          >
            <ArrowRight size={20} />
          </IconButton>
        </div>
      </div>

      <div
        ref={scroller}
        className={`${gutter} no-scrollbar mt-10 snap-x snap-mandatory scroll-pl-(--edge) overflow-x-auto overscroll-x-contain pr-(--gutter) pl-(--edge) lg:mt-14`}
      >
        <Reveal stagger={0.07} y={36} className="flex w-max gap-3.5 lg:gap-5">
          {reels.map((reel) => (
            <div key={reel.id} className="w-[62vw] max-w-[300px] shrink-0 snap-start sm:w-[34vw] lg:w-[21vw]">
              <ReelCard reel={reel} />
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
