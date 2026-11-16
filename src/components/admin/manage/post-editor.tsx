"use client";
import { useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ArrowUpRight, Check, ImageSquare, UploadSimple } from "@phosphor-icons/react";
import { Panel } from "@/components/admin/ui";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useAdminI18n } from "@/i18n/client";
import { fmt, locales, type Locale } from "@/i18n/config";
import { deletePost, savePost } from "@/lib/admin/actions";
import { cn } from "@/lib/cn";
import { ConfirmDelete } from "./confirm-delete";
import { SaveStatus, Segmented, Switch, TimeSelect } from "./controls";
import { MarkdownLite } from "./markdown-lite";
import { slugify } from "./slug";
import { IMAGE_TYPES, uploadFile } from "./upload";
import { useSubmit } from "./use-submit";

export type PostDraft = {
  id: number;
  slug: string;
  titleRo: string;
  titleRu: string;
  excerptRo: string;
  excerptRu: string;
  bodyRo: string;
  bodyRu: string;
  cover: string;
  videoId: number | null;
  published: boolean;
  publishedDate: string;
  publishedTime: string;
};

export type PickerMedia = { id: number; kind: "video" | "photo"; still: string | null; caption: string };

type Texts = Record<Locale, { title: string; excerpt: string; body: string }>;
const fieldSuffix: Record<Locale, "Ro" | "Ru"> = { ro: "Ro", ru: "Ru" };

