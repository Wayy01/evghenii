"use client";
import { useRef, useState, useTransition, type FormEvent } from "react";
import Image from "next/image";
import { ArrowClockwise, ArrowsDownUp, UploadSimple, X } from "@phosphor-icons/react";
import { Empty } from "@/components/admin/ui";
import { Reveal } from "@/components/motion/reveal";
import { Button, buttonClass, IconButton } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useAdminI18n } from "@/i18n/client";
import { fmt, tr } from "@/i18n/config";
import { createMedia, deleteMedia, updateMedia } from "@/lib/admin/actions";
import { cn } from "@/lib/cn";
import { createPhoto, setMediaDate } from "./actions";
import { ConfirmDelete } from "./confirm-delete";
import { SaveStatus, Switch } from "./controls";
import { MediaOrder } from "./media-order";
import {
  IMAGE_TYPES,
  inspectImage,
  inspectVideo,
  MAX_UPLOAD_BYTES,
  MEDIA_ACCEPT,
  toUploadError,
  uploadFile,
  VIDEO_TYPES,
  type UploadError,
} from "./upload";

export type MediaItem = {
  id: number;
  kind: "video" | "photo";
  src: string;
  poster: string | null;
  captionRo: string;
  captionRu: string;
  instagramUrl: string | null;
  featured: boolean;
  published: boolean;
  durationS: number | null;
  /** Salon-local day the piece is filed under, `YYYY-MM-DD`. */
  date: string;
};

type Filter = "all" | "published" | "hidden" | "featured";
const filters: Filter[] = ["all", "published", "hidden", "featured"];

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function MediaManager({ media: stored }: { media: MediaItem[] }) {
  const { t } = useAdminI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const [arranging, setArranging] = useState(false);
  // The order just saved, shown at once instead of waiting for the server list to come back.
  // Anything not in it is a newer upload, which the site also puts first.
  const [savedOrder, setSavedOrder] = useState<number[] | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const media = savedOrder
    ? [
        ...stored.filter((m) => !savedOrder.includes(m.id)),
        ...savedOrder.flatMap((id) => stored.find((m) => m.id === id) ?? []),
      ]
    : stored;
  // `targetId` stays set while the sheet slides out, so its content does not vanish mid-animation.
  const [targetId, setTargetId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const target = media.find((m) => m.id === targetId) ?? null;

  const edit = (id: number) => {
    setJustSaved(false);
    setTargetId(id);
    setOpen(true);
  };

  const counts: Record<Filter, number> = {
    all: media.length,
    published: media.filter((m) => m.published).length,
    hidden: media.filter((m) => !m.published).length,
    featured: media.filter((m) => m.featured).length,
  };
  const list = media.filter((m) =>
    filter === "published"
      ? m.published
      : filter === "hidden"
        ? !m.published
        : filter === "featured"
          ? m.featured
          : true,
  );

  if (arranging) {
    return (
      <MediaOrder
        media={media}
        onCancel={() => setArranging(false)}
        onSaved={(ids) => {
          setSavedOrder(ids);
          setJustSaved(true);
          setArranging(false);
        }}
      />
    );
  }

  return (
    <div className="grid gap-7">
      <Uploader onAdded={edit} />

      {media.length === 0 ? (
        <Empty title={t.content.mediaEmpty} body={t.content.mediaEmptyBody} />
      ) : (
        <>
          <div className="grid min-w-0 gap-3 md:flex md:items-center md:justify-between md:gap-4">
            <div className="no-scrollbar -mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
              {filters.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => {
                    setJustSaved(false);
                    setFilter(key);
                  }}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-200",
                    filter === key ? "border-fg bg-fg text-bg" : "border-line-strong text-fg hover:border-fg",
                  )}
                >
                  {t.content.filters[key]}
                  <span className={cn("tnum font-normal", filter === key ? "opacity-70" : "text-muted")}>
                    {counts[key]}
                  </span>
                </button>
              ))}
            </div>
            {filter === "all" && media.length > 1 && (
              <Button variant="outline" size="sm" className="h-10 w-fit" onClick={() => setArranging(true)}>
                <ArrowsDownUp size={18} />
                {t.content.arrange}
              </Button>
            )}
          </div>
          {justSaved && (
            <p role="status" className="-mt-3 text-sm text-muted">
              {t.content.orderSaved}
            </p>
          )}

          {list.length === 0 ? (
            <p className="py-10 text-center text-[0.9375rem] text-muted">{t.content.filterEmpty}</p>
          ) : (
            <Reveal
              stagger={0.035}
              y={18}
              className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            >
              {list.map((item) => (
                <MediaTile key={item.id} item={item} onEdit={() => edit(item.id)} />
              ))}
            </Reveal>
          )}
        </>
      )}

      <Sheet
        open={open && target !== null}
        onClose={() => setOpen(false)}
        title={target?.kind === "photo" ? t.content.editPhoto : t.content.editVideo}
        closeLabel={t.common.close}
      >
        {target && <MediaForm key={target.id} item={target} onDone={() => setOpen(false)} />}
      </Sheet>
    </div>
  );
}

