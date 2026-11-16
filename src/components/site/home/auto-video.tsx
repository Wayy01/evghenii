"use client";
import { useRef } from "react";
import { MOTION_OK, ScrollTrigger, useGSAP } from "@/lib/gsap";

/**
 * Silent looping footage that only runs while it is on screen. Visitors who
 * asked for reduced motion get a still poster with native controls instead.
 */
export function AutoVideo({
  src,
  poster,
  label,
  eager = false,
  className,
}: {
  src: string;
  poster?: string;
  label: string;
  /** Above the fold: start before hydration instead of waiting for the scroll check. */
  eager?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useGSAP(() => {
    const video = ref.current!;
    if (!window.matchMedia(MOTION_OK).matches) {
      video.pause();
      video.controls = true;
      return;
    }
    ScrollTrigger.create({
      trigger: video,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        if (self.isActive) video.play().catch(() => {});
        else video.pause();
      },
    });
  });

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      aria-label={label}
      muted
      loop
      playsInline
      autoPlay={eager}
      preload={eager ? "metadata" : "none"}
      className={className}
    />
  );
}
