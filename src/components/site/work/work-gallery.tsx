"use client";
import { useRef, useState } from "react";
import { useSiteI18n } from "@/i18n/client";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";
import type { Reel } from "@/lib/reels";
import { cn } from "@/lib/cn";
import { ReelCard } from "@/components/site/reel-card";
import { ReelViewerProvider } from "@/components/site/reel-viewer";

type Filter = "all" | Reel["kind"];

// Every other column hangs lower, so the wall reads as a hung gallery, not a spreadsheet.
// `top` (not transform) keeps the offset clear of the GSAP reveal.
const offset = (i: number) =>
  cn(
    "relative",
    i % 2 === 1 ? "top-10" : "top-0",
    i % 3 === 1 ? "md:top-16" : "md:top-0",
    i % 2 === 1 ? "xl:top-20" : "xl:top-0",
  );

export function WorkGallery({ reels }: { reels: Reel[] }) {
  const { t } = useSiteI18n();
  const grid = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const hasBoth = reels.some((r) => r.kind === "video") && reels.some((r) => r.kind === "photo");
  const shown = filter === "all" ? reels : reels.filter((r) => r.kind === filter);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tiles = gsap.utils.toArray<HTMLElement>("[data-tile]", grid.current);
        gsap.set(tiles, { y: 36, autoAlpha: 0 });
        // Tiles arrive row by row as they scroll in, instead of all at once.
        ScrollTrigger.batch(tiles, {
          start: "top 94%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { y: 0, autoAlpha: 1, stagger: 0.08, overwrite: true }),
        });
      });
    },
    { scope: grid, dependencies: [filter], revertOnUpdate: true },
  );

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t.work.filterAll },
    { key: "video", label: t.work.filterVideo },
    { key: "photo", label: t.work.filterPhoto },
  ];

  return (
    <ReelViewerProvider reels={shown}>
      {hasBoth && (
        <div role="group" aria-label={t.work.pageTitle} className="mb-8 flex gap-2 md:mb-10">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold transition-colors duration-200",
                filter === f.key ? "bg-fg text-bg" : "bg-fg/7 text-fg hover:bg-fg/12",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div
        ref={grid}
        className="grid grid-cols-2 gap-x-3 gap-y-9 pb-10 md:grid-cols-3 md:gap-x-5 md:gap-y-14 md:pb-16 xl:grid-cols-4 xl:gap-x-6 xl:pb-20"
      >
        {shown.map((reel, i) => (
          <div key={reel.id} className={offset(i)}>
            <div data-tile data-reveal>
              <ReelCard
                reel={reel}
                priority={i < 4}
                sizes="(min-width: 1280px) 22vw, (min-width: 768px) 31vw, 47vw"
              />
            </div>
          </div>
        ))}
      </div>
    </ReelViewerProvider>
  );
}