function MediaTile({ item, onEdit }: { item: MediaItem; onEdit: () => void }) {
  const { locale, t } = useAdminI18n();
  const caption = tr(locale, item.captionRo, item.captionRu);
  const still = item.kind === "photo" ? item.src : item.poster;

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${t.common.edit}: ${caption || t.content.noCaption}`}
        className="group block w-full text-left"
      >
        <span className="relative block aspect-[9/16] overflow-hidden rounded-frame bg-sunken">
          {still ? (
            <Image
              src={still}
              alt=""
              fill
              sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 640px) 30vw, 46vw"
              className={cn(
                "object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]",
                !item.published && "opacity-45 grayscale",
              )}
            />
          ) : (
            // Videos without a cover show their first frame.
            <video
              src={`${item.src}#t=0.1`}
              muted
              playsInline
              preload="metadata"
              className={cn("size-full object-cover", !item.published && "opacity-45 grayscale")}
            />
          )}
        </span>
        <span className={cn("mt-3 line-clamp-2 block text-sm leading-snug font-medium", !caption && "text-faint")}>
          {caption || t.content.noCaption}
        </span>
        <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-semibold">
          {item.featured && <span className="text-accent-text">{t.content.featured}</span>}
          {!item.published && <span className="text-muted">{t.content.hidden}</span>}
          {item.kind === "photo" ? (
            <span className="text-muted">{t.content.photo}</span>
          ) : item.durationS != null ? (
            <span className="tnum font-normal text-muted">{formatDuration(item.durationS)}</span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

function MediaForm({ item, onDone }: { item: MediaItem; onDone: () => void }) {
  const { t } = useAdminI18n();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setError(null);
      const result = await updateMedia(item.id, {
        captionRo: String(formData.get("captionRo") ?? ""),
        captionRu: String(formData.get("captionRu") ?? ""),
        instagramUrl: String(formData.get("instagramUrl") ?? "").trim(),
        published: formData.get("published") === "on",
        featured: formData.get("featured") === "on",
      });
      if (!result.ok) {
        setError(result.error === "invalid" ? t.content.invalid : t.common.error);
        return;
      }
      const date = String(formData.get("date") ?? "");
      if (date && date !== item.date) await setMediaDate(item.id, date);
      onDone();
    });
  };

  const remove = () =>
    startTransition(async () => {
      const result = await deleteMedia(item.id);
      if (result.ok) onDone();
      else setError(t.common.error);
    });

  return (
    <form onSubmit={save} className="grid gap-6">
      <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-5">
        <div className="overflow-hidden rounded-frame bg-night">
          {item.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element -- full-size preview of an upload, any aspect ratio
            <img src={item.src} alt="" className="block w-full" />
          ) : (
            <video
              src={item.src}
              poster={item.poster ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="block aspect-[9/16] w-full object-cover"
            />
          )}
        </div>
        <div className="divide-y divide-line">
          <Switch
            name="published"
            label={t.content.published}
            hint={t.content.publishedHint}
            defaultChecked={item.published}
            className="pb-3"
          />
          <Switch
            name="featured"
            label={t.content.featured}
            hint={t.content.featuredHint}
            defaultChecked={item.featured}
            className="pt-3"
          />
        </div>
      </div>

      <div className="grid gap-4">
        <Field label={t.content.captionRo} htmlFor="media-caption-ro" hint={t.content.captionHint}>
          <Textarea
            id="media-caption-ro"
            name="captionRo"
            lang="ro"
            rows={2}
            maxLength={300}
            defaultValue={item.captionRo}
            className="min-h-20!"
          />
        </Field>
        <Field label={t.content.captionRu} htmlFor="media-caption-ru">
          <Textarea
            id="media-caption-ru"
            name="captionRu"
            lang="ru"
            rows={2}
            maxLength={300}
            defaultValue={item.captionRu}
            className="min-h-20!"
          />
        </Field>
      </div>

      <div className="grid gap-4">
        <Field
          label={t.content.instagram}
          htmlFor="media-instagram"
          optional={t.common.optional}
          hint={t.content.instagramHint}
        >
          <Input
            id="media-instagram"
            name="instagramUrl"
            type="url"
            inputMode="url"
            placeholder="https://www.instagram.com/reel/"
            defaultValue={item.instagramUrl ?? ""}
          />
        </Field>
        <Field label={t.content.date} htmlFor="media-date" hint={t.content.dateHint}>
          <Input id="media-date" name="date" type="date" defaultValue={item.date} className="tnum" />
        </Field>
      </div>

      <ConfirmDelete question={t.content.deleteConfirm} onConfirm={remove} pending={pending} />

      <div className="sticky -bottom-5 -mx-5 -mb-5 flex items-center justify-between gap-4 border-t border-line bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SaveStatus
          pending={pending}
          ok={false}
          error={error}
          labels={{ saving: t.common.saving, saved: t.common.saved }}
        />
        <Button type="submit" disabled={pending} className="min-w-36">
          {t.common.save}
        </Button>
      </div>
    </form>
  );
}

