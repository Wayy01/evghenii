"use client";
import { useRef } from "react";
import type { Locale } from "@/i18n/config";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { intlLocale } from "@/lib/time";

/** A figure that counts up once when it first appears; the server renders the final value. */
export function CountUp({ value, locale }: { value: number; locale: Locale }) {
  const ref = useRef<HTMLSpanElement>(null);
  const format = (n: number) => new Intl.NumberFormat(intlLocale[locale]).format(Math.round(n));

  useGSAP(
    () => {
      const el = ref.current!;
      if (!window.matchMedia(MOTION_OK).matches || value === 0) return;
      const state = { n: 0 };
      el.textContent = format(0);
      gsap.to(state, {
        n: value,
        duration: 1.1,
        ease: "power3.out",
        onUpdate: () => {
          el.textContent = format(state.n);
        },
      });
    },
    { dependencies: [value, locale] },
  );

  return (
    <span ref={ref} className="tnum">
      {format(value)}
    </span>
  );
}
