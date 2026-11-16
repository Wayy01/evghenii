"use client";
import { useRef } from "react";
import Image from "next/image";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { AutoVideo } from "./auto-video";

/**
 * The hero footage. Behind it sits one thin outlined rectangle, offset like
 * the rectangular LED light that hangs from the studio ceiling.
 */
export function HeroMedia({
  video,
  poster,
  inset,
  label,
}: {
  video: string;
  poster?: string;
  /** A second, smaller still that overlaps the corner on wide screens. */
  inset?: string;
  label: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.set(root.current, { visibility: "visible" });
        gsap
          .timeline({ delay: 0.15 })
          .fromTo(
            "[data-hero-frame]",
            { clipPath: "inset(100% 0% 0% 0% round 14px)" },
            { clipPath: "inset(0% 0% 0% 0% round 14px)", duration: 1.3, ease: "expo.inOut" },
          )
          .from("[data-hero-footage]", { scale: 1.14, duration: 1.7 }, "<")
          .from("[data-hero-led]", { autoAlpha: 0, x: 18, y: -18, duration: 1.1 }, "-=0.9")
          .from("[data-hero-inset]", { autoAlpha: 0, y: 36, duration: 1 }, "-=0.95");
      });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      data-reveal
      className="relative isolate aspect-[4/5] w-full md:aspect-[9/16] lg:h-[min(calc(100dvh-15.5rem),43rem)] lg:w-auto"
    >
      <span
        data-hero-led
        aria-hidden
        className="absolute inset-0 -z-10 -translate-x-2.5 translate-y-2.5 rounded-frame border border-line-strong lg:-translate-x-5 lg:translate-y-5"
      />
      <div data-hero-frame className="absolute inset-0 overflow-hidden rounded-frame bg-night">
        <div data-hero-footage className="size-full">
          <AutoVideo src={video} poster={poster} label={label} eager className="size-full object-cover" />
        </div>
      </div>
      {inset ? (
        <div
          data-hero-inset
          className="absolute bottom-12 -left-24 hidden aspect-[4/5] w-40 overflow-hidden rounded-frame ring-[6px] ring-bg xl:block"
        >
          <Image src={inset} alt="" fill sizes="160px" className="object-cover object-[50%_58%]" />
        </div>
      ) : null}
    </div>
  );
}
