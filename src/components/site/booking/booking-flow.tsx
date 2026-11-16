"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { fmt } from "@/i18n/config";
import { useSiteI18n } from "@/i18n/client";
import { Button, IconButton } from "@/components/ui/button";
import { createBooking } from "@/lib/booking-actions";
import { cn } from "@/lib/cn";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { formatDateKey, formatPrice } from "@/lib/time";
import {
  DetailsStep,
  ServiceStep,
  storeContact,
  TimeStep,
  type BookableService,
  type Day,
  type DetailsValues,
  type FormError,
  type QuickPick,
} from "./steps";
import { Ticket, TicketRow } from "./ticket";

type Step = "service" | "time" | "details";

const STEPS: Step[] = ["service", "time", "details"];
/** Today plus the 28-day booking window. */
const WINDOW_DAYS = 29;
const FORM_ID = "booking-form";

/**
 * The choice lives in the URL (?service&date&time&step): the phone's back
 * button walks back through the steps, and a link can preselect anything.
 */
function useBookingUrl(services: BookableService[]) {
  const params = useSearchParams();
  const requestedService = params.get("service");
  const serviceSlug = services.some((s) => s.slug === requestedService) ? requestedService : null;
  const date = params.get("date");
  const time = params.get("time");
  const requested = params.get("step") as Step | null;
  // Set when a linked or stale time turned out to be taken, so the time step can say so.
  const gone = params.get("gone") === "1";

  let step: Step = requested && STEPS.includes(requested) ? requested : date && time ? "details" : "time";
  if (!serviceSlug) step = "service";
  else if (step === "details" && !(date && time)) step = "time";

  const go = useCallback(
    (next: Partial<Record<"service" | "date" | "time" | "step" | "gone", string | null>>, mode: "push" | "replace" = "push") => {
      const url = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(next)) {
        if (value == null) url.delete(key);
        else url.set(key, value);
      }
      const href = `${window.location.pathname}?${url.toString()}`;
      // Next.js keeps useSearchParams in sync with native history calls, with no server round trip.
      if (mode === "push") window.history.pushState(null, "", href);
      else window.history.replaceState(null, "", href);
    },
    [],
  );

  return { serviceSlug, date, time, step, gone, go };
}

