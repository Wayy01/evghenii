"use client";
import { useRef, type ReactNode } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/cn";

/**
 * Lifts content into place the first time it scrolls into view.
 * With `stagger`, the direct children arrive one after another instead.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  stagger,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current!;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const targets = stagger ? Array.from(el.children) : el;
        if (stagger) gsap.set(el, { visibility: "visible" });
        gsap.fromTo(
          targets,
          { y, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            delay,
            stagger,
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          },
        );
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} data-reveal className={cn(className)}>
      {children}
    </div>
  );
}
