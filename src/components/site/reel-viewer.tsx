"use client";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CaretDown,
  CaretUp,
  InstagramLogo,
  Play,
  SpeakerHigh,
  SpeakerSlash,
  X,
} from "@phosphor-icons/react";
import { fmt } from "@/i18n/config";
import { useSiteI18n } from "@/i18n/client";
import { gsap, MOTION_OK } from "@/lib/gsap";
import type { Reel } from "@/lib/reels";
import { cn } from "@/lib/cn";

const ReelViewerContext = createContext<{ open: (id: number) => void } | null>(null);

export function useReelViewer() {
  const value = use(ReelViewerContext);
  if (!value) throw new Error("useReelViewer must be used inside ReelViewerProvider");
  return value;
}

/** Holds the list a page shows; any card inside can open the full-screen feed at its own item. */
export function ReelViewerProvider({ reels, children }: { reels: Reel[]; children: ReactNode }) {
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const open = useCallback(
    (id: number) => {
      const index = reels.findIndex((r) => r.id === id);
      if (index >= 0) setStartIndex(index);
    },
    [reels],
  );
  const close = useCallback(() => setStartIndex(null), []);

  return (
    <ReelViewerContext value={{ open }}>
      {children}
      {startIndex !== null && <ReelViewer reels={reels} startIndex={startIndex} onClose={close} />}
    </ReelViewerContext>
  );
}

const control =
  "inline-flex size-12 items-center justify-center rounded-full bg-on-night/14 text-on-night backdrop-blur-md transition-[background-color,scale] duration-200 hover:bg-on-night/24 active:scale-[0.94]";

