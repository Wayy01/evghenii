"use client";
import { useState } from "react";
import Image from "next/image";
import { Play } from "@phosphor-icons/react";
import { fmt } from "@/i18n/config";
import { useSiteI18n } from "@/i18n/client";
import { formatDuration, type Reel } from "@/lib/reels";
import { cn } from "@/lib/cn";
import { useReelViewer } from "./reel-viewer";

/**
 * Portrait tile for one video or photo. Hovering with a mouse previews the
 * footage silently; a click or tap opens the full-screen feed with sound.
 */
export function ReelCard({
  reel,
  sizes = "(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 62vw",
  priority,
  className,
}: {
  reel: Reel;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const { t } = useSiteI18n();
  const { open } = useReelViewer();
  const [preview, setPreview] = useState(false);
  const isVideo = reel.kind === "video";
  const still = isVideo ? reel.poster : reel.src;

  return (
    <button
      type="button"
      onClick={() => open(reel.id)}
      onPointerEnter={(e) => e.pointerType === "mouse" && isVideo && setPreview(true)}
      onPointerLeave={() => setPreview(false)}
      aria-label={fmt(isVideo ? t.work.play : t.work.open, { title: reel.caption })}
      className={cn("group block w-full text-left", className)}
    >
      <span className="relative block aspect-[9/16] overflow-hidden rounded-frame bg-sunken">
        {still ? (
          <Image
            src={still}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
          />
        ) : (
          // Uploads without a poster show their first frame instead.
          <video src={`${reel.src}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
        )}
        {preview && (
          <video src={reel.src} muted loop playsInline autoPlay className="absolute inset-0 size-full object-cover" />
        )}
        {isVideo && (
          <span className="absolute bottom-3 left-3 inline-flex size-10 items-center justify-center rounded-full bg-night/55 text-on-night backdrop-blur-md transition-[background-color,scale] duration-300 ease-out-expo group-hover:scale-110 group-hover:bg-accent">
            <Play size={16} weight="fill" />
          </span>
        )}
      </span>
      <span className="mt-3 flex items-start justify-between gap-3">
        <span className="text-[0.9375rem] leading-snug font-medium text-pretty">{reel.caption}</span>
        {isVideo && reel.duration != null && (
          <span className="tnum shrink-0 pt-px text-sm text-muted">{formatDuration(reel.duration)}</span>
        )}
      </span>
    </button>
  );
}
