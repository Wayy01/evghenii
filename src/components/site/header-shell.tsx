"use client";
import { useRef, type ReactNode } from "react";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";

/** Fixed bar that picks up a backdrop once the page has scrolled under it. */
export function HeaderShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    ScrollTrigger.create({
      start: 12,
      end: "max",
      onToggle: (self) => ref.current?.toggleAttribute("data-scrolled", self.isActive),
    });
  });

  return (
    <header
      ref={ref}
      className="fixed inset-x-0 top-0 z-(--z-chrome) border-b border-transparent transition-[background-color,border-color] duration-300 data-scrolled:border-line data-scrolled:bg-bg/85 data-scrolled:backdrop-blur-lg"
    >
      {children}
    </header>
  );
}