function ReelViewer({ reels, startIndex, onClose }: { reels: Reel[]; startIndex: number; onClose: () => void }) {
  const { locale, t } = useSiteI18n();
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const videos = useRef(new Map<number, HTMLVideoElement>());
  const bars = useRef(new Map<number, HTMLSpanElement>());
  const [current, setCurrent] = useState(startIndex);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);

  // Jump to the tapped item before first paint, then fade the feed in.
  useLayoutEffect(() => {
    const el = scroller.current!;
    el.scrollTop = startIndex * el.clientHeight;
    if (window.matchMedia(MOTION_OK).matches) {
      gsap.fromTo(root.current, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.45 });
    }
  }, [startIndex]);

  // The phone's back gesture closes the feed instead of leaving the page.
  useEffect(() => {
    history.pushState({ reelViewer: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    document.documentElement.style.overflow = "hidden";
    root.current?.focus();
    return () => {
      window.removeEventListener("popstate", onPop);
      document.documentElement.style.overflow = "";
    };
  }, [onClose]);

  const close = useCallback(() => history.back(), []);

  const go = useCallback(
    (delta: number) => {
      const el = scroller.current!;
      const next = Math.min(reels.length - 1, Math.max(0, current + delta));
      el.scrollTo({ top: next * el.clientHeight, behavior: "smooth" });
    },
    [current, reels.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowDown") go(1);
      else if (e.key === "ArrowUp") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key.toLowerCase() === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, go]);

  // Whichever slide fills the viewport becomes the playing one.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setCurrent(Number((entry.target as HTMLElement).dataset.index));
            setPaused(false);
          }
        }
      },
      { root: scroller.current, threshold: 0.6 },
    );
    scroller.current!.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    videos.current.forEach((video, index) => {
      if (index !== current) {
        video.pause();
        return;
      }
      video.muted = muted;
      if (paused) {
        video.pause();
        return;
      }
      // Browsers refuse sound without a fresh tap; fall back to muted playback.
      video.play().catch(() => {
        video.muted = true;
        setMuted(true);
        video.play().catch(() => {});
      });
    });
  }, [current, muted, paused]);

  const active = reels[current];

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={active.caption}
      tabIndex={-1}
      className="fixed inset-0 z-(--z-viewer) bg-night text-on-night outline-none"
    >
      <div
        ref={scroller}
        className="no-scrollbar h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain"
      >
        {reels.map((reel, index) => {
          const near = Math.abs(index - current) <= 1;
          return (
            <section
              key={reel.id}
              data-index={index}
              className="flex h-dvh snap-start snap-always items-center justify-center md:py-6"
            >
              <div className="relative h-full w-full overflow-hidden bg-night md:aspect-[9/16] md:w-auto md:rounded-frame">
                {reel.kind === "photo" ? (
                  <Image src={reel.src} alt={reel.caption} fill sizes="(min-width: 768px) 60vh, 100vw" className="object-contain" />
                ) : near ? (
                  <video
                    ref={(el) => {
                      if (el) videos.current.set(index, el);
                      else videos.current.delete(index);
                    }}
                    src={reel.src}
                    poster={reel.poster ?? undefined}
                    playsInline
                    loop
                    preload={index === current ? "auto" : "metadata"}
                    onClick={() => setPaused((p) => !p)}
                    onTimeUpdate={(e) => {
                      const video = e.currentTarget;
                      const bar = bars.current.get(index);
                      if (bar && video.duration) bar.style.transform = `scaleX(${video.currentTime / video.duration})`;
                    }}
                    className="h-full w-full cursor-pointer object-cover"
                  />
                ) : reel.poster ? (
                  <Image src={reel.poster} alt="" fill sizes="(min-width: 768px) 60vh, 100vw" className="object-cover" />
                ) : null}

                {index === current && paused && reel.kind === "video" && (
                  <span className="pointer-events-none absolute inset-0 m-auto flex size-20 items-center justify-center rounded-full bg-night/50 backdrop-blur-sm">
                    <Play size={34} weight="fill" />
                  </span>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-night/85 via-night/35 to-transparent px-5 pt-28 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <div className="pointer-events-auto flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <p className="max-w-[26ch] text-[1.0625rem] leading-snug font-semibold text-balance">
                        {reel.caption}
                      </p>
                      <Link
                        href={`/${locale}/book`}
                        className="mt-4 inline-flex h-11 items-center rounded-full bg-on-night px-5 text-sm font-semibold text-night transition-[opacity,scale] duration-200 hover:opacity-90 active:scale-[0.97]"
                      >
                        {t.viewer.book}
                      </Link>
                    </div>
                    <div className="grid shrink-0 gap-3">
                      {reel.kind === "video" && (
                        <button
                          type="button"
                          onClick={() => setMuted((m) => !m)}
                          aria-label={muted ? t.viewer.soundOn : t.viewer.soundOff}
                          className={control}
                        >
                          {muted ? <SpeakerSlash size={22} /> : <SpeakerHigh size={22} />}
                        </button>
                      )}
                      {reel.instagramUrl && (
                        <a
                          href={reel.instagramUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={t.viewer.instagram}
                          className={control}
                        >
                          <InstagramLogo size={22} />
                        </a>
                      )}
                    </div>
                  </div>
                  {reel.kind === "video" && (
                    <span className="mt-5 block h-0.5 overflow-hidden rounded-full bg-on-night/25">
                      <span
                        ref={(el) => {
                          if (el) bars.current.set(index, el);
                          else bars.current.delete(index);
                        }}
                        className="block h-full origin-left scale-x-0 bg-on-night"
                      />
                    </span>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-6">
        <button type="button" onClick={close} aria-label={t.viewer.close} className={cn(control, "pointer-events-auto")}>
          <X size={22} weight="bold" />
        </button>
        <p className="tnum rounded-full bg-on-night/14 px-3.5 py-2 text-sm font-semibold backdrop-blur-md">
          {fmt(t.viewer.counter, { n: current + 1, total: reels.length })}
        </p>
      </div>

      <div className="absolute top-1/2 right-6 hidden -translate-y-1/2 gap-3 md:grid">
        <button type="button" onClick={() => go(-1)} disabled={current === 0} aria-label={t.viewer.prev} className={cn(control, "disabled:opacity-30")}>
          <CaretUp size={22} weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={current === reels.length - 1}
          aria-label={t.viewer.next}
          className={cn(control, "disabled:opacity-30")}
        >
          <CaretDown size={22} weight="bold" />
        </button>
      </div>
    </div>
  );
}
