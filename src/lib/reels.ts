import type { Media } from "@/db/schema";
import { tr, type Locale } from "@/i18n/config";

/** Plain, serializable shape of a video or photo handed to client components. */
export type Reel = {
  id: number;
  kind: Media["kind"];
  src: string;
  poster: string | null;
  caption: string;
  instagramUrl: string | null;
  width: number;
  height: number;
  duration: number | null;
};

export const toReel = (m: Media, locale: Locale): Reel => ({
  id: m.id,
  kind: m.kind,
  src: m.src,
  poster: m.poster,
  caption: tr(locale, m.captionRo, m.captionRu),
  instagramUrl: m.instagramUrl,
  width: m.width,
  height: m.height,
  duration: m.durationS,
});

export const formatDuration = (s: number | null) =>
  s == null ? "" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
