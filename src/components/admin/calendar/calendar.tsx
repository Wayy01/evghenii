"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarBlank, CaretLeft, CaretRight, Plus } from "@phosphor-icons/react";
import { PageHeader } from "@/components/admin/ui";
import { Button, IconButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { BookingStatus } from "@/db/schema";
import { fmt, type Locale } from "@/i18n/config";
import { useAdminI18n } from "@/i18n/client";
import {
  createCalendarBooking,
  moveBooking,
  setCalendarStatus,
  updateBookingDetails,
} from "@/lib/admin/calendar-actions";
import { cn } from "@/lib/cn";
import { DESKTOP, gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { formatInTz, formatPrice, fromMinutes, toMinutes } from "@/lib/time";
import { BookingSheetBody, BookingSheetFooter } from "./booking-sheet";
import { DayStrip } from "./day-strip";
import { NewBookingForm, type NewBookingInput } from "./new-booking-sheet";
import {
  dayKeyOf,
  daysOf,
  durationMin,
  hourBand,
  instant,
  isDateKey,
  isLive,
  minuteOf,
  parseView,
  rangeFor,
  rangeTitle,
  rangeTitleShort,
  stepAnchor,
  stripRange,
  workingWindow,
} from "./range";
import { GridSkeleton } from "./skeleton";
import { TimeGrid } from "./time-grid";
import type { CalBooking, CalHours, CalRangeData, CalService, CalTimeOff, CalView } from "./types";

type Props = {
  locale: Locale;
  nowMs: number;
  initialRange: { from: string; days: number };
  initialData: CalRangeData;
  initialCounts: Record<string, number>;
  hours: CalHours[];
  services: CalService[];
};

/** Everything fetched so far, keyed so paging back to a loaded week is instant. */
type Store = { bookings: Map<number, CalBooking>; timeOff: Map<number, CalTimeOff>; loaded: Set<string> };

function mergeRange(store: Store, from: string, days: number, data: CalRangeData): Store {
  const keys = new Set(daysOf(from, days));
  // Drop what the store held for these days first, so deletions and moves away are respected.
  const bookings = new Map([...store.bookings].filter(([, b]) => !keys.has(dayKeyOf(b.start))));
  for (const b of data.bookings) bookings.set(b.id, b);
  const timeOff = new Map(store.timeOff);
  for (const o of data.timeOff) timeOff.set(o.id, o);
  return { bookings, timeOff, loaded: new Set([...store.loaded, ...keys]) };
}

const emptyStore: Store = { bookings: new Map(), timeOff: new Map(), loaded: new Set() };

function subscribeDesktop(callback: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
/** Null until the browser has answered, so the server never guesses a layout. */
const useDesktop = () =>
  useSyncExternalStore<boolean | null>(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP).matches,
    () => null,
  );

type ToastMessage = { id: number; tone: "ok" | "error"; text: string; action?: { label: string; run: () => void } };

export function Calendar({ locale, nowMs, initialRange, initialData, initialCounts, hours, services }: Props) {
  const { t } = useAdminI18n();
  const cal = t.cal;
  const search = useSearchParams();
  const desktop = useDesktop();
  const root = useRef<HTMLDivElement>(null);

  const [now, setNow] = useState(nowMs);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const todayKey = dayKeyOf(now);

  // Week on desktop, one day on phones, unless the URL says otherwise.
  const view: CalView | null = parseView(search.get("view")) ?? (desktop === null ? null : desktop ? "week" : "day");
  const dateParam = search.get("date");
  const anchor = isDateKey(dateParam) ? dateParam : todayKey;
  const range = rangeFor(view ?? "week", anchor);
  const visibleDays = useMemo(() => daysOf(range.from, range.days), [range.from, range.days]);

  // ------------------------------------------------------------------ data
  const [store, setStore] = useState<Store>(() =>
    mergeRange(emptyStore, initialRange.from, initialRange.days, initialData),
  );
  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  }, [store]);
  const [counts, setCounts] = useState(() => new Map(Object.entries(initialCounts)));
  const [loadError, setLoadError] = useState(false);
  const inflight = useRef(new Set<string>());

  const load = useCallback(
    async (from: string, days: number, force = false) => {
      if (!force && daysOf(from, days).every((k) => storeRef.current.loaded.has(k))) return;
      const key = `${from}|${days}`;
      if (inflight.current.has(key)) return;
      inflight.current.add(key);
      try {
        const res = await fetch(`/${locale}/admin/calendar/data?from=${from}&days=${days}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as CalRangeData;
        setStore((s) => mergeRange(s, from, days, data));
        setLoadError(false);
      } catch {
        setLoadError(true);
      } finally {
        inflight.current.delete(key);
      }
    },
    [locale],
  );

  // Load what is on screen, then warm the neighbours so paging feels instant.
  useEffect(() => {
    if (!view) return;
    const current = rangeFor(view, anchor);
    void Promise.resolve()
      .then(() => load(current.from, current.days))
      .then(() => {
        for (const dir of [1, -1] as const) {
          const next = rangeFor(view, stepAnchor(view, anchor, dir));
          void load(next.from, next.days);
        }
      });
  }, [view, anchor, load]);

  // Booking counts for the days the strip can scroll to but the grid has not loaded.
  const strip = stripRange(anchor);
  useEffect(() => {
    if (view !== "day") return;
    let stale = false;
    fetch(`/${locale}/admin/calendar/data?from=${strip.from}&days=${strip.days}&counts=1`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ counts: Record<string, number> }>) : null))
      .then((body) => {
        if (stale || !body) return;
        setCounts((prev) => {
          const next = new Map(prev);
          for (const day of daysOf(strip.from, strip.days)) next.set(day, body.counts[day] ?? 0);
          return next;
        });
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [view, locale, strip.from, strip.days]);

  const apply = useCallback((b: CalBooking) => {
    setStore((s) => ({ ...s, bookings: new Map(s.bookings).set(b.id, b) }));
  }, []);
  /** The server's answer is applied at once; this re-reads the visible days so the grid stays true. */
  const refresh = () => void load(range.from, range.days, true);

  const [showCancelled, setShowCancelled] = useState(false);
  const timeOff = useMemo(() => [...store.timeOff.values()], [store.timeOff]);
  const liveByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of store.bookings.values()) {
      if (!isLive(b.status)) continue;
      const key = dayKeyOf(b.start);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [store.bookings]);
  const countOf = useCallback(
    (day: string) => (store.loaded.has(day) ? (liveByDay.get(day) ?? 0) : (counts.get(day) ?? 0)),
    [store.loaded, liveByDay, counts],
  );

  const inView = useMemo(() => {
    const set = new Set(visibleDays);
    return [...store.bookings.values()].filter((b) => set.has(dayKeyOf(b.start)));
  }, [store.bookings, visibleDays]);
  const shown = useMemo(
    () => inView.filter((b) => showCancelled || b.status !== "cancelled"),
    [inView, showCancelled],
  );
  const live = inView.filter((b) => isLive(b.status));
  const cancelledCount = inView.length - inView.filter((b) => b.status !== "cancelled").length;
  const band = useMemo(() => hourBand(visibleDays, hours, shown), [visibleDays, hours, shown]);
  const loading = Boolean(view) && !visibleDays.every((k) => store.loaded.has(k));

  // ------------------------------------------------------------ navigation
  const direction = useRef<-1 | 0 | 1>(0);
  const navigate = useCallback((next: { view?: CalView; date?: string }, dir: -1 | 0 | 1 = 0) => {
    const params = new URLSearchParams(window.location.search);
    if (next.view) params.set("view", next.view);
    if (next.date) params.set("date", next.date);
    direction.current = dir;
    window.history.pushState(null, "", `?${params}`);
  }, []);
  const step = useCallback(
    (dir: 1 | -1) => view && navigate({ date: stepAnchor(view, anchor, dir) }, dir),
    [view, anchor, navigate],
  );
  const goToday = useCallback(
    () => navigate({ date: todayKey }, todayKey > anchor ? 1 : todayKey < anchor ? -1 : 0),
    [navigate, todayKey, anchor],
  );

  // Paging slides the grid in from the side it came from.
  const rangeKey = `${view}|${range.from}|${range.days}`;
  useGSAP(
    () => {
      const dir = direction.current;
      direction.current = 0;
      if (!dir || !window.matchMedia(MOTION_OK).matches) return;
      gsap.fromTo("[data-stage]", { x: dir * 28, autoAlpha: 0.3 }, { x: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out" });
    },
    { dependencies: [rangeKey], scope: root },
  );

  // -------------------------------------------------------------- overlays
  const [details, setDetails] = useState<{ id: number; open: boolean } | null>(null);
  const [draft, setDraft] = useState<{ date: string; start: number; auto: boolean; key: number; open: boolean } | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const formId = useId();
  const dateInput = useRef<HTMLInputElement>(null);

  const say = useCallback((message: Omit<ToastMessage, "id">) => setToast({ ...message, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.action ? 7000 : 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useGSAP(
    () => {
      if (!toast || !window.matchMedia(MOTION_OK).matches) return;
      gsap.fromTo("[data-toast]", { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4 });
    },
    { dependencies: [toast?.id], scope: root },
  );

  const errorText = (error: string) => (error === "conflict" ? cal.toast.conflict : cal.toast.error);
  const whenLabel = (ms: number) =>
    `${formatInTz(new Date(ms), locale, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")}, ${fromMinutes(minuteOf(ms))}`;

  /** A block that just changed gives a small settle, so the eye finds where it landed. */
  const settle = (id: number) =>
    requestAnimationFrame(() => {
      const el = root.current?.querySelector(`[data-booking="${id}"]`);
      if (!el || !window.matchMedia(MOTION_OK).matches) return;
      gsap.fromTo(el, { scale: 1.05 }, { scale: 1, duration: 0.45, ease: "back.out(2)", clearProps: "transform" });
    });

  async function commit(
    b: CalBooking,
    start: number,
    end: number,
    kind: "move" | "resize",
    undoable = true,
  ): Promise<string | null> {
    const prev = storeRef.current.bookings.get(b.id) ?? b;
    apply({ ...prev, start, end });
    const res = await moveBooking({
      id: b.id,
      date: dayKeyOf(start),
      time: fromMinutes(minuteOf(start)),
      durationMin: Math.round((end - start) / 60_000),
    });
    if (!res.ok) {
      apply(prev);
      say({ tone: "error", text: errorText(res.error) });
      return errorText(res.error);
    }
    apply(res.booking);
    settle(b.id);
    refresh();
    say({
      tone: "ok",
      text:
        kind === "resize"
          ? fmt(cal.toast.resized, { n: durationMin(res.booking) })
          : fmt(cal.toast.moved, { when: whenLabel(res.booking.start) }),
      action: undoable
        ? { label: cal.toast.undo, run: () => void commit(res.booking, prev.start, prev.end, kind, false) }
        : undefined,
    });
    return null;
  }

  async function changeStatus(b: CalBooking, status: BookingStatus, undoable = true): Promise<string | null> {
    apply({ ...b, status });
    const res = await setCalendarStatus({ id: b.id, status });
    if (!res.ok) {
      apply(b);
      return errorText(res.error);
    }
    apply(res.booking);
    refresh();
    say({
      tone: "ok",
      text: fmt(cal.toast.statusSet, { status: t.status[status] }),
      action: undoable
        ? { label: cal.toast.undo, run: () => void changeStatus(res.booking, b.status, false) }
        : undefined,
    });
    return null;
  }

  async function changeDetails(b: CalBooking, changes: { price?: number; comment?: string }): Promise<string | null> {
    const res = await updateBookingDetails({ id: b.id, ...changes });
    if (!res.ok) return errorText(res.error);
    apply(res.booking);
    say({ tone: "ok", text: cal.toast.saved });
    return null;
  }

  async function create(input: NewBookingInput): Promise<string | null> {
    const res = await createCalendarBooking({ ...input, locale });
    if (!res.ok) {
      if (res.error === "invalidPhone") return cal.toast.invalidPhone;
      if (res.error === "invalidName") return cal.toast.invalidName;
      return errorText(res.error);
    }
    apply(res.booking);
    closeDraft();
    const day = dayKeyOf(res.booking.start);
    if (!visibleDays.includes(day)) navigate({ date: day }, day > anchor ? 1 : -1);
    settle(res.booking.id);
    refresh();
    say({ tone: "ok", text: fmt(cal.toast.created, { when: whenLabel(res.booking.start) }) });
    return null;
  }

  /** Where "new booking" starts: the next half hour today, else the day's opening time. */
  const defaultSlot = useMemo(() => {
    const date = visibleDays.includes(todayKey) ? todayKey : anchor;
    const window_ = workingWindow(date, hours);
    let start = window_?.open ?? 10 * 60;
    if (date === todayKey) start = Math.max(start, Math.ceil((minuteOf(now) + 1) / 30) * 30);
    if (window_ && start >= window_.close) start = window_.open;
    return { date, start: Math.min(start, 21 * 60) };
  }, [visibleDays, todayKey, anchor, hours, now]);

  const openCreate = useCallback((date: string, start: number, auto = false) => {
    setDetails((d) => d && { ...d, open: false });
    setDraft({ date, start, auto, key: Date.now(), open: true });
  }, []);
  const newBooking = useCallback(() => openCreate(defaultSlot.date, defaultSlot.start, true), [openCreate, defaultSlot]);

  // Links elsewhere in the admin open the form directly with ?new=1.
  const urlNew = search.get("new") === "1" && view !== null;
  const activeDraft = draft ?? (urlNew ? { ...defaultSlot, auto: true, key: 0, open: true } : null);
  const closeDraft = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("new")) {
      params.delete("new");
      window.history.replaceState(null, "", params.size ? `?${params}` : window.location.pathname);
    }
    setDraft(activeDraft && { ...activeDraft, open: false });
  };

  const sheetOpen = Boolean(details?.open || activeDraft?.open);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || sheetOpen) return;
      if (e.target instanceof Element && e.target.closest("input, textarea, select, dialog")) return;
      const keys: Record<string, () => void> = {
        t: goToday,
        d: () => navigate({ view: "day" }),
        w: () => navigate({ view: "week" }),
        n: newBooking,
        arrowright: () => step(1),
        arrowleft: () => step(-1),
      };
      const run = keys[e.key.toLowerCase()];
      if (!run) return;
      e.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, goToday, navigate, step, newBooking]);

  const openBooking = details ? store.bookings.get(details.id) : undefined;
  const expected = live.reduce((sum, b) => sum + b.price, 0);
  const dayWindow = view === "day" ? workingWindow(anchor, hours) : null;

  return (
    <div ref={root}>
      <PageHeader
        title={view ? (desktop ? rangeTitle(view, anchor, locale) : rangeTitleShort(view, anchor, locale)) : cal.title}
        description={
          !view || loading
            ? undefined
            : live.length
              ? `${fmt(cal.summary.bookings, { n: live.length })}, ${fmt(cal.summary.expected, { sum: formatPrice(expected, locale) })}`
              : cal.summary.none
        }
        actions={
          <Button onClick={newBooking} className="max-lg:hidden">
            <Plus size={18} weight="bold" />
            {cal.newLong}
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 lg:mb-4">
        <div className="-ml-1.5 flex items-center gap-0.5">
          <IconButton label={view === "day" ? cal.prevDay : cal.prevWeek} onClick={() => step(-1)}>
            <CaretLeft size={20} weight="bold" />
          </IconButton>
          <Button variant="soft" size="sm" className="h-10 max-sm:px-3" onClick={goToday} disabled={anchor === todayKey}>
            {cal.today}
          </Button>
          <IconButton label={view === "day" ? cal.nextDay : cal.nextWeek} onClick={() => step(1)}>
            <CaretRight size={20} weight="bold" />
          </IconButton>
        </div>

        <div className="flex items-center gap-1.5">
          {cancelledCount > 0 && (
            <Button
              variant={showCancelled ? "soft" : "ghost"}
              size="sm"
              aria-pressed={showCancelled}
              onClick={() => setShowCancelled((v) => !v)}
              className="h-10 max-sm:hidden"
            >
              {fmt(cal.cancelled, { n: cancelledCount })}
            </Button>
          )}
          <div role="group" aria-label={cal.view} className="flex rounded-full bg-fg/7 p-1">
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => navigate({ view: v })}
                className={cn(
                  "h-9 rounded-full px-3 text-sm font-semibold transition-colors duration-200 sm:px-4",
                  view === v ? "bg-surface text-fg shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-muted hover:text-fg",
                )}
              >
                <span className="sm:hidden">{cal.viewsShort[v]}</span>
                <span className="max-sm:hidden">{cal.views[v]}</span>
              </button>
            ))}
          </div>
          <span className="relative -mr-1.5">
            <IconButton
              label={cal.jump}
              onClick={() => {
                const input = dateInput.current!;
                // showPicker is missing on older Safari; focusing the input opens its picker there.
                if (input.showPicker) input.showPicker();
                else input.focus();
              }}
            >
              <CalendarBlank size={20} weight="bold" />
            </IconButton>
            <input
              ref={dateInput}
              type="date"
              tabIndex={-1}
              aria-hidden
              value={anchor}
              onChange={(e) => {
                const value = e.target.value;
                if (isDateKey(value)) navigate({ date: value }, value > anchor ? 1 : -1);
              }}
              className="pointer-events-none absolute inset-0 opacity-0"
            />
          </span>
        </div>
      </div>

      {loadError && (
        <p role="alert" className="mb-3 rounded-field bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {cal.toast.loadError}
        </p>
      )}

      {view === "day" && (
        <DayStrip
          anchor={anchor}
          todayKey={todayKey}
          locale={locale}
          hours={hours}
          countOf={countOf}
          onPick={(day) => navigate({ date: day }, day > anchor ? 1 : day < anchor ? -1 : 0)}
        />
      )}

      <div data-stage>
        {!view ? (
          <GridSkeleton />
        ) : (
          <>
            {view === "day" && !loading && shown.length === 0 && (
              <div className="mb-3 rounded-frame border border-dashed border-line-strong px-5 py-4">
                <p className="display text-[1.5rem]">{dayWindow ? cal.grid.emptyTitle : cal.grid.closedTitle}</p>
                <p className="mt-1 text-sm text-muted">{dayWindow ? cal.grid.emptyBody : cal.grid.closedBody}</p>
              </div>
            )}
            <div className={cn(loading && "opacity-60")}>
              <TimeGrid
                days={visibleDays}
                band={band}
                bookings={shown}
                timeOff={timeOff}
                hours={hours}
                todayKey={todayKey}
                now={now}
                locale={locale}
                selectedId={details?.open ? details.id : null}
                countOf={countOf}
                onOpen={(b) => {
                  setDraft((d) => d && { ...d, open: false });
                  setDetails({ id: b.id, open: true });
                }}
                onCreate={(date, start) => openCreate(date, start)}
                onCommit={(b, start, end, kind) => void commit(b, start, end, kind)}
                onSwipe={step}
                onPickDay={(day) => navigate({ view: "day", date: day })}
              />
            </div>
          </>
        )}
      </div>

      {/* Phones: the primary action floats above the tab bar, under the thumb. */}
      <div className="fixed right-4 bottom-[calc(60px+env(safe-area-inset-bottom)+0.875rem)] z-(--z-chrome) lg:hidden">
        <Button
          size="lg"
          onClick={newBooking}
          className="pl-5 shadow-[0_10px_28px_color-mix(in_srgb,var(--accent)_38%,transparent)]"
        >
          <Plus size={20} weight="bold" />
          {cal.new}
        </Button>
      </div>

      <Sheet
        open={Boolean(details?.open && openBooking)}
        onClose={() => setDetails((d) => d && { ...d, open: false })}
        title={cal.details.title}
        closeLabel={t.common.close}
        footer={
          openBooking && (
            <BookingSheetFooter
              key={`${openBooking.id}:${openBooking.status}`}
              booking={openBooking}
              onStatus={(status) => changeStatus(openBooking, status)}
            />
          )
        }
      >
        {openBooking && (
          <BookingSheetBody
            // Remount when the booking changes underneath, so the form starts from the saved values.
            key={`${openBooking.id}:${openBooking.start}:${openBooking.end}:${openBooking.price}:${openBooking.comment}`}
            booking={openBooking}
            locale={locale}
            onStatus={(status) => changeStatus(openBooking, status)}
            onMove={(date, time, minutes) => {
              const start = instant(date, toMinutes(time));
              const kind = start === openBooking.start ? "resize" : "move";
              return commit(openBooking, start, start + minutes * 60_000, kind);
            }}
            onDetails={(changes) => changeDetails(openBooking, changes)}
          />
        )}
      </Sheet>

      <Sheet
        open={Boolean(activeDraft?.open)}
        onClose={closeDraft}
        title={cal.create.title}
        closeLabel={t.common.close}
        footer={
          <Button type="submit" form={formId} size="lg" className="w-full" disabled={creating}>
            {creating ? cal.create.submitting : cal.create.submit}
          </Button>
        }
      >
        {activeDraft && (
          <NewBookingForm
            key={activeDraft.key}
            formId={formId}
            locale={locale}
            services={services}
            initial={activeDraft}
            onSubmit={create}
            onPending={setCreating}
          />
        )}
      </Sheet>

      {toast && (
        <div
          data-toast
          role="status"
          className="fixed inset-x-4 bottom-[calc(60px+env(safe-area-inset-bottom)+5.25rem)] z-(--z-toast) mx-auto flex w-fit max-w-full items-center gap-3 rounded-full bg-inverse py-2 pr-2 pl-5 text-sm font-medium text-on-inverse shadow-[0_12px_40px_rgb(0_0_0/0.25)] lg:bottom-8"
        >
          <span className={cn("min-w-0", !toast.action && "py-1.5 pr-3")}>{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action!.run();
                setToast(null);
              }}
              className="h-9 shrink-0 rounded-full bg-on-inverse/12 px-4 font-semibold hover:bg-on-inverse/20"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );

}
