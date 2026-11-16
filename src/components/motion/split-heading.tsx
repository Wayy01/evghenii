"use client";
import { useRef } from "react";
import { gsap, MOTION_OK, SplitText, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/cn";

/**
 * Headline whose lines rise out of a mask. `immediate` plays on load (hero);
 * otherwise it waits until the heading scrolls into view.
 */
export function SplitHeading({
  as: Tag = "h2",
  children,
  className,
  delay = 0,
  immediate = false,
  id,
}: {
  as?: "h1" | "h2" | "h3" | "p";
  children: string;
  className?: string;
  delay?: number;
  immediate?: boolean;
  id?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const el = ref.current!;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // autoSplit re-runs the split when the web font lands or the heading reflows.
        const split = SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 108,
              duration: 1.1,
              stagger: 0.08,
              delay,
              scrollTrigger: immediate ? undefined : { trigger: el, start: "top 90%", once: true },
            }),
        });
        gsap.set(el, { visibility: "visible" });
        return () => split.revert();
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} id={id} data-reveal className={cn(className)}>
      {children}
    </Tag>
  );
}
