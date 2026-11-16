"use client";
import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Minus, PencilSimple, Plus } from "@phosphor-icons/react";
import { Empty, PageHeader } from "@/components/admin/ui";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useAdminI18n } from "@/i18n/client";
import { fmt, tr } from "@/i18n/config";
import { ImagePicker } from "@/components/admin/cms/pickers";
import { saveService } from "@/lib/admin/actions";
import { setServiceImage } from "@/lib/admin/cms-actions";
import type { MediaOption } from "@/lib/admin/cms-queries";
import { cn } from "@/lib/cn";
import { RadioPills, SaveStatus, Switch } from "./controls";
import { slugify } from "./slug";
import { useSubmit } from "./use-submit";

export type ServiceRow = {
  id: number;
  slug: string;
  category: "hair" | "beard" | "color";
  nameRo: string;
  nameRu: string;
  descriptionRo: string;
  descriptionRu: string;
  price: number;
  durationMin: number;
  active: boolean;
  sortOrder: number;
  /** Picture shown beside the price list and in the booking flow. */
  image: string | null;
};

const categories = ["hair", "beard", "color"] as const;

export function ServicesManager({ services, media }: { services: ServiceRow[]; media: MediaOption[] }) {
  const { locale, t } = useAdminI18n();
  // `target` stays set while the sheet slides out, so its content does not vanish mid-animation.
  const [target, setTarget] = useState<ServiceRow | "new" | null>(null);
  const [open, setOpen] = useState(false);
  const [savedAt, setSavedAt] = useState(0);

  const edit = (next: ServiceRow | "new") => {
    setTarget(next);
    setOpen(true);
  };

  useEffect(() => {
    if (!savedAt) return;
    const timer = setTimeout(() => setSavedAt(0), 2600);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const groups = categories
    .map((key) => ({ key, items: services.filter((s) => s.category === key) }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <PageHeader
        title={t.services.title}
        description={t.services.lead}
        actions={
          <>
            <p role="status" aria-live="polite" className="text-sm font-semibold text-ok">
              {savedAt ? t.common.saved : ""}
            </p>
            <Button onClick={() => edit("new")}>
              <Plus size={18} weight="bold" />
              {t.services.add}
            </Button>
          </>
        }
      />

      {groups.length === 0 ? (
        <div className="rounded-frame border border-line">
          <Empty title={t.services.empty} action={<Button onClick={() => edit("new")}>{t.services.add}</Button>} />
        </div>
      ) : (
        <div className="grid gap-10 lg:gap-12">
          {groups.map((group) => (
            <section
              key={group.key}
              aria-labelledby={`services-${group.key}`}
              className="grid gap-x-10 gap-y-2 border-t border-line-strong pt-5 lg:grid-cols-[200px_minmax(0,1fr)]"
            >
              <h2 id={`services-${group.key}`} className="display text-[2rem]">
                {t.services.categories[group.key]}
              </h2>
              <ul className="divide-y divide-line">
                {group.items.map((service) => (
                  <li key={service.id}>
                    <button
                      type="button"
                      onClick={() => edit(service)}
                      aria-label={`${t.common.edit}: ${tr(locale, service.nameRo, service.nameRu)}`}
                      className="group -mx-3 grid w-[calc(100%+1.5rem)] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-field px-3 py-3 text-left transition-colors duration-200 hover:bg-fg/5 sm:gap-4"
                    >
                      <span
                        className={cn(
                          "relative block h-14 w-11 shrink-0 overflow-hidden rounded-[8px] bg-sunken",
                          !service.active && "opacity-55",
                        )}
                      >
                        {service.image ? (
                          <Image src={service.image} alt="" fill sizes="44px" className="object-cover" />
                        ) : null}
                      </span>
                      <span className={cn("min-w-0", !service.active && "opacity-55")}>
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-[1.0625rem] leading-snug font-semibold">
                            {tr(locale, service.nameRo, service.nameRu)}
                          </span>
                          {!service.active && (
                            <span className="inline-flex h-6 items-center rounded-full bg-fg/10 px-2.5 text-xs font-semibold">
                              {t.services.inactive}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted">
                          {tr(locale, service.nameRu, service.nameRo)}
                        </span>
                      </span>
                      <span className="flex items-center gap-4 sm:gap-7">
                        <span className={cn("tnum text-sm text-muted", !service.active && "opacity-55")}>
                          {fmt(t.common.min, { n: service.durationMin })}
                        </span>
                        <span
                          className={cn(
                            "tnum min-w-[4.75rem] text-right text-[1.0625rem] font-semibold",
                            !service.active && "opacity-55",
                          )}
                        >
                          {fmt(t.common.lei, { n: service.price })}
                        </span>
                        <PencilSimple
                          size={18}
                          aria-hidden
                          className="hidden text-faint transition-colors duration-200 group-hover:text-fg sm:block"
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={target === "new" ? t.services.newTitle : t.services.editTitle}
        closeLabel={t.common.close}
      >
        {target && (
          <ServiceForm
            key={target === "new" ? "new" : target.id}
            service={target === "new" ? null : target}
            nextOrder={services.reduce((max, s) => Math.max(max, s.sortOrder), -1) + 1}
            media={media}
            onSaved={() => {
              setOpen(false);
              setSavedAt(Date.now());
            }}
          />
        )}
      </Sheet>
    </>
  );
}

function ServiceForm({
  service,
  nextOrder,
  media,
  onSaved,
}: {
  service: ServiceRow | null;
  nextOrder: number;
  media: MediaOption[];
  onSaved: () => void;
}) {
  const { t } = useAdminI18n();
  const [invalid, setInvalid] = useState<string[]>([]);
  const { state, pending, onSubmit } = useSubmit(async (formData) => {
    // Point at the fields the server would reject, so "check the marked fields" has something to mark.
    const text = (name: string) => String(formData.get(name) ?? "").trim();
    const missing = ["nameRo", "nameRu", "price"].filter((name) => !text(name));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text("slug"))) missing.push("slug");
    if (!(Number(text("durationMin")) >= 5)) missing.push("durationMin");
    setInvalid(missing);
    if (missing.length > 0) return { ok: false, error: "invalid" };
    const result = await saveService(null, formData);
    if (result.ok) onSaved();
    return result;
  });
  const [nameRo, setNameRo] = useState(service?.nameRo ?? "");
  const [slug, setSlug] = useState(service?.slug ?? "");
  // A new service takes its URL id from the Romanian name until the field is edited by hand.
  const [slugTouched, setSlugTouched] = useState(Boolean(service));
  const [duration, setDuration] = useState(service?.durationMin ?? 30);

  const error =
    state && !state.ok
      ? state.error === "slugTaken"
        ? t.services.slugTaken
        : state.error === "invalid"
          ? t.services.invalid
          : t.common.error
      : null;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      {service && <input type="hidden" name="id" value={service.id} />}

      <div className="grid gap-4">
        <Field label={t.services.nameRo} htmlFor="service-name-ro">
          <Input
            id="service-name-ro"
            name="nameRo"
            aria-invalid={invalid.includes("nameRo") || undefined}
            lang="ro"
            maxLength={120}
            value={nameRo}
            onChange={(e) => {
              setNameRo(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label={t.services.nameRu} htmlFor="service-name-ru">
          <Input
            id="service-name-ru"
            name="nameRu"
            lang="ru"
            maxLength={120}
            defaultValue={service?.nameRu}
            aria-invalid={invalid.includes("nameRu") || undefined}
          />
        </Field>
      </div>

      <RadioPills
        name="category"
        legend={t.services.category}
        defaultValue={service?.category ?? "hair"}
        options={categories.map((value) => ({ value, label: t.services.categories[value] }))}
      />

      <div className="grid grid-cols-2 gap-4">
        <Field label={t.services.price} htmlFor="service-price">
          <Input
            id="service-price"
            name="price"
            aria-invalid={invalid.includes("price") || undefined}
            type="number"
            inputMode="numeric"
            min={0}
            step={10}
            defaultValue={service?.price ?? ""}
            className="tnum"
          />
        </Field>
        <Field label={t.services.duration} htmlFor="service-duration">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1">
            <IconButton
              label="-5"
              onClick={() => setDuration((d) => Math.max(5, d - 5))}
              className="border border-line-strong"
            >
              <Minus size={16} weight="bold" />
            </IconButton>
            <Input
              id="service-duration"
              name="durationMin"
              aria-invalid={invalid.includes("durationMin") || undefined}
              type="number"
              inputMode="numeric"
              min={5}
              max={480}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="tnum px-1 text-center"
            />
            <IconButton
              label="+5"
              onClick={() => setDuration((d) => Math.min(480, d + 5))}
              className="border border-line-strong"
            >
              <Plus size={16} weight="bold" />
            </IconButton>
          </div>
        </Field>
      </div>

      <div className="grid gap-4">
        <Field label={t.services.descRo} htmlFor="service-desc-ro" hint={t.services.descHint}>
          <Textarea
            id="service-desc-ro"
            name="descriptionRo"
            lang="ro"
            maxLength={600}
            rows={3}
            defaultValue={service?.descriptionRo}
            className="min-h-20!"
          />
        </Field>
        <Field label={t.services.descRu} htmlFor="service-desc-ru">
          <Textarea
            id="service-desc-ru"
            name="descriptionRu"
            lang="ru"
            maxLength={600}
            rows={3}
            defaultValue={service?.descriptionRu}
            className="min-h-20!"
          />
        </Field>
      </div>

      {service ? <ServicePicture service={service} media={media} /> : <p className="text-sm text-muted">{t.services.pictureNew}</p>}

      <div className="border-y border-line py-3">
        <Switch
          name="active"
          label={t.services.active}
          hint={t.services.activeHint}
          defaultChecked={service?.active ?? true}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-4">
        <Field label={t.services.slug} htmlFor="service-slug">
          <Input
            id="service-slug"
            name="slug"
            aria-invalid={invalid.includes("slug") || (state?.ok === false && state.error === "slugTaken") || undefined}
            autoCapitalize="none"
            spellCheck={false}
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
          />
        </Field>
        <Field label={t.services.order} htmlFor="service-order">
          <Input
            id="service-order"
            name="sortOrder"
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            defaultValue={service?.sortOrder ?? nextOrder}
            className="tnum"
          />
        </Field>
        <p className="col-span-2 -mt-2 text-sm text-muted">
          {t.services.slugHint} {t.services.orderHint}
        </p>
      </div>

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

/** The picture is saved on its own, the moment it is picked, so it never depends on the rest of the form. */
function ServicePicture({ service, media }: { service: ServiceRow; media: MediaOption[] }) {
  const { t } = useAdminI18n();
  const [image, setImage] = useState(service.image);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const choose = (next: string | null) => {
    const previous = image;
    setImage(next);
    setFailed(false);
    startTransition(async () => {
      const result = await setServiceImage(service.id, next);
      if (!result.ok) {
        setImage(previous);
        setFailed(true);
      }
    });
  };

  return (
    <div className="grid gap-2">
      <ImagePicker
        label={t.services.picture}
        hint={t.services.pictureHint}
        value={image}
        onChange={choose}
        options={media}
        allowNone
      />
      <p role="status" aria-live="polite" className={cn("text-sm", failed ? "text-danger" : "text-muted")}>
        {pending ? t.common.saving : failed ? t.common.error : ""}
      </p>
    </div>
  );
}
