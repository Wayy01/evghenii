"use client";
import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Check, FilmStrip, ImageSquare, Prohibit, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useAdminI18n } from "@/i18n/client";
import type { MediaOption } from "@/lib/admin/cms-queries";
import { IMAGE_TYPES, toUploadError, uploadFile } from "@/components/admin/manage/upload";
import { cn } from "@/lib/cn";

const tile =
  "group relative block w-full overflow-hidden rounded-frame bg-sunken outline-offset-2 transition-[box-shadow] duration-150";
const chosenRing = "shadow-[0_0_0_3px_var(--accent)]";

function Chosen() {
  return (
    <span className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full bg-accent text-on-accent">
      <Check size={16} weight="bold" />
    </span>
  );
}

/** The row every picker shows on the page: thumbnail, what is chosen, and the button that opens the library. */
function PickerRow({
  label,
  hint,
  thumb,
  portrait,
  title,
  empty,
  onOpen,
}: {
  label: string;
  hint?: string;
  thumb: ReactNode;
  portrait?: boolean;
  title: string;
  empty: boolean;
  onOpen: () => void;
}) {
  const { t } = useAdminI18n();
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "relative flex w-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-sunken text-faint",
            portrait ? "aspect-[9/16]" : "aspect-[4/5]",
          )}
        >
          {thumb}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("line-clamp-2 text-[0.9375rem] leading-snug", empty ? "text-muted" : "font-medium")}>
            {title}
          </p>
          <Button variant="soft" size="sm" className="mt-2.5" onClick={onOpen}>
            {empty ? t.site.picker.choose : t.site.picker.change}
          </Button>
        </div>
      </div>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

function NoneTile({ label, chosen, onClick, portrait }: { label: string; chosen: boolean; onClick: () => void; portrait?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={chosen}
      className={cn(
        tile,
        portrait ? "aspect-[9/16]" : "aspect-[4/5]",
        "flex flex-col items-center justify-center gap-2 border border-dashed border-line-strong bg-transparent px-2 text-center text-sm font-semibold text-muted hover:text-fg",
        chosen && chosenRing,
      )}
    >
      <Prohibit size={22} />
      {label}
      {chosen ? <Chosen /> : null}
    </button>
  );
}

/** Chooses one video from the library by id. */
export function VideoPicker({
  value,
  onChange,
  options,
  label,
  hint,
  allowNone,
  noneLabel,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  options: MediaOption[];
  label: string;
  hint?: string;
  allowNone?: boolean;
  /** What "nothing chosen" means here, when it has a meaning of its own. */
  noneLabel?: string;
}) {
  const { t } = useAdminI18n();
  const [open, setOpen] = useState(false);
  const videos = options.filter((o) => o.kind === "video");
  const current = videos.find((o) => o.id === value) ?? null;
  const none = noneLabel ?? t.site.picker.noVideo;

  const choose = (id: number | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <PickerRow
        label={label}
        hint={hint}
        portrait
        empty={!current}
        title={current ? current.caption || t.site.picker.untitled : none}
        onOpen={() => setOpen(true)}
        thumb={
          current?.poster ? (
            <Image src={current.poster} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <FilmStrip size={22} />
          )
        }
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={t.site.picker.videoTitle} closeLabel={t.common.close}>
        {videos.length === 0 && !allowNone ? (
          <p className="py-10 text-center text-[0.9375rem] text-muted">{t.site.picker.empty}</p>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-5">
            {allowNone ? (
              <div>
                <NoneTile label={t.site.picker.none} chosen={value == null} onClick={() => choose(null)} portrait />
              </div>
            ) : null}
            {videos.map((video) => (
              <div key={video.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => choose(video.id)}
                  aria-pressed={video.id === value}
                  aria-label={video.caption || t.site.picker.untitled}
                  className={cn(tile, "aspect-[9/16]", video.id === value && chosenRing)}
                >
                  {video.poster ? (
                    <Image
                      src={video.poster}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 140px, 30vw"
                      className={cn("object-cover", !video.published && "opacity-45 grayscale")}
                    />
                  ) : (
                    <video src={`${video.src}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
                  )}
                  {video.id === value ? <Chosen /> : null}
                </button>
                <p className="mt-2 line-clamp-2 text-xs leading-snug">{video.caption || t.site.picker.untitled}</p>
                {!video.published ? <p className="mt-0.5 text-xs text-muted">{t.site.picker.hidden}</p> : null}
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}

/** Chooses one image: any photo or video cover from the library, or a new upload. */
export function ImagePicker({
  value,
  onChange,
  options,
  label,
  hint,
  allowNone,
}: {
  value: string | null;
  onChange: (src: string | null) => void;
  options: MediaOption[];
  label: string;
  hint?: string;
  allowNone?: boolean;
}) {
  const { t } = useAdminI18n();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const library = options.flatMap((o) => {
    const src = o.kind === "photo" ? o.src : o.poster;
    return src ? [{ src, caption: o.caption }] : [];
  });
  const images = library.filter((image, i) => library.findIndex((other) => other.src === image.src) === i);
  // An uploaded picture is not part of the library, but it must stay visible as the current choice.
  const current = images.find((image) => image.src === value) ?? (value ? { src: value, caption: t.site.picker.custom } : null);
  const tiles = current && !images.some((image) => image.src === current.src) ? [current, ...images] : images;

  const choose = (src: string | null) => {
    onChange(src);
    setOpen(false);
  };

  const upload = async (picked: File | undefined) => {
    if (!picked) return;
    setError(null);
    if (!IMAGE_TYPES.includes(picked.type)) {
      setError(t.site.picker.unsupported);
      return;
    }
    setUploading(0);
    try {
      choose(await uploadFile(picked, setUploading));
    } catch (e) {
      setError(toUploadError(e) === "unsupported" ? t.site.picker.unsupported : t.site.picker.uploadFailed);
    } finally {
      setUploading(null);
      if (file.current) file.current.value = "";
    }
  };

  return (
    <>
      <PickerRow
        label={label}
        hint={hint}
        empty={!current}
        title={current ? current.caption || t.site.picker.untitled : t.site.picker.noImage}
        onOpen={() => setOpen(true)}
        thumb={
          current ? (
            <Image src={current.src} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <ImageSquare size={22} />
          )
        }
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={t.site.picker.imageTitle} closeLabel={t.common.close}>
        <input
          ref={file}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <Button
          variant="outline"
          className="w-full"
          disabled={uploading != null}
          onClick={() => file.current?.click()}
        >
          <UploadSimple size={18} />
          {uploading != null ? `${t.site.picker.uploading} ${Math.round(uploading * 100)}%` : t.site.picker.upload}
        </Button>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {tiles.length === 0 && !allowNone ? (
          <p className="py-10 text-center text-[0.9375rem] text-muted">{t.site.picker.empty}</p>
        ) : (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {allowNone ? (
              <NoneTile label={t.site.picker.none} chosen={value == null} onClick={() => choose(null)} />
            ) : null}
            {tiles.map((image) => (
              <button
                key={image.src}
                type="button"
                onClick={() => choose(image.src)}
                aria-pressed={image.src === value}
                aria-label={image.caption || t.site.picker.untitled}
                title={image.caption || undefined}
                className={cn(tile, "aspect-[4/5]", image.src === value && chosenRing)}
              >
                <Image src={image.src} alt="" fill sizes="(min-width: 768px) 140px, 30vw" className="object-cover" />
                {image.src === value ? <Chosen /> : null}
              </button>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}
