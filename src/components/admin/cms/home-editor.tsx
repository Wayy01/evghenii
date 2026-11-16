"use client";
import { useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CaretDown, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useAdminI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { saveConfig, saveTexts } from "@/lib/admin/cms-actions";
import type { MediaOption } from "@/lib/admin/cms-queries";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import type { HomeConfig, HomePoint, HomeSectionId, Localized } from "@/lib/site-config";
import { cn } from "@/lib/cn";
import { BLOCK_TEXTS, type HomeTexts } from "./home-texts";
import { LocalizedField, SaveBar, Toggle, uid, useUnsavedWarning } from "./parts";
import { ImagePicker, VideoPicker } from "./pickers";
import { DragHandle, MoveButtons, moveItem, RemoveButton, SortableList } from "./sortable";

const MAX_ROWS = 8;

type Keyed<T> = T & { uid: string };
type Draft = Omit<HomeConfig, "about" | "feature"> & {
  about: { portrait: string | null; points: Keyed<HomePoint>[] };
  feature: { mediaId: number | null; steps: Keyed<Localized>[] };
};

// Rows that came from the server get ids from their position, so the first render matches on both sides.
const toDraft = (home: HomeConfig): Draft => ({
  ...home,
  about: { ...home.about, points: home.about.points.map((p, i) => ({ ...p, uid: `point-${i}` })) },
  feature: { ...home.feature, steps: home.feature.steps.map((s, i) => ({ ...s, uid: `step-${i}` })) },
});

const toConfig = (draft: Draft): HomeConfig => ({
  sections: draft.sections,
  hero: draft.hero,
  about: {
    portrait: draft.about.portrait,
    points: draft.about.points.map((p) => ({
      title: { ro: p.title.ro.trim(), ru: p.title.ru.trim() },
      body: { ro: p.body.ro.trim(), ru: p.body.ru.trim() },
      mediaId: p.mediaId,
    })),
  },
  feature: {
    mediaId: draft.feature.mediaId,
    steps: draft.feature.steps.map((s) => ({ ro: s.ro.trim(), ru: s.ru.trim() })),
  },
});

const valuesOf = (texts: HomeTexts) => Object.fromEntries(Object.entries(texts).map(([key, t]) => [key, t.value]));

export function HomeEditor({
  home,
  texts,
  media,
}: {
  home: HomeConfig;
  texts: HomeTexts;
  media: MediaOption[];
}) {
  const { locale, t } = useAdminI18n();
  const s = t.site;
  const admin = `/${locale}/admin`;

  const [draft, setDraft] = useState(() => toDraft(home));
  const [copy, setCopy] = useState<Record<string, Localized>>(() => valuesOf(texts));
  // What is stored right now; "dirty" and "discard" both measure against it.
  const [base, setBase] = useState(() => ({ config: toConfig(toDraft(home)), copy: valuesOf(texts) }));
  const [open, setOpen] = useState<HomeSectionId | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const config = toConfig(draft);
  const dirty = JSON.stringify(config) !== JSON.stringify(base.config) || JSON.stringify(copy) !== JSON.stringify(base.copy);
  useUnsavedWarning(dirty);

  const edit = (change: (draft: Draft) => Draft) => {
    setDraft(change);
    setSaved(false);
    setError(null);
  };
  const setText = (key: string, value: Localized) => {
    setCopy((c) => ({ ...c, [key]: value }));
    setSaved(false);
    setError(null);
  };

  const discard = () => {
    setDraft(toDraft(base.config));
    setCopy(base.copy);
    setInvalid([]);
    setError(null);
  };

  const save = () => {
    // A point needs at least a Romanian title, a line needs Romanian text.
    const missing = [
      ...draft.about.points.filter((p) => !p.title.ro.trim()).map((p) => p.uid),
      ...draft.feature.steps.filter((line) => !line.ro.trim()).map((line) => line.uid),
    ];
    setInvalid(missing);
    if (missing.length > 0) {
      setError(s.invalid);
      setOpen(draft.about.points.some((p) => missing.includes(p.uid)) ? "about" : "feature");
      return;
    }

    // An emptied field goes back to the built-in text.
    const nextCopy = Object.fromEntries(
      Object.entries(copy).map(([key, value]) => [
        key,
        { ro: value.ro.trim() || texts[key].defaults.ro, ru: value.ru.trim() || texts[key].defaults.ru },
      ]),
    );
    const edits = Object.entries(nextCopy).flatMap(([key, value]) =>
      (["ro", "ru"] as const)
        .filter((lang) => value[lang] !== base.copy[key][lang])
        .map((lang) => ({ locale: lang, key, value: value[lang] === texts[key].defaults[lang] ? null : value[lang] })),
    );

    startTransition(async () => {
      const results = await Promise.all([
        saveConfig("home", config),
        edits.length > 0 ? saveTexts(edits) : Promise.resolve({ ok: true as const }),
      ]);
      if (results.every((r) => r.ok)) {
        setCopy(nextCopy);
        setBase({ config, copy: nextCopy });
        setSaved(true);
        setError(null);
      } else {
        setError(results.some((r) => !r.ok && r.error === "invalid") ? s.invalid : t.common.error);
      }
    });
  };

  const textFields = (id: HomeSectionId) => (
    <div className="grid gap-4">
      {BLOCK_TEXTS[id].map((key) => {
        const kind = key.split(".").pop() as keyof typeof s.home.textLabels;
        return (
          <LocalizedField
            key={key}
            id={`text-${key.replace(".", "-")}`}
            label={s.home.textLabels[kind]}
            value={copy[key]}
            onChange={(value) => setText(key, value)}
            multiline={kind === "lead" || kind === "body" || kind === "note"}
          />
        );
      })}
    </div>
  );

  const managed = (text: string, links: { href: string; label: string }[]) => (
    <div className="grid gap-3">
      <p className="max-w-[60ch] text-[0.9375rem] text-muted">{text}</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-fg/7 px-4 text-sm font-semibold transition-colors duration-200 hover:bg-fg/12"
          >
            {link.label}
            <ArrowRight size={16} weight="bold" />
          </Link>
        ))}
      </div>
    </div>
  );

  const rowLabels = (name: string) => ({
    up: fmt(s.moveUp, { name }),
    down: fmt(s.moveDown, { name }),
  });

  const editors: Record<HomeSectionId, ReactNode> = {
    hero: (
      <>
        {textFields("hero")}
        <div className="grid gap-6 sm:grid-cols-2">
          <VideoPicker
            label={s.home.hero.video}
            hint={s.home.hero.videoHint}
            value={draft.hero.mediaId}
            onChange={(mediaId) => edit((d) => ({ ...d, hero: { ...d.hero, mediaId } }))}
            options={media}
            allowNone
            noneLabel={s.home.hero.auto}
          />
          <ImagePicker
            label={s.home.hero.inset}
            hint={s.home.hero.insetHint}
            value={draft.hero.inset}
            onChange={(inset) => edit((d) => ({ ...d, hero: { ...d.hero, inset } }))}
            options={media}
            allowNone
          />
        </div>
      </>
    ),
    reels: (
      <>
        {textFields("reels")}
        {managed(s.home.managed.reels, [{ href: `${admin}/content`, label: t.nav.content }])}
      </>
    ),
    about: (
      <>
        {textFields("about")}
        <ImagePicker
          label={s.home.about.portrait}
          hint={s.home.about.portraitHint}
          value={draft.about.portrait}
          onChange={(portrait) => edit((d) => ({ ...d, about: { ...d.about, portrait } }))}
          options={media}
          allowNone
        />
        <ListSection
          title={s.home.about.points}
          empty={s.home.about.noPoints}
          addLabel={s.home.about.addPoint}
          limit={fmt(s.limit, { n: MAX_ROWS })}
          count={draft.about.points.length}
          onAdd={() =>
            edit((d) => ({
              ...d,
              about: {
                ...d.about,
                points: [
                  ...d.about.points,
                  { uid: uid(), title: { ro: "", ru: "" }, body: { ro: "", ru: "" }, mediaId: null },
                ],
              },
            }))
          }
        >
          <SortableList
            items={draft.about.points}
            getKey={(p) => p.uid}
            onMove={(from, to) =>
              edit((d) => ({ ...d, about: { ...d.about, points: moveItem(d.about.points, from, to) } }))
            }
            itemClassName="border-t border-line py-5 first:border-t-0 first:pt-1"
          >
            {(point, index, handle) => {
              const name = fmt(s.home.about.point, { n: index + 1 });
              const patch = (change: Partial<HomePoint>) =>
                edit((d) => ({
                  ...d,
                  about: {
                    ...d.about,
                    points: d.about.points.map((p) => (p.uid === point.uid ? { ...p, ...change } : p)),
                  },
                }));
              return (
                <div className="grid gap-4">
                  <RowHead
                    name={name}
                    tools={
                      <>
                        <MoveButtons
                          index={index}
                          count={draft.about.points.length}
                          onMove={(from, to) =>
                            edit((d) => ({ ...d, about: { ...d.about, points: moveItem(d.about.points, from, to) } }))
                          }
                          labels={rowLabels(name)}
                        />
                        <DragHandle handle={handle} label={fmt(s.drag, { name })} />
                        <RemoveButton
                          label={fmt(s.remove, { name })}
                          onClick={() =>
                            edit((d) => ({
                              ...d,
                              about: { ...d.about, points: d.about.points.filter((p) => p.uid !== point.uid) },
                            }))
                          }
                        />
                      </>
                    }
                  />
                  <LocalizedField
                    id={`${point.uid}-title`}
                    label={s.home.about.pointTitle}
                    value={point.title}
                    onChange={(title) => patch({ title })}
                    maxLength={120}
                    invalid={invalid.includes(point.uid)}
                  />
                  <LocalizedField
                    id={`${point.uid}-body`}
                    label={s.home.about.pointBody}
                    value={point.body}
                    onChange={(body) => patch({ body })}
                    multiline
                    maxLength={600}
                  />
                  <VideoPicker
                    label={s.home.about.pointVideo}
                    hint={s.home.about.pointVideoHint}
                    value={point.mediaId}
                    onChange={(mediaId) => patch({ mediaId })}
                    options={media}
                    allowNone
                  />
                </div>
              );
            }}
          </SortableList>
        </ListSection>
      </>
    ),
    services: (
      <>
        {textFields("services")}
        {managed(s.home.managed.services, [{ href: `${admin}/services`, label: t.nav.services }])}
      </>
    ),
    feature: (
      <>
        {textFields("feature")}
        <VideoPicker
          label={s.home.feature.video}
          hint={draft.feature.mediaId == null ? s.home.feature.noVideo : undefined}
          value={draft.feature.mediaId}
          onChange={(mediaId) => edit((d) => ({ ...d, feature: { ...d.feature, mediaId } }))}
          options={media}
          allowNone
        />
        <ListSection
          title={s.home.feature.steps}
          empty={s.home.feature.noSteps}
          addLabel={s.home.feature.addStep}
          limit={fmt(s.limit, { n: MAX_ROWS })}
          count={draft.feature.steps.length}
          onAdd={() =>
            edit((d) => ({ ...d, feature: { ...d.feature, steps: [...d.feature.steps, { uid: uid(), ro: "", ru: "" }] } }))
          }
        >
          <SortableList
            items={draft.feature.steps}
            getKey={(line) => line.uid}
            onMove={(from, to) =>
              edit((d) => ({ ...d, feature: { ...d.feature, steps: moveItem(d.feature.steps, from, to) } }))
            }
            itemClassName="border-t border-line py-5 first:border-t-0 first:pt-1"
          >
            {(line, index, handle) => {
              const name = fmt(s.home.feature.step, { n: index + 1 });
              return (
                <div className="grid gap-3">
                  <RowHead
                    name={name}
                    tools={
                      <>
                        <MoveButtons
                          index={index}
                          count={draft.feature.steps.length}
                          onMove={(from, to) =>
                            edit((d) => ({ ...d, feature: { ...d.feature, steps: moveItem(d.feature.steps, from, to) } }))
                          }
                          labels={rowLabels(name)}
                        />
                        <DragHandle handle={handle} label={fmt(s.drag, { name })} />
                        <RemoveButton
                          label={fmt(s.remove, { name })}
                          onClick={() =>
                            edit((d) => ({
                              ...d,
                              feature: { ...d.feature, steps: d.feature.steps.filter((other) => other.uid !== line.uid) },
                            }))
                          }
                        />
                      </>
                    }
                  />
                  <LocalizedField
                    id={`${line.uid}-text`}
                    label={s.home.textLabels.body}
                    value={{ ro: line.ro, ru: line.ru }}
                    onChange={(value) =>
                      edit((d) => ({
                        ...d,
                        feature: {
                          ...d.feature,
                          steps: d.feature.steps.map((other) => (other.uid === line.uid ? { ...other, ...value } : other)),
                        },
                      }))
                    }
                    maxLength={200}
                    invalid={invalid.includes(line.uid)}
                  />
                </div>
              );
            }}
          </SortableList>
        </ListSection>
      </>
    ),
    blog: (
      <>
        {textFields("blog")}
        {managed(s.home.managed.blog, [{ href: `${admin}/content?tab=posts`, label: t.nav.content }])}
      </>
    ),
    studio: (
      <>
        {textFields("studio")}
        {managed(s.home.managed.studio, [
          { href: `${admin}/settings`, label: t.nav.settings },
          { href: `${admin}/site?tab=contact`, label: s.tabs.contact },
        ])}
      </>
    ),
    cta: textFields("cta"),
  };

  return (
    <>
      <p className="mb-5 max-w-[64ch] text-[0.9375rem] text-muted">{s.home.lead}</p>

      <SortableList
        items={draft.sections}
        getKey={(section) => section.id}
        onMove={(from, to) => edit((d) => ({ ...d, sections: moveItem(d.sections, from, to) }))}
        className="border-y border-line-strong"
        itemClassName="border-t border-line bg-bg first:border-t-0"
      >
        {(section, index, handle, dragging) => {
          const block = s.home.blocks[section.id];
          const expanded = open === section.id;
          return (
            <div className={cn("transition-colors duration-200", dragging && "bg-accent-soft")}>
              <div className="flex items-center gap-1 py-2 sm:gap-2">
                <div className="flex shrink-0 flex-col items-center sm:flex-row">
                  <DragHandle handle={handle} label={fmt(s.drag, { name: block.name })} className="h-9 w-11 sm:size-11" />
                  <MoveButtons
                    vertical
                    index={index}
                    count={draft.sections.length}
                    onMove={(from, to) => edit((d) => ({ ...d, sections: moveItem(d.sections, from, to) }))}
                    labels={rowLabels(block.name)}
                  />
                </div>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`block-${section.id}`}
                  aria-label={fmt(s.home.open, { name: block.name })}
                  onClick={() => setOpen(expanded ? null : section.id)}
                  className="group flex min-h-16 min-w-0 flex-1 items-center justify-between gap-3 rounded-field px-2 py-2 text-left transition-colors duration-200 hover:bg-fg/5"
                >
                  <span className={cn("min-w-0", !section.enabled && "opacity-55")}>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-[1.0625rem] leading-snug font-semibold">{block.name}</span>
                      {!section.enabled && (
                        <span className="inline-flex h-6 items-center rounded-full bg-fg/10 px-2.5 text-xs font-semibold">
                          {s.home.hidden}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{block.about}</span>
                  </span>
                  <CaretDown
                    size={18}
                    weight="bold"
                    aria-hidden
                    className={cn("shrink-0 text-muted transition-transform duration-300 ease-out-expo", expanded && "rotate-180")}
                  />
                </button>
                <Toggle
                  checked={section.enabled}
                  onChange={(enabled) =>
                    edit((d) => ({
                      ...d,
                      sections: d.sections.map((other) => (other.id === section.id ? { ...other, enabled } : other)),
                    }))
                  }
                  label={fmt(s.home.show, { name: block.name })}
                />
              </div>
              {expanded && (
                <BlockPanel id={`block-${section.id}`}>
                  {editors[section.id]}
                  <Link
                    href={`${admin}/texts`}
                    className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-accent-text hover:underline"
                  >
                    {s.home.allTexts}
                    <ArrowRight size={15} weight="bold" />
                  </Link>
                </BlockPanel>
              )}
            </div>
          );
        }}
      </SortableList>

      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={save}
        onDiscard={discard}
        labels={{ save: t.common.save, saving: t.common.saving, saved: t.common.saved, unsaved: s.unsaved, discard: s.discard }}
      />
    </>
  );
}

