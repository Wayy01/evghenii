"use client";
import { useRef } from "react";
import { Play } from "@phosphor-icons/react";
import { useReelViewer } from "@/components/site/reel-viewer";
import { DESKTOP, gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";

export type Principle = { title: string; body: string; reelId: number | null };

/**
 * How he works, each point backed by the video in which he says it. On wide screens the one crossing the middle of the
 * viewport is lit and the rest step back, so they read one at a time beside
 * the pinned portrait. Phones and reduced motion get a plain, fully lit list.
 */
export function Principles({ items, watchLabel }: { items: Principle[]; watchLabel: string }) {
  const { open } = useReelViewer();
  const root = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${DESKTOP} and ${MOTION_OK}`, () => {
        const rows = gsap.utils.toArray<HTMLElement>("[data-principle]");
        gsap.set(rows, { opacity: 0.28 });
        rows.forEach((row) => {
          ScrollTrigger.create({
            trigger: row,
            start: "top 62%",
            end: "bottom 38%",
            onToggle: (self) =>
              gsap.to(row, { opacity: self.isActive ? 1 : 0.28, duration: 0.5, ease: "power2.out", overwrite: true }),
          });
        });
      });
    },
    { scope: root },
  );

  return (
    <ol ref={root} className="mt-12 lg:mt-24">
      {items.map((item, i) => (
        <li key={i} data-principle className="border-t border-line py-8 lg:flex lg:min-h-[44vh] lg:flex-col lg:justify-center lg:py-14">
          <h3 className="display text-[clamp(2.25rem,9vw,4.5rem)]">{item.title}</h3>
          <p className="mt-4 max-w-[44ch] text-[1.0625rem] leading-relaxed text-muted lg:mt-6 lg:text-lg">{item.body}</p>
          {item.reelId != null ? (
            <button
              type="button"
              onClick={() => open(item.reelId!)}
              className="group mt-5 inline-flex h-11 w-fit items-center gap-2.5 text-[0.9375rem] font-semibold lg:mt-7"
            >
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-fg text-bg transition-[background-color,scale] duration-300 ease-out-expo group-hover:scale-110 group-hover:bg-accent group-hover:text-on-accent">
                <Play size={14} weight="fill" />
              </span>
              {watchLabel}
            </button>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