export function PostEditor({ post, media }: { post: PostDraft | null; media: PickerMedia[] }) {
  const { locale, t } = useAdminI18n();
  // Next keeps the previous route mounted but hidden, so after "new" redirects to the saved
  // article two editors share the document; unique ids keep each label on its own field.
  const uid = useId();
  const { state, pending, onSubmit } = useSubmit((formData) => savePost(null, formData));
  const [deleting, startDeleting] = useTransition();
  const [lang, setLang] = useState<Locale>(locale);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [texts, setTexts] = useState<Texts>({
    ro: { title: post?.titleRo ?? "", excerpt: post?.excerptRo ?? "", body: post?.bodyRo ?? "" },
    ru: { title: post?.titleRu ?? "", excerpt: post?.excerptRu ?? "", body: post?.bodyRu ?? "" },
  });
  const [slug, setSlug] = useState(post?.slug ?? "");
  // A new article takes its URL id from the Romanian title until the field is edited by hand.
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [cover, setCover] = useState(post?.cover ?? "");
  const [videoId, setVideoId] = useState<number | null>(post?.videoId ?? null);
  const [published, setPublished] = useState(post?.published ?? false);

  const setText = (l: Locale, key: keyof Texts[Locale], value: string) => {
    setTexts((current) => ({ ...current, [l]: { ...current[l], [key]: value } }));
    if (l === "ro" && key === "title" && !slugTouched) setSlug(slugify(value));
  };

  const error =
    state && !state.ok
      ? state.error === "slugTaken"
        ? t.post.slugTaken
        : state.error === "invalid"
          ? t.post.invalid
          : t.common.error
      : null;

  const words = texts[lang].body.trim() ? texts[lang].body.trim().split(/\s+/).length : 0;
  // The stored choice leads each picker row, so it is visible without scrolling.
  const [initial] = useState({ cover, videoId });
  const stills = media
    .filter((m): m is PickerMedia & { still: string } => m.still !== null)
    .sort((a, b) => Number(b.still === initial.cover) - Number(a.still === initial.cover));
  const videos = media
    .filter((m) => m.kind === "video")
    .sort((a, b) => Number(b.id === initial.videoId) - Number(a.id === initial.videoId));
  const customCover = cover && !stills.some((m) => m.still === cover) ? cover : null;

  return (
    <form onSubmit={onSubmit} className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {post && <input type="hidden" name="id" value={post.id} />}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="cover" value={cover} />
      <input type="hidden" name="videoId" value={videoId ?? ""} />

      <div className="grid content-start gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label={t.post.language}
            value={lang}
            onChange={setLang}
            options={locales.map((l) => ({
              value: l,
              label: (
                <>
                  {t.common[l]}
                  {!texts[l].title.trim() && <span className="sr-only">: {t.post.invalid}</span>}
                  {!texts[l].title.trim() && <span aria-hidden className="size-1.5 rounded-full bg-warn" />}
                </>
              ),
            }))}
          />
          <Segmented
            label={t.post.preview}
            value={mode}
            onChange={setMode}
            options={[
              { value: "write", label: t.post.write },
              { value: "preview", label: t.post.preview },
            ]}
          />
        </div>

        {locales.map((l) => {
          const suffix = fieldSuffix[l];
          const text = texts[l];
          return (
            <div key={l} lang={l} hidden={l !== lang} className="grid gap-5">
              <div className={cn("grid gap-5", mode === "preview" && "hidden")}>
                <Field label={t.post.title} htmlFor={`${uid}-title-${l}`}>
                  <Input
                    id={`${uid}-title-${l}`}
                    name={`title${suffix}`}
                    maxLength={200}
                    value={text.title}
                    onChange={(e) => setText(l, "title", e.target.value)}
                    className="h-14 text-xl font-semibold"
                  />
                </Field>
                <Field label={t.post.excerpt} htmlFor={`${uid}-excerpt-${l}`}>
                  <Textarea
                    id={`${uid}-excerpt-${l}`}
                    name={`excerpt${suffix}`}
                    rows={2}
                    maxLength={400}
                    value={text.excerpt}
                    onChange={(e) => setText(l, "excerpt", e.target.value)}
                    className="min-h-20!"
                  />
                </Field>
                <Field label={t.post.body} htmlFor={`${uid}-body-${l}`} hint={t.post.bodyHint}>
                  <Textarea
                    id={`${uid}-body-${l}`}
                    name={`body${suffix}`}
                    value={text.body}
                    onChange={(e) => setText(l, "body", e.target.value)}
                    className="min-h-[26rem] text-[1.0625rem] leading-[1.7] lg:min-h-[34rem]"
                  />
                </Field>
                <p className="tnum -mt-3 text-right text-sm text-muted">{fmt(t.post.words, { n: words })}</p>
              </div>

              {mode === "preview" && (
                <article className="rounded-frame border border-line bg-surface px-5 py-7 sm:px-9 sm:py-10">
                  {text.title.trim() || text.body.trim() ? (
                    <>
                      <h1 className="display text-[clamp(2.25rem,6vw,3.5rem)]">{text.title}</h1>
                      {text.excerpt && <p className="mt-4 text-lg text-muted">{text.excerpt}</p>}
                      <div className="mt-8">
                        <MarkdownLite text={text.body} />
                      </div>
                    </>
                  ) : (
                    <p className="py-16 text-center text-[0.9375rem] text-muted">{t.post.emptyPreview}</p>
                  )}
                </article>
              )}
            </div>
          );
        })}
      </div>

      <aside className="grid content-start gap-5">
        <Panel title={t.post.settings}>
          <div className="grid gap-5">
            <Switch
              name="published"
              label={t.post.published}
              hint={t.post.publishedHint}
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            <div className="grid grid-cols-[minmax(0,1fr)_6.25rem] gap-2.5">
              <Field label={t.post.publishedAt} htmlFor={`${uid}-date`}>
                <Input
                  id={`${uid}-date`}
                  name="publishedDate"
                  type="date"
                  defaultValue={post?.publishedDate}
                  className="tnum min-w-0 px-3"
                />
              </Field>
              <Field label={t.post.publishedTime} htmlFor={`${uid}-time`}>
                <TimeSelect
                  id={`${uid}-time`}
                  name="publishedTime"
                  allowEmpty
                  defaultValue={post?.publishedTime ?? ""}
                  className="[&>select]:h-12"
                />
              </Field>
              <p className="col-span-2 -mt-1 text-sm text-muted">{t.post.dateHint}</p>
            </div>
            <Field label={t.post.slug} htmlFor={`${uid}-slug`} hint={t.post.slugHint}>
              <Input
                id={`${uid}-slug`}
                name="slug"
                autoCapitalize="none"
                spellCheck={false}
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
              />
            </Field>
          </div>
        </Panel>

        <Panel title={t.post.media}>
          <div className="grid gap-6">
            <div className="grid gap-2.5">
              <p className="text-sm font-semibold">{t.post.cover}</p>
              <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
                <PickTile selected={!cover} onSelect={() => setCover("")} label={t.post.coverNone}>
                  <ImageSquare size={22} className="text-faint" />
                </PickTile>
                {customCover && (
                  <PickTile selected onSelect={() => setCover(customCover)} label={t.post.cover} image={customCover} />
                )}
                {stills.map((m) => (
                  <PickTile
                    key={m.id}
                    selected={cover === m.still}
                    onSelect={() => setCover(m.still)}
                    label={m.caption || t.post.cover}
                    image={m.still}
                  />
                ))}
              </div>
              <CoverUpload onUploaded={setCover} />
              <p className="text-sm text-muted">{t.post.coverHint}</p>
            </div>

            <div className="grid gap-2.5 border-t border-line pt-5">
              <p className="text-sm font-semibold">{t.post.video}</p>
              <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1">
                <PickTile selected={videoId === null} onSelect={() => setVideoId(null)} label={t.post.noVideo}>
                  <span className="px-1 text-center text-xs leading-tight font-semibold text-muted">
                    {t.post.noVideo}
                  </span>
                </PickTile>
                {videos.map((m) => (
                  <PickTile
                    key={m.id}
                    selected={videoId === m.id}
                    onSelect={() => setVideoId(m.id)}
                    label={m.caption || t.post.video}
                    image={m.still}
                  />
                ))}
              </div>
              <p className="text-sm text-muted">{t.post.videoHint}</p>
            </div>
          </div>
        </Panel>
      </aside>

      {/* Sticks above the phone tab bar so saving is always one tap away. */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 col-span-full flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[28px] border border-line bg-surface/95 py-2 pr-2 pl-5 shadow-[0_10px_40px_rgb(0_0_0/0.14)] backdrop-blur-md lg:bottom-5">
        <SaveStatus
          pending={pending}
          ok={Boolean(state?.ok)}
          error={error}
          labels={{ saving: t.common.saving, saved: t.common.saved }}
          className="flex-1"
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {post && (
            <ConfirmDelete
              question={t.post.deleteConfirm}
              pending={pending || deleting}
              onConfirm={() =>
                startDeleting(async () => {
                  const formData = new FormData();
                  formData.set("id", String(post.id));
                  formData.set("locale", locale);
                  await deletePost(formData);
                })
              }
            />
          )}
          {post?.published && (
            <a
              href={`/${locale}/blog/${post.slug}`}
              target="_blank"
              rel="noreferrer"
              className={buttonClass({ variant: "soft" }, "hidden sm:inline-flex")}
            >
              {t.post.view}
              <ArrowUpRight size={16} weight="bold" />
            </a>
          )}
          <Button type="submit" disabled={pending} className="min-w-32">
            {t.common.save}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** One choice in a horizontal picker: a small portrait thumbnail with a selected state. */
function PickTile({
  selected,
  onSelect,
  label,
  image,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  image?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={cn(
        "relative flex aspect-[9/16] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-field bg-sunken outline-2 outline-offset-2 transition-[outline-color,opacity] duration-200",
        selected ? "outline-accent" : "outline-transparent hover:opacity-80",
      )}
    >
      {image ? <Image src={image} alt="" fill sizes="72px" className="object-cover" /> : children}
      {selected && (
        <span className="absolute right-1 bottom-1 inline-flex size-5 items-center justify-center rounded-full bg-accent text-on-accent">
          <Check size={12} weight="bold" />
        </span>
      )}
    </button>
  );
}

function CoverUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const { t } = useAdminI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setFailed(false);
    try {
      if (!IMAGE_TYPES.includes(file.type)) throw new Error("unsupported");
      onUploaded(await uploadFile(file));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
        <UploadSimple size={16} weight="bold" />
        {busy ? t.common.saving : t.post.coverUpload}
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {t.content.uploadFailed}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
