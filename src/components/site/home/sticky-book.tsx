"use client";
import { useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";

/**
 * Phone-only booking bar. It takes over once the hero buttons have scrolled
 * away and steps aside again when the closing call to action arrives.
 */
export function StickyBook({ href, label }: { href: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const bar = ref.current!;
    const duration = window.matchMedia(MOTION_OK).matches ? 0.5 : 0;
    let pastHero = false;
    let atEnd = false;
    let shown = false;

    const sync = () => {
      const show = pastHero && !atEnd;
      if (show === shown) return;
      shown = show;
      bar.inert = !show;
      gsap.to(bar, { yPercent: show ? 0 : 110, autoAlpha: show ? 1 : 0, duration, overwrite: true });
    };

    gsap.set(bar, { yPercent: 110, autoAlpha: 0 });
    // Both ranges run to the end of the document. (`end: "max"` collapses to
    // the start position when a trigger element is set, so the page is the end trigger.)
    const untilPageEnd = { endTrigger: document.documentElement, end: "bottom top" };
    // Either block can be switched off in the admin; the bar then falls back to scroll distance.
    const heroCta = document.querySelector("#hero-cta");
    ScrollTrigger.create({
      ...(heroCta ? { trigger: heroCta, start: "bottom top" } : { start: 320 }),
      ...untilPageEnd,
      onToggle: (self) => {
        pastHero = self.isActive;
        sync();
      },
    });
    if (!document.querySelector("#closing-cta")) return;
    ScrollTrigger.create({
      trigger: "#closing-cta",
      start: "top bottom",
      ...untilPageEnd,
      onToggle: (self) => {
        atEnd = self.isActive;
        sync();
      },
    });
  });

  return (
    <div
      ref={ref}
      inert
      className="invisible fixed inset-x-0 bottom-0 z-(--z-chrome) border-t border-line bg-bg/90 px-[1.125rem] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg lg:hidden"
    >
      <ButtonLink href={href} size="lg" className="w-full">
        {label}
      </ButtonLink>
    </div>
  );
}
