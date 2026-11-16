"use client";
import { useRef, type ReactNode } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";

/**
 * Right after booking, the ticket is handed over: it settles into place once.
 * On later visits to the same link it is simply there.
 */
export function TicketArrival({ play, children }: { play: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!play) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          ref.current,
          { autoAlpha: 0, y: 56, rotate: -2.5 },
          { autoAlpha: 1, y: 0, rotate: 0, duration: 1.1, delay: 0.35, clearProps: "transform" },
        );
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} data-reveal={play ? "" : undefined}>
      {children}
    </div>
  );
}
