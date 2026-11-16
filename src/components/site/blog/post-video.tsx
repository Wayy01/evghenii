"use client";
import { useRef, useState } from "react";
import { Play } from "@phosphor-icons/react";

/**
 * The reel an article is based on. It waits for a tap, then plays with sound
 * and hands over to the browser's own controls.
 */
export function PostVideo({ src, poster, label }: { src: string; poster: string | null; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-frame bg-night">
      <video
        ref={video}
        // Without a poster, seek a hair in so the first frame shows instead of black.
        src={poster ? src : `${src}#t=0.1`}
        poster={poster ?? undefined}
        controls={started}
        playsInline
        preload="metadata"
        className="size-full object-cover"
      />
      {!started && (
        <button
          type="button"
          onClick={() => {
            setStarted(true);
            video.current?.play().catch(() => {});
          }}
          className="group absolute inset-0 flex items-end bg-linear-to-t from-night/60 via-transparent to-transparent p-4 text-left"
        >
          <span className="inline-flex h-12 items-center gap-2.5 rounded-full bg-on-night pr-5 pl-4 text-sm font-semibold text-night transition-[background-color,color,scale] duration-300 ease-out-expo group-hover:bg-accent group-hover:text-on-accent group-active:scale-[0.97]">
            <Play size={16} weight="fill" />
            {label}
          </span>
        </button>
      )}
    </div>
  );
}
