"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { CaretLeft, CaretRight, Check, WarningCircle } from "@phosphor-icons/react";
import { fmt } from "@/i18n/config";
import { useSiteI18n } from "@/i18n/client";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { normalizePhone } from "@/lib/phone";
import { categories, type ServiceCategory } from "@/lib/services-view";
import { formatDateKey, formatPrice, toMinutes } from "@/lib/time";

export type BookableService = {
  slug: string;
  category: ServiceCategory;
  name: string;
  description: string;
  price: number;
  duration: number;
  image: string | null;
};

export type Day = { date: string; open: boolean; slots: string[] };
export type FormError = "name" | "phone" | "slotTaken" | "generic";
export type QuickPick = { date: string; time: string };

const CONTACT_KEY = "ev_booking_contact";

/* -------------------------------------------------------------------------- */
/* Step 1: what are we doing                                                    */
/* -------------------------------------------------------------------------- */

export function ServiceStep({
  services,
  selected,
  onChoose,
}: {
  services: BookableService[];
  selected: string | null;
  onChoose: (slug: string) => void;
}) {
  const { locale, t } = useSiteI18n();
  const groups = categories
    .map((key) => ({ key, items: services.filter((s) => s.category === key) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="grid gap-8">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`group-${group.key}`}>
          <h3 id={`group-${group.key}`} className="label text-muted">
            {t.services.groups[group.key]}
          </h3>
          <ul className="mt-3 grid gap-2.5">
            {group.items.map((service) => {
              const active = service.slug === selected;
              return (
                <li key={service.slug}>
                  <button
                    type="button"
                    onClick={() => onChoose(service.slug)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center gap-3.5 rounded-frame border p-2.5 pr-4 text-left transition-[border-color,background-color,scale] duration-200 ease-out-expo active:scale-[0.985] sm:gap-4",
                      active ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-fg/45",
                    )}
                  >
                    <span className="relative block h-[4.75rem] w-14 shrink-0 overflow-hidden rounded-[10px] bg-sunken">
                      {service.image ? <Image src={service.image} alt="" fill sizes="56px" className="object-cover" /> : null}
                      {active && (
                        <span className="absolute inset-0 flex items-center justify-center bg-accent/80 text-on-accent">
                          <Check size={22} weight="bold" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1.0625rem] leading-snug font-semibold text-pretty">{service.name}</span>
                      <span className="mt-1 line-clamp-2 block text-sm leading-snug text-muted">{service.description}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="display tnum block text-[1.75rem]">{formatPrice(service.price, locale)}</span>
                      <span className="label mt-1.5 block text-muted">{fmt(t.services.minutes, { n: service.duration })}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2: when                                                                 */
/* -------------------------------------------------------------------------- */

const timeButton =
  "inline-flex h-[3.25rem] items-center justify-center rounded-full border text-base font-semibold transition-[border-color,background-color,color,scale] duration-150 ease-out-expo active:scale-[0.96]";

function periodOf(slot: string): "morning" | "afternoon" | "evening" {
  const minutes = toMinutes(slot);
  return minutes < 12 * 60 ? "morning" : minutes < 17 * 60 ? "afternoon" : "evening";
}

export function TimeStep({
  days,
  failed,
  onRetry,
  date,
  time,
  today,
  quickPicks,
  dayLabel,
  onDay,
  onTime,
  onQuickPick,
  taken,
}: {
  days: Day[] | null;
  failed: boolean;
  onRetry: () => void;
  date: string | null;
  time: string | null;
  today: string | null;
  quickPicks: QuickPick[];
  dayLabel: (key: string, style?: "short" | "long") => string;
  onDay: (key: string) => void;
  onTime: (slot: string) => void;
  onQuickPick: (pick: QuickPick) => void;
  taken: boolean;
}) {
  const { locale, t } = useSiteI18n();

  if (failed) {
    return (
      <div role="alert" className="grid justify-items-start gap-4 rounded-frame border border-line bg-surface p-6">
        <p className="flex items-center gap-2.5 font-semibold">
          <WarningCircle size={22} className="text-danger" />
          {t.book.loadFailed}
        </p>
        <Button variant="outline" onClick={onRetry}>
          {t.book.retry}
        </Button>
      </div>
    );
  }

  if (!days) return <TimeSkeleton label={t.book.loading} />;

  if (!days.some((d) => d.slots.length > 0)) {
    return <p className="max-w-[44ch] text-[1.0625rem] text-muted">{t.book.noDays}</p>;
  }

  const day = days.find((d) => d.date === date) ?? null;
  const periods = (["morning", "afternoon", "evening"] as const)
    .map((key) => ({ key, slots: day?.slots.filter((slot) => periodOf(slot) === key) ?? [] }))
    .filter((period) => period.slots.length > 0);

  return (
    <div className="grid grid-cols-1 gap-9">
      {taken && (
        <p role="alert" className="flex items-start gap-2.5 rounded-field bg-danger-soft px-4 py-3 text-[0.9375rem] font-medium text-danger">
          <WarningCircle size={20} className="mt-0.5 shrink-0" />
          {t.book.errors.slotTaken}
        </p>
      )}

      {quickPicks.length > 0 && (
        <section aria-labelledby="earliest-title">
          <h3 id="earliest-title" className="label text-muted">
            {t.book.earliest}
          </h3>
          <ul className="no-scrollbar -mx-[1.125rem] mt-3 flex gap-2 overflow-x-auto px-[1.125rem] md:mx-0 md:flex-wrap md:px-0">
            {quickPicks.map((pick) => (
              <li key={`${pick.date}-${pick.time}`} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onQuickPick(pick)}
                  className={cn(timeButton, "gap-2 border-line-strong bg-surface px-5 hover:border-fg")}
                >
                  <span className="font-medium text-muted first-letter:uppercase">{dayLabel(pick.date)}</span>
                  {pick.time}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DayStrip days={days} date={date} today={today} onDay={onDay} />

      <section aria-labelledby="times-title" aria-live="polite">
        <h3 id="times-title" className="display text-[2rem] sm:text-[2.5rem]">
          {date ? dayLabel(date, "long") : t.book.pickDay}
        </h3>
        {periods.length === 0 ? (
          <p className="mt-4 text-[1.0625rem] text-muted">{day && !day.open ? t.book.dayOff : t.book.noSlots}</p>
        ) : (
          <div className="mt-5 grid gap-6">
            {periods.map((period) => (
              <div key={period.key}>
                <p className="label text-muted">{t.book.periods[period.key]}</p>
                <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                  {period.slots.map((slot) => (
                    <li key={slot}>
                      <button
                        type="button"
                        onClick={() => onTime(slot)}
                        aria-pressed={slot === time}
                        aria-label={`${date ? formatDateKey(date, locale, { day: "numeric", month: "long" }) : ""} ${slot}`}
                        className={cn(
                          timeButton,
                          "w-full",
                          slot === time
                            ? "border-accent bg-accent text-on-accent"
                            : "border-line-strong bg-surface hover:border-fg",
                        )}
                      >
                        {slot}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DayStrip({
  days,
  date,
  today,
  onDay,
}: {
  days: Day[];
  date: string | null;
  today: string | null;
  onDay: (key: string) => void;
}) {
  const { locale, t } = useSiteI18n();
  const strip = useRef<HTMLDivElement>(null);

  // Keep the chosen day in sight without moving the page itself.
  useEffect(() => {
    const el = strip.current;
    const chosen = el?.querySelector<HTMLElement>("[aria-pressed=true]");
    if (!el || !chosen) return;
    el.scrollTo({ left: chosen.offsetLeft - el.clientWidth / 2 + chosen.offsetWidth / 2, behavior: "smooth" });
  }, [date]);

  const page = (direction: 1 | -1) =>
    strip.current?.scrollBy({ left: direction * strip.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section aria-labelledby="days-title">
      <div className="flex items-center justify-between gap-4">
        <h3 id="days-title" className="label text-muted">
          {t.book.pickDay}
        </h3>
        <div className="-my-2 hidden md:flex">
          <IconButton label={t.book.prevDays} onClick={() => page(-1)}>
            <CaretLeft size={18} weight="bold" />
          </IconButton>
          <IconButton label={t.book.nextDays} onClick={() => page(1)}>
            <CaretRight size={18} weight="bold" />
          </IconButton>
        </div>
      </div>
      <div
        ref={strip}
        className="no-scrollbar relative -mx-[1.125rem] mt-3 flex snap-x gap-2 overflow-x-auto scroll-px-[1.125rem] px-[1.125rem] md:mx-0 md:scroll-px-0 md:px-0"
      >
        {days.map((day, index) => {
          const free = day.slots.length;
          const chosen = day.date === date;
          const relative =
            day.date === today ? t.book.today : index === 1 && today ? t.book.tomorrow : null;
          const state = !day.open ? t.book.dayOff : free === 0 ? t.book.full : free === 1 ? t.book.slotOne : fmt(t.book.slots, { n: free });
          const startsMonth = index > 0 && day.date.endsWith("-01");

          return (
            <div key={day.date} className="flex shrink-0 snap-start items-stretch gap-2">
              {startsMonth && (
                <span className="label flex w-10 items-center justify-center text-muted">
                  {formatDateKey(day.date, locale, { month: "short" }).replace(".", "")}
                </span>
              )}
              <button
                type="button"
                disabled={free === 0}
                onClick={() => onDay(day.date)}
                aria-pressed={chosen}
                aria-label={`${formatDateKey(day.date, locale, { weekday: "long", day: "numeric", month: "long" })}, ${state}`}
                className={cn(
                  "flex h-[5.5rem] w-[4.5rem] flex-col items-center justify-center rounded-frame border transition-[border-color,background-color,color,scale] duration-150 ease-out-expo active:scale-[0.96]",
                  chosen
                    ? "border-accent bg-accent text-on-accent"
                    : free > 0
                      ? "border-line-strong bg-surface hover:border-fg"
                      : "border-transparent text-faint",
                )}
              >
                <span className={cn("text-[0.6875rem] leading-none font-semibold tracking-[0.04em] uppercase", !chosen && free > 0 && "text-muted")}>
                  {relative ?? formatDateKey(day.date, locale, { weekday: "short" }).replace(".", "")}
                </span>
                <span className={cn("display tnum mt-1.5 text-[1.875rem]", free === 0 && "line-through decoration-1")}>
                  {Number(day.date.slice(8))}
                </span>
                <span className={cn("tnum mt-1 h-3 text-[0.6875rem] leading-none", !chosen && "text-muted")}>
                  {free > 0 ? free : ""}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TimeSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="grid grid-cols-1 gap-9">
      <span className="sr-only">{label}</span>
      <div aria-hidden>
        <div className="skeleton h-4 w-28" />
        <div className="mt-3 flex gap-2 overflow-hidden">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="skeleton h-[5.5rem] w-[4.5rem] shrink-0 !rounded-frame" />
          ))}
        </div>
      </div>
      <div aria-hidden>
        <div className="skeleton h-9 w-56" />
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="skeleton h-[3.25rem] !rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 3: who                                                                  */
/* -------------------------------------------------------------------------- */

export type DetailsValues = {
  name: string;
  phone: string;
  comment: string;
  website: string;
  remember: boolean;
};

/** Saves or forgets the contact details, as the visitor chose. */
export function storeContact(values: Pick<DetailsValues, "name" | "phone" | "remember">) {
  try {
    if (values.remember) localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: values.name, phone: values.phone }));
    else localStorage.removeItem(CONTACT_KEY);
  } catch {
    // Storage can be unavailable (private mode); remembering is only a convenience.
  }
}

const subscribeNever = () => () => {};

function readContact(): string | null {
  try {
    return localStorage.getItem(CONTACT_KEY);
  } catch {
    // Storage can be blocked entirely; then there is simply nothing remembered.
    return null;
  }
}

function parseContact(raw: string | null): { name?: string; phone?: string } | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function DetailsStep({
  formId,
  error,
  onSubmit,
  onTyping,
}: {
  formId: string;
  error: FormError | null;
  onSubmit: (values: DetailsValues) => void;
  onTyping: (typing: boolean) => void;
}) {
  const { t } = useSiteI18n();
  // Remembered details are read after hydration; anything typed since then wins.
  const stored = useSyncExternalStore(subscribeNever, readContact, () => null);
  const saved = useMemo(() => parseContact(stored), [stored]);
  const [nameDraft, setName] = useState<string | null>(null);
  const [phoneDraft, setPhone] = useState<string | null>(null);
  const [rememberDraft, setRemember] = useState<boolean | null>(null);
  const [local, setLocal] = useState<"name" | "phone" | null>(null);
  const name = nameDraft ?? saved?.name ?? "";
  const phone = phoneDraft ?? saved?.phone ?? "";
  const remember = rememberDraft ?? saved !== null;

  const shown = local ?? (error === "name" || error === "phone" ? error : null);

  return (
    <form
      id={formId}
      noValidate
      onFocus={(e) => e.target instanceof HTMLElement && e.target.matches("input:not([type=checkbox]), textarea") && onTyping(true)}
      onBlur={() => onTyping(false)}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const trimmed = name.trim();
        if (trimmed.length < 2) {
          setLocal("name");
          e.currentTarget.querySelector<HTMLInputElement>("#book-name")?.focus();
          return;
        }
        if (!normalizePhone(phone)) {
          setLocal("phone");
          e.currentTarget.querySelector<HTMLInputElement>("#book-phone")?.focus();
          return;
        }
        setLocal(null);
        onSubmit({
          name: trimmed,
          phone,
          comment: String(data.get("comment") ?? ""),
          website: String(data.get("website") ?? ""),
          remember,
        });
      }}
      className="grid max-w-xl gap-6"
    >
      {error === "generic" && (
        <p role="alert" className="flex items-start gap-2.5 rounded-field bg-danger-soft px-4 py-3 text-[0.9375rem] font-medium text-danger">
          <WarningCircle size={20} className="mt-0.5 shrink-0" />
          {t.book.errors.generic}
        </p>
      )}

      <Field label={t.book.name} htmlFor="book-name" hint={t.book.nameHint} error={shown === "name" ? t.book.errors.name : null}>
        <Input
          id="book-name"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setLocal(null);
          }}
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={80}
          required
          aria-invalid={shown === "name"}
          aria-describedby={shown === "name" ? "book-name-error" : "book-name-hint"}
          className="h-14"
        />
      </Field>

      <Field label={t.book.phone} htmlFor="book-phone" hint={t.book.phoneHint} error={shown === "phone" ? t.book.errors.phone : null}>
        <Input
          id="book-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setLocal(null);
          }}
          autoComplete="tel"
          enterKeyHint="done"
          placeholder="+373 69 123 456"
          required
          aria-invalid={shown === "phone"}
          aria-describedby={shown === "phone" ? "book-phone-error" : "book-phone-hint"}
          className="h-14"
        />
      </Field>

      <Field label={t.book.comment} htmlFor="book-comment" optional={t.book.optional} hint={t.book.commentHint}>
        <Textarea id="book-comment" name="comment" maxLength={500} rows={3} aria-describedby="book-comment-hint" />
      </Field>

      {/* Bots fill every field; people never see this one. */}
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex min-h-11 items-center gap-3 text-[0.9375rem]">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="size-5 shrink-0 accent-(--accent)"
        />
        {t.book.remember}
      </label>
    </form>
  );
}