/** The editor that opens under a block's row. */
function BlockPanel({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!window.matchMedia(MOTION_OK).matches) return;
      gsap.fromTo(ref.current, { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.4, clearProps: "all" });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} id={id} className="grid gap-7 px-2 pt-3 pb-8 sm:pr-4 sm:pl-[5.75rem]">
      {children}
    </div>
  );
}

function RowHead({ name, tools }: { name: string; tools: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="label text-muted">{name}</p>
      <div className="-mr-2 flex items-center">{tools}</div>
    </div>
  );
}

function ListSection({
  title,
  empty,
  addLabel,
  limit,
  count,
  onAdd,
  children,
}: {
  title: string;
  empty: string;
  addLabel: string;
  limit: string;
  count: number;
  onAdd: () => void;
  children: ReactNode;
}) {
  const full = count >= MAX_ROWS;
  return (
    <section className="border-t border-line-strong pt-5">
      <h3 className="text-[1.0625rem] font-semibold">{title}</h3>
      <div className="mt-3">{count === 0 ? <p className="py-3 text-[0.9375rem] text-muted">{empty}</p> : children}</div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button variant="soft" size="sm" className="h-10" onClick={onAdd} disabled={full}>
          <Plus size={16} weight="bold" />
          {addLabel}
        </Button>
        {full ? <p className="text-sm text-muted">{limit}</p> : null}
      </div>
    </section>
  );
}