type Job = {
  key: number;
  file: File;
  status: "preparing" | "uploading" | "adding" | "failed";
  progress: number;
  error?: UploadError;
};

/** Pick or drop files; each one is measured, sent with live progress and added to the site. */
function Uploader({ onAdded }: { onAdded: (id: number) => void }) {
  const { t } = useAdminI18n();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [over, setOver] = useState(false);
  const nextKey = useRef(1);

  const patch = (key: number, change: Partial<Job>) =>
    setJobs((list) => list.map((job) => (job.key === key ? { ...job, ...change } : job)));
  const drop = (key: number) => setJobs((list) => list.filter((job) => job.key !== key));

  /** Returns the new media id, or null when this file failed. */
  async function run(key: number, file: File): Promise<number | null> {
    try {
      const isVideo = VIDEO_TYPES.includes(file.type);
      if (!isVideo && !IMAGE_TYPES.includes(file.type)) throw new Error("unsupported");
      if (file.size > MAX_UPLOAD_BYTES) throw new Error("tooLarge");
      patch(key, { status: "preparing", progress: 0, error: undefined });

      let result;
      if (isVideo) {
        const info = await inspectVideo(file);
        patch(key, { status: "uploading" });
        const src = await uploadFile(file, (fraction) => patch(key, { progress: fraction }));
        // A missing cover is not worth failing the upload for; the tile falls back to the first frame.
        const poster = info.poster ? await uploadFile(info.poster).catch(() => null) : null;
        patch(key, { status: "adding", progress: 1 });
        result = await createMedia({
          src,
          poster,
          width: info.width,
          height: info.height,
          durationS: Math.round(info.duration),
        });
      } else {
        const info = await inspectImage(file);
        patch(key, { status: "uploading" });
        const src = await uploadFile(file, (fraction) => patch(key, { progress: fraction }));
        patch(key, { status: "adding", progress: 1 });
        result = await createPhoto({
          src,
          width: info.width,
          height: info.height,
        });
      }
      if (!result.ok || !result.id) throw new Error("failed");
      drop(key);
      return result.id;
    } catch (error) {
      patch(key, { status: "failed", error: toUploadError(error) });
      return null;
    }
  }

  async function add(files: File[]) {
    if (files.length === 0) return;
    const batch = files.map((file) => ({ key: nextKey.current++, file }));
    setJobs((list) => [
      ...list,
      ...batch.map(({ key, file }) => ({
        key,
        file,
        status: "preparing" as const,
        progress: 0,
      })),
    ]);
    // One at a time: a phone's uplink is better spent on a single file.
    let last: number | null = null;
    for (const { key, file } of batch) last = (await run(key, file)) ?? last;
    // A single upload goes straight to its caption form.
    if (batch.length === 1 && last !== null) onAdded(last);
  }

  const retry = async (job: Job) => {
    const id = await run(job.key, job.file);
    if (id !== null) onAdded(id);
  };

  const statusText = (job: Job) =>
    job.status === "failed"
      ? job.error === "unsupported"
        ? t.content.unsupported
        : job.error === "tooLarge"
          ? t.content.tooLarge
          : t.content.uploadFailed
      : job.status === "preparing"
        ? t.content.preparing
        : job.status === "adding"
          ? t.content.adding
          : fmt(t.content.uploading, { p: Math.round(job.progress * 100) });

  return (
    <div className="grid gap-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void add(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "grid cursor-pointer items-center gap-x-5 gap-y-4 rounded-frame border border-dashed p-5 transition-colors duration-200 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-6",
          over ? "border-accent bg-accent-soft" : "border-line-strong bg-surface hover:border-fg/60",
        )}
      >
        <span className="hidden size-14 items-center justify-center rounded-full bg-fg/7 sm:inline-flex">
          <UploadSimple size={24} />
        </span>
        <span className="min-w-0">
          <span className="block text-[1.0625rem] font-semibold">{over ? t.content.dropNow : t.content.upload}</span>
          <span className="mt-1 block max-w-[62ch] text-sm text-muted">{t.content.uploadHint}</span>
        </span>
        <span className={buttonClass({ variant: "accent" }, "w-full sm:w-auto")}>
          <UploadSimple size={18} weight="bold" className="sm:hidden" />
          <span className="first-letter:uppercase">{t.content.choose}</span>
        </span>
        <input
          type="file"
          accept={MEDIA_ACCEPT}
          multiple
          className="sr-only"
          onChange={(e) => {
            void add(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>

      {jobs.length > 0 && (
        <ul aria-live="polite" className="divide-y divide-line rounded-frame border border-line bg-surface">
          {jobs.map((job) => (
            <li key={job.key} className="grid gap-2.5 px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold">{job.file.name}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <p className={cn("tnum text-sm", job.status === "failed" ? "text-danger" : "text-muted")}>
                    {statusText(job)}
                  </p>
                  {job.status === "failed" && (
                    <>
                      {job.error === "failed" && (
                        <IconButton label={t.content.retry} onClick={() => void retry(job)} className="-my-2">
                          <ArrowClockwise size={18} />
                        </IconButton>
                      )}
                      <IconButton label={t.content.dismiss} onClick={() => drop(job.key)} className="-my-2 -mr-2">
                        <X size={18} />
                      </IconButton>
                    </>
                  )}
                </div>
              </div>
              {job.status !== "failed" && (
                <span className="block h-1 overflow-hidden rounded-full bg-fg/10">
                  <span
                    className={cn(
                      "block h-full origin-left rounded-full bg-accent transition-transform duration-300 ease-out",
                      job.status === "preparing" && "animate-pulse",
                    )}
                    style={{
                      transform: `scaleX(${job.status === "preparing" ? 0.04 : Math.max(0.04, job.progress)})`,
                    }}
                  />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