/** Free start times for one service across the whole booking window, fetched once per service. */
function useAvailability(serviceSlug: string | null) {
  const [store, setStore] = useState<Record<string, Day[] | "failed">>({});
  const inflight = useRef(new Set<string>());
  const entry = serviceSlug ? store[serviceSlug] : undefined;

  useEffect(() => {
    if (!serviceSlug || entry || inflight.current.has(serviceSlug)) return;
    inflight.current.add(serviceSlug);
    fetch(`/api/availability?service=${serviceSlug}&days=${WINDOW_DAYS}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: { days: Day[] }) => setStore((s) => ({ ...s, [serviceSlug]: data.days })))
      .catch(() => setStore((s) => ({ ...s, [serviceSlug]: "failed" })))
      .finally(() => inflight.current.delete(serviceSlug));
  }, [serviceSlug, entry]);

  // Dropping the entry makes the effect above fetch fresh slots.
  const refresh = useCallback(() => {
    if (!serviceSlug) return;
    setStore((s) => {
      const next = { ...s };
      delete next[serviceSlug];
      return next;
    });
  }, [serviceSlug]);

  return { days: Array.isArray(entry) ? entry : null, failed: entry === "failed", refresh };
}

export function BookingFlow({ services }: { services: BookableService[] }) {
  const { locale, t, site } = useSiteI18n();
  const router = useRouter();
  const { serviceSlug, date, time, step, gone, go } = useBookingUrl(services);
  const { days, failed, refresh } = useAvailability(serviceSlug);
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef<Step>(step);

  const [error, setError] = useState<FormError | null>(null);
  const [typing, setTyping] = useState(false);
  const [pending, startTransition] = useTransition();

  const service = services.find((s) => s.slug === serviceSlug) ?? null;
  const day = days?.find((d) => d.date === date) ?? null;
  // Until availability arrives, a linked time is taken on trust; the server re-checks it anyway.
  const validTime = time && (!days || day?.slots.includes(time)) ? time : null;
  const today = days?.[0]?.date ?? null;
  const stepIndex = STEPS.indexOf(step);

  // Land on the first day with room unless a bookable day is already chosen.
  useEffect(() => {
    if (!days || step !== "time") return;
    const chosen = days.find((d) => d.date === date);
    if (chosen && chosen.slots.length > 0) return;
    const first = days.find((d) => d.slots.length > 0);
    if (first) go({ date: first.date, time: null, step: "time" }, "replace");
  }, [days, date, step, go]);

  // A linked or stale time that is no longer free sends the visitor back to pick another.
  useEffect(() => {
    if (step !== "details" || !days || validTime) return;
    go({ step: "time", time: null, gone: "1" }, "replace");
  }, [step, days, validTime, go]);

  // Each step starts at the top, slides in from the side it logically comes from, and takes focus.
  useGSAP(
    () => {
      const from = STEPS.indexOf(previousStep.current);
      const to = STEPS.indexOf(step);
      previousStep.current = step;
      if (from === to) return;
      window.scrollTo({ top: 0, behavior: "instant" });
      heading.current?.focus({ preventScroll: true });
      if (!window.matchMedia(MOTION_OK).matches) return;
      gsap.fromTo(
        "[data-step-body]",
        { autoAlpha: 0, x: to > from ? 36 : -36 },
        { autoAlpha: 1, x: 0, duration: 0.55, clearProps: "transform" },
      );
    },
    { scope: panel, dependencies: [step] },
  );

  const quickPicks = useMemo(() => {
    const picks: QuickPick[] = [];
    for (const d of days ?? []) {
      if (d.slots[0]) picks.push({ date: d.date, time: d.slots[0] });
      if (picks.length === 3) break;
    }
    return picks;
  }, [days]);

  const dayLabel = useCallback(
    (key: string, style: "short" | "long" = "short") => {
      const relative = key === today ? t.book.today : days?.[1]?.date === key ? t.book.tomorrow : null;
      if (style === "long") {
        return relative
          ? `${relative}, ${formatDateKey(key, locale, { day: "numeric", month: "long" })}`
          : formatDateKey(key, locale, { weekday: "long", day: "numeric", month: "long" });
      }
      return relative ?? formatDateKey(key, locale, { weekday: "short", day: "numeric", month: "short" });
    },
    [today, days, locale, t.book.today, t.book.tomorrow],
  );

  const chooseService = (slug: string) => {
    setError(null);
    go({ service: slug, step: "time", time: slug === serviceSlug ? time : null });
  };
  // The step is pinned explicitly: a URL with a date and a time but no step reads as "details".
  const chooseDay = (key: string) => go({ date: key, time: null, step: "time" }, "replace");
  const chooseTime = (slot: string) => {
    setError(null);
    go({ time: slot, step: "time", gone: null }, "replace");
  };

  const submit = (values: DetailsValues) => {
    if (!service || !date || !validTime || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createBooking({
        locale,
        service: service.slug,
        date,
        time: validTime,
        name: values.name,
        phone: values.phone,
        comment: values.comment,
        website: values.website,
      });
      if (result.ok) {
        storeContact(values);
        router.push(`/${locale}/booking/${result.token}?created=1`);
        return;
      }
      setError(result.error);
      if (result.error === "slotTaken") {
        refresh();
        go({ step: "time", time: null });
      }
    });
  };

  const whenLong = date && validTime ? `${dayLabel(date, "long")}, ${validTime}` : null;
  const whenShort = date && validTime ? `${dayLabel(date)}, ${validTime}` : null;

  // One primary action per step; it lives in the ticket on desktop and in the bottom bar on phones.
  const action = (compact: boolean) => {
    const className = compact ? "h-[3.25rem] px-6" : "w-full";
    if (step === "details") {
      return (
        <Button type="submit" form={FORM_ID} size="lg" disabled={pending} className={className}>
          {pending ? t.book.submitting : compact ? t.book.submitShort : t.book.submit}
        </Button>
      );
    }
    if (step === "time") {
      return (
        <Button size="lg" disabled={!validTime} onClick={() => go({ step: "details" })} className={className}>
          {t.book.continue}
        </Button>
      );
    }
    return (
      <Button size="lg" disabled={!service} onClick={() => go({ step: "time" })} className={className}>
        {t.book.continue}
      </Button>
    );
  };

  const changeButton = (target: Step) => (
    <button
      type="button"
      onClick={() => go({ step: target })}
      className="-my-2 -mr-2 min-h-11 rounded-full px-2 text-sm font-semibold text-accent-text hover:underline"
    >
      {t.book.change}
    </button>
  );

  const barVisible = Boolean(service) && !typing;

  return (
    <div className="mt-5 grid gap-10 lg:mt-8 lg:grid-cols-12 lg:gap-12">
      <div ref={panel} className="min-w-0 overflow-x-clip lg:col-span-7">
        <nav aria-label={t.book.progress}>
          <ol className="grid grid-cols-3 gap-2">
            {STEPS.map((s, index) => {
              const reached = index <= stepIndex;
              const label = (
                <>
                  <span className={cn("block h-1 rounded-full", reached ? "bg-fg" : "bg-fg/12")} />
                  <span className={cn("mt-2.5 block text-[0.8125rem] leading-tight font-semibold", reached ? "text-fg" : "text-faint")}>
                    {t.book.steps[s]}
                  </span>
                </>
              );
              return (
                <li key={s} aria-current={index === stepIndex ? "step" : undefined}>
                  {index < stepIndex ? (
                    <button type="button" onClick={() => go({ step: s })} className="block w-full pb-1 text-left">
                      {label}
                    </button>
                  ) : (
                    <span className="block pb-1">{label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-7 flex items-center gap-2 lg:mt-9">
          {stepIndex > 0 && (
            <IconButton label={t.book.back} onClick={() => go({ step: STEPS[stepIndex - 1] })} className="-ml-2.5">
              <ArrowLeft size={22} weight="bold" />
            </IconButton>
          )}
          <h2 ref={heading} tabIndex={-1} className="display text-[clamp(2.75rem,11vw,4.5rem)] outline-none">
            {t.book.stepTitles[step]}
          </h2>
        </div>

        <div data-step-body className="mt-6 lg:mt-8">
          {/* What is already decided stays in view on phones; on desktop the ticket carries it. */}
          {stepIndex > 0 && service && (
            <dl className="mb-8 divide-y divide-line rounded-frame border border-line bg-surface px-4 py-3.5 lg:hidden">
              <TicketRow label={t.book.service} action={changeButton("service")}>
                {service.name}
              </TicketRow>
              {step === "details" && whenLong && (
                <TicketRow label={t.book.when} action={changeButton("time")}>
                  <span className="block first-letter:uppercase">{whenLong}</span>
                </TicketRow>
              )}
            </dl>
          )}

          {step === "service" && <ServiceStep services={services} selected={serviceSlug} onChoose={chooseService} />}

          {step === "time" && service && (
            <TimeStep
              days={days}
              failed={failed}
              onRetry={refresh}
              date={date}
              time={validTime}
              today={today}
              quickPicks={quickPicks}
              dayLabel={dayLabel}
              onDay={chooseDay}
              onTime={chooseTime}
              onQuickPick={(pick) => {
                setError(null);
                go({ date: pick.date, time: pick.time, step: "details", gone: null });
              }}
              taken={gone || error === "slotTaken"}
            />
          )}

          {step === "details" && (
            <>
              <DetailsStep formId={FORM_ID} error={error} onSubmit={submit} onTyping={setTyping} />
              <p className="mt-6 max-w-xl text-sm text-muted lg:hidden">{t.book.policy}</p>
            </>
          )}
        </div>
      </div>

      <aside className="hidden lg:col-span-5 lg:block xl:col-span-4 xl:col-start-9">
        <div className="sticky top-28">
          <Ticket
            footer={
              <>
                {service && (
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <p className="label pb-1.5 text-muted">{t.book.total}</p>
                    <p className="display tnum text-[3.25rem]">{formatPrice(service.price, locale)}</p>
                  </div>
                )}
                {action(false)}
                <p className="mt-4 text-sm text-muted">{t.book.policy}</p>
              </>
            }
          >
            <h2 className="display text-[2rem]">{t.book.ticket}</h2>
            <dl className="mt-5 divide-y divide-line">
              <TicketRow label={t.book.service} muted={!service} action={service && step !== "service" ? changeButton("service") : undefined}>
                {service ? service.name : t.book.notChosenService}
              </TicketRow>
              <TicketRow label={t.book.when} muted={!whenLong} action={whenLong && step === "details" ? changeButton("time") : undefined}>
                <span className="block first-letter:uppercase">{whenLong ?? t.book.notChosen}</span>
              </TicketRow>
              {service && (
                <TicketRow label={t.book.duration}>{fmt(t.services.minutes, { n: service.duration })}</TicketRow>
              )}
              <TicketRow label={t.book.address}>{site.address[locale]}</TicketRow>
            </dl>
          </Ticket>
        </div>
      </aside>

      {/* Phone action bar. It steps aside while a field has focus so the keyboard never fights it. */}
      {service && (
        <div
          data-bottom-bar
          inert={!barVisible}
          className={cn(
            "fixed inset-x-0 bottom-0 z-(--z-chrome) border-t border-line bg-bg/92 backdrop-blur-lg transition-transform duration-300 ease-out-expo lg:hidden",
            !barVisible && "translate-y-full",
          )}
        >
          <div className="page flex items-center gap-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-muted">{service.name}</p>
              <p className="truncate text-[0.9375rem] font-semibold first-letter:uppercase">
                {step === "service"
                  ? formatPrice(service.price, locale)
                  : whenShort
                    ? step === "details"
                      ? `${whenShort} · ${formatPrice(service.price, locale)}`
                      : whenShort
                    : t.book.pickTime}
              </p>
            </div>
            {action(true)}
          </div>
        </div>
      )}
    </div>
  );
}

/** Stands in while the URL (request-time data) is read; shaped like step one. */
export function BookingFlowSkeleton() {
  return (
    <div aria-hidden className="mt-5 grid gap-10 lg:mt-8 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-1 !rounded-full" />
          ))}
        </div>
        <div className="skeleton mt-14 h-14 w-64" />
        <div className="mt-8 grid gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 !rounded-frame" />
          ))}
        </div>
      </div>
      <div className="skeleton hidden h-[26rem] !rounded-frame lg:col-span-5 lg:block xl:col-span-4 xl:col-start-9" />
    </div>
  );
}
