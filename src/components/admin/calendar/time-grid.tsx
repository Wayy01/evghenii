"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { fmt, tr, type Locale } from "@/i18n/config";
import { useAdminI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { formatDateKey, formatPrice, fromMinutes, isoWeekday, toMinutes } from "@/lib/time";
import {
  dayKeyOf,
  durationMin,
  instant,
  minuteOf,
  placeDay,
  snap,
  SNAP_MIN,
  type HourBand,
} from "./range";
import { hatch, tone } from "./tone";
import type { CalBooking, CalHours, CalTimeOff } from "./types";

type Props = {
  days: string[];
  band: HourBand;
  bookings: CalBooking[];
  timeOff: CalTimeOff[];
  hours: CalHours[];
  todayKey: string;
  now: number;
  locale: Locale;
  selectedId: number | null;
  countOf: (day: string) => number;
  onOpen: (b: CalBooking) => void;
  onCreate: (date: string, startMin: number) => void;
  onCommit: (b: CalBooking, start: number, end: number, kind: "move" | "resize") => void;
  onSwipe: (dir: 1 | -1) => void;
  onPickDay: (date: string) => void;
};

type Geometry = { body: DOMRect; cols: DOMRect[]; ppm: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** New bookings start on the half hour; the sheet can fine-tune from there. */
const CREATE_STEP = 30;

function colAt(cols: DOMRect[], x: number) {
  let best = 0;
  let bestDistance = Infinity;
  cols.forEach((r, i) => {
    const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

/**
 * Hour grid for one or seven days. With a mouse, blocks can be dragged to
 * another time or day and stretched from their bottom edge; a click or tap on
 * free time starts a new booking there.
 */
export function TimeGrid(props: Props) {
  const { days, band, bookings, timeOff, hours, todayKey, now, locale, countOf } = props;
  const { t } = useAdminI18n();
  const cal = t.cal;
  const body = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const ghostLabel = useRef<HTMLSpanElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const hintLabel = useRef<HTMLSpanElement>(null);
  const [ppm, setPpm] = useState(1);
  const [narrow, setNarrow] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const suppressClick = useRef(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const single = days.length === 1;
  const top0 = band.startHour * 60;
  const total = (band.endHour - band.startHour) * 60;
  const pct = (minutes: number) => `${((minutes - top0) / total) * 100}%`;
  const columns = `var(--gutter) repeat(${days.length}, minmax(0, 1fr))`;

  // Block content adapts to the pixel height a booking actually gets.
  useEffect(() => {
    const el = body.current!;
    const observer = new ResizeObserver(([entry]) => {
      setPpm(entry.contentRect.height / total);
      // Seven columns on a phone leave room for a start time and nothing else.
      setNarrow(entry.contentRect.width / (days.length + 0.5) < 84);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [total, days.length]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalBooking[]>();
    for (const b of bookings) {
      const key = dayKeyOf(b.start);
      map.set(key, [...(map.get(key) ?? []), b]);
    }
    return map;
  }, [bookings]);

  const measure = (): Geometry => {
    const el = body.current!;
    const rect = el.getBoundingClientRect();
    const cols = Array.from(el.querySelectorAll<HTMLElement>("[data-col]")).map((c) => c.getBoundingClientRect());
    return { body: rect, cols, ppm: rect.height / total };
  };

  const paint = (el: HTMLDivElement, label: HTMLSpanElement, g: Geometry, col: number, start: number, dur: number, text: string) => {
    const c = g.cols[col];
    el.style.display = "block";
    el.style.left = `${c.left - g.body.left + 3}px`;
    el.style.width = `${c.width - 6}px`;
    el.style.top = `${(start - top0) * g.ppm}px`;
    el.style.height = `${Math.max(dur * g.ppm, 20)}px`;
    label.textContent = text;
  };
  const hide = (el: HTMLDivElement | null) => {
    if (el) el.style.display = "none";
  };

  /** Mouse drag on a booking: move it, or resize from the bottom edge. */
  const onBlockDown = (e: React.PointerEvent, b: CalBooking, mode: "move" | "resize") => {
    if (e.pointerType === "touch" || e.button !== 0 || b.status === "cancelled") return;
    e.stopPropagation();
    hide(hint.current);
    const g = measure();
    const origin = { col: Math.max(0, days.indexOf(dayKeyOf(b.start))), start: minuteOf(b.start), dur: durationMin(b) };
    const grab = (e.clientY - g.body.top) / g.ppm + top0 - origin.start;
    const s = { started: false, x0: e.clientX, y0: e.clientY, ...origin };

    const move = (ev: PointerEvent) => {
      if (!s.started) {
        if (Math.hypot(ev.clientX - s.x0, ev.clientY - s.y0) < 4) return;
        s.started = true;
        setDraggingId(b.id);
      }
      ev.preventDefault();
      const minuteAtPointer = (ev.clientY - g.body.top) / g.ppm + top0;
      if (mode === "move") {
        s.col = colAt(g.cols, ev.clientX);
        s.start = clamp(snap(minuteAtPointer - grab), top0, top0 + total - s.dur);
      } else {
        s.dur = clamp(snap(minuteAtPointer - s.start), SNAP_MIN, top0 + total - s.start);
      }
      paint(ghost.current!, ghostLabel.current!, g, s.col, s.start, s.dur, `${fromMinutes(s.start)} - ${fromMinutes(s.start + s.dur)}`);
    };

    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (!s.started) return;
      // The click that follows a drag must not open the sheet or start a booking.
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
      hide(ghost.current);
      setDraggingId(null);
      if (ev.type === "pointercancel") return;
      const start = instant(days[s.col], s.start);
      const end = start + s.dur * 60_000;
      if (start !== b.start || end !== b.end) props.onCommit(b, start, end, mode);
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const slotAt = (clientY: number, g: Geometry) =>
    clamp(
      Math.floor(((clientY - g.body.top) / g.ppm + top0) / CREATE_STEP) * CREATE_STEP,
      top0,
      top0 + total - CREATE_STEP,
    );

  /** A mouse hovering free time sees where a click would start a booking. */
  const onColumnMove = (e: React.PointerEvent, col: number) => {
    if (e.pointerType !== "mouse" || draggingId !== null) return;
    if ((e.target as HTMLElement).closest("[data-booking]")) return hide(hint.current);
    const g = measure();
    const start = slotAt(e.clientY, g);
    paint(hint.current!, hintLabel.current!, g, col, start, CREATE_STEP, fromMinutes(start));
  };

  const onColumnClick = (e: React.MouseEvent, day: string) => {
    if (suppressClick.current || (e.target as HTMLElement).closest("[data-booking]")) return;
    props.onCreate(day, slotAt(e.clientY, measure()));
  };

  const hoursByDay = useMemo(() => new Map(hours.map((h) => [h.weekday, h])), [hours]);
  const nowKey = dayKeyOf(now);
  const nowMin = minuteOf(now);
  const nowVisible = days.includes(nowKey) && nowMin >= top0 && nowMin <= top0 + total;

  return (
    <div className="overflow-hidden rounded-frame border border-line bg-surface [--gutter:3rem] [--hour:5.25rem] lg:[--gutter:3.5rem] lg:[--hour:4rem]">
      {!single && (
        <div className="grid border-b border-line" style={{ gridTemplateColumns: columns }}>
          <span />
          {days.map((day) => {
            const isToday = day === todayKey;
            const closed = !hoursByDay.get(isoWeekday(day))?.isOpen;
            const count = countOf(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => props.onPickDay(day)}
                aria-label={fmt(cal.grid.dayLabel, {
                  day: formatDateKey(day, locale, { weekday: "long", day: "numeric", month: "long" }),
                  n: count,
                })}
                className="group flex min-w-0 flex-col items-center gap-1 border-l border-line px-1 py-2.5 transition-colors duration-200 hover:bg-fg/5 lg:flex-row lg:items-center lg:gap-3 lg:px-3"
              >
                <span
                  className={cn(
                    "display flex size-9 shrink-0 items-center justify-center rounded-full text-[1.625rem] tnum lg:size-11 lg:text-[2rem]",
                    isToday ? "bg-accent text-on-accent" : day < todayKey ? "text-faint" : "text-fg",
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                <span className="grid min-w-0 justify-items-center gap-0.5 lg:justify-items-start">
                  <span className={cn("label", isToday ? "text-accent-text" : "text-muted")}>
                    {formatDateKey(day, locale, { weekday: "short" }).replace(".", "")}
                  </span>
                  <span className="tnum hidden truncate text-xs text-faint lg:block">
                    {closed && !count ? cal.grid.closed : count ? fmt(cal.grid.count, { n: count }) : " "}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={body}
        onPointerDown={(e) => {
          swipe.current = e.pointerType === "touch" ? { x: e.clientX, y: e.clientY } : null;
        }}
        onPointerUp={(e) => {
          const from = swipe.current;
          swipe.current = null;
          if (!from) return;
          const dx = e.clientX - from.x;
          const dy = e.clientY - from.y;
          if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            suppressClick.current = true;
            window.setTimeout(() => (suppressClick.current = false), 0);
            props.onSwipe(dx < 0 ? 1 : -1);
          }
        }}
        onPointerCancel={() => (swipe.current = null)}
        onPointerLeave={() => hide(hint.current)}
        className="relative grid touch-pan-y select-none"
        style={{ gridTemplateColumns: columns, height: `calc(var(--hour) * ${band.endHour - band.startHour})` }}
      >
        {/* Gutter: hour labels and the current time */}
        <div className="relative">
          {Array.from({ length: band.endHour - band.startHour - 1 }, (_, i) => {
            const h = band.startHour + i + 1;
            return (
              <span
                key={h}
                className="tnum absolute right-2 -translate-y-1/2 text-xs text-faint"
                style={{ top: pct(h * 60) }}
              >
                {String(h).padStart(2, "0")}:00
              </span>
            );
          })}
          {nowVisible && (
            <span
              aria-label={cal.grid.now}
              className="tnum absolute right-1 z-20 -translate-y-1/2 rounded-full bg-accent px-1.5 py-0.5 text-[0.6875rem] leading-none font-semibold text-on-accent"
              style={{ top: pct(nowMin) }}
            >
              {fromMinutes(nowMin)}
            </span>
          )}
        </div>

        {days.map((day, col) => {
          const wh = hoursByDay.get(isoWeekday(day));
          const isOpen = Boolean(wh?.isOpen);
          const open = wh ? toMinutes(wh.openTime) : 0;
          const close = wh ? toMinutes(wh.closeTime) : 0;
          const placed = placeDay(byDay.get(day) ?? []);
          const dayStart = instant(day, 0);
          const dayEnd = dayStart + 86_400_000;
          const offs = timeOff.filter((o) => o.start < dayEnd && o.end > dayStart);
          return (
            <div
              key={day}
              data-col={day}
              onPointerMove={(e) => onColumnMove(e, col)}
              onClick={(e) => onColumnClick(e, day)}
              className={cn("relative min-w-0 border-l border-line", day === todayKey && !single && "bg-accent-soft/40")}
            >
              {/* Hour and half-hour lines */}
              <div aria-hidden className="pointer-events-none absolute inset-0">
                {Array.from({ length: (band.endHour - band.startHour) * 2 - 1 }, (_, i) => (
                  <span
                    key={i}
                    className={cn("absolute inset-x-0 border-t", i % 2 ? "border-line" : "border-dashed border-line/60")}
                    style={{ top: pct(top0 + (i + 1) * 30) }}
                  />
                ))}
              </div>

              {/* Closed days and time outside working hours */}
              {!isOpen ? (
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-sunken" />
              ) : (
                <>
                  {open > top0 && (
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 bg-sunken" style={{ height: pct(open) }} />
                  )}
                  {close < top0 + total && (
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 bg-sunken" style={{ top: pct(close) }} />
                  )}
                </>
              )}

              {offs.map((o) => {
                const s = o.start <= dayStart ? top0 : Math.max(top0, minuteOf(o.start));
                const e = o.end >= dayEnd ? top0 + total : Math.min(top0 + total, minuteOf(o.end));
                if (e <= s) return null;
                return (
                  <div
                    key={o.id}
                    className={cn("pointer-events-none absolute inset-x-0 overflow-hidden px-2 pt-1.5", hatch)}
                    style={{ top: pct(s), height: `${((e - s) / total) * 100}%` }}
                  >
                    <span className="block truncate text-xs font-medium text-muted">{o.reason || cal.grid.timeOff}</span>
                  </div>
                );
              })}

              {placed.map(({ booking: b, col: c, cols }) => (
                <Block
                  key={b.id}
                  b={b}
                  // A pixel of air above and below keeps back-to-back bookings apart.
                  top={`calc(${pct(minuteOf(b.start))} + 1px)`}
                  height={`calc(${(durationMin(b) / total) * 100}% - 2px)`}
                  px={durationMin(b) * ppm}
                  left={`calc(${(c / cols) * 100}% + 3px)`}
                  width={`calc(${100 / cols}% - 6px)`}
                  wide={single && cols === 1}
                  narrow={narrow}
                  service={tr(locale, b.serviceRo, b.serviceRu)}
                  price={formatPrice(b.price, locale)}
                  label={t.status[b.status]}
                  selected={props.selectedId === b.id}
                  dragging={draggingId === b.id}
                  onDown={onBlockDown}
                  onOpen={() => {
                    if (!suppressClick.current) props.onOpen(b);
                  }}
                />
              ))}

              {day === nowKey && nowVisible && (
                <span aria-hidden className="pointer-events-none absolute inset-x-0 z-20 h-0.5 -translate-y-1/2 bg-accent" style={{ top: pct(nowMin) }} />
              )}
            </div>
          );
        })}

        {/* Where a click would start a booking (mouse only) */}
        <div
          ref={hint}
          aria-hidden
          className="pointer-events-none absolute z-10 hidden rounded-field border border-dashed border-accent bg-accent-soft px-2 py-1"
        >
          <span ref={hintLabel} className="tnum block text-xs leading-4 font-semibold text-accent-text" />
        </div>
        {/* The slot a dragged booking would land on */}
        <div
          ref={ghost}
          aria-hidden
          className="pointer-events-none absolute z-30 hidden rounded-field border-2 border-accent bg-accent-soft px-2 py-1 shadow-[0_10px_30px_rgb(0_0_0/0.18)]"
        >
          <span ref={ghostLabel} className="tnum block truncate text-xs leading-4 font-semibold text-accent-text" />
        </div>
      </div>
    </div>
  );
}

type BlockProps = {
  b: CalBooking;
  top: string;
  height: string;
  px: number;
  left: string;
  width: string;
  wide: boolean;
  narrow: boolean;
  service: string;
  price: string;
  label: string;
  selected: boolean;
  dragging: boolean;
  onDown: (e: React.PointerEvent, b: CalBooking, mode: "move" | "resize") => void;
  onOpen: () => void;
};

const Block = memo(function Block(props: BlockProps) {
  const { b, px, wide, narrow, service, price } = props;
  const look = tone[b.status];
  const start = fromMinutes(minuteOf(b.start));
  const end = fromMinutes(minuteOf(b.end));
  // Pick a layout the pixel height can hold, so text is never cut mid-glyph.
  const steps = wide ? [64, 52, 0] : [60, 40, 15];
  const size = px >= steps[0] ? "lg" : px >= steps[1] ? "md" : px >= steps[2] ? "sm" : "xs";
  // A quarter-hour block is only a line tall; its text shrinks to stay inside it.
  const tiny = px < 24;
  const draggable = b.status !== "cancelled";

  return (
    <button
      type="button"
      data-booking={b.id}
      onPointerDown={(e) => props.onDown(e, b, "move")}
      onClick={(e) => {
        e.stopPropagation();
        props.onOpen();
      }}
      aria-label={`${start} - ${end}, ${b.clientName}, ${service}, ${props.label}`}
      title={size === "xs" ? `${start} ${b.clientName}` : undefined}
      className={cn(
        "group/block absolute z-10 flex overflow-hidden rounded-field text-left hover:z-[15] hover:shadow-[0_6px_20px_rgb(0_0_0/0.14)] focus-visible:z-[15]",
        draggable && "lg:cursor-grab lg:active:cursor-grabbing",
        look.block,
        props.selected && "ring-2 ring-accent",
        props.dragging && "opacity-40",
      )}
      style={{ top: props.top, height: props.height, left: props.left, width: props.width }}
    >
      <span aria-hidden className={cn("w-[3px] shrink-0", look.bar)} />
      {size === "xs" ? null : narrow ? (
        <span className={cn("tnum min-w-0 px-0.5 pt-1 text-[0.625rem] leading-none font-semibold", look.meta)}>{start}</span>
      ) : wide ? (
        <span className={cn("flex min-w-0 flex-1 justify-between gap-3 px-3", size === "sm" ? "items-center" : "py-2")}>
          <span className="min-w-0">
            <span className={cn("block truncate font-semibold", tiny ? "text-[0.8125rem] leading-none" : "text-[0.9375rem] leading-tight")}>
              {b.clientName}
            </span>
            {size !== "sm" && <span className="mt-0.5 block truncate text-sm leading-tight text-muted">{service}</span>}
          </span>
          <span className="shrink-0 text-right">
            <span className={cn("tnum block font-semibold", tiny ? "text-xs leading-none" : "text-sm leading-tight", look.meta)}>
              {start} - {end}
            </span>
            {size === "lg" && <span className="tnum mt-0.5 block text-sm leading-tight text-muted">{price}</span>}
          </span>
        </span>
      ) : size === "sm" ? (
        <span className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5">
          <span className={cn("tnum shrink-0 text-[0.6875rem] leading-none font-semibold", look.meta)}>{start}</span>
          <span className="min-w-0 truncate text-xs leading-none font-semibold">{b.clientName}</span>
        </span>
      ) : (
        <span className="min-w-0 flex-1 px-1.5 py-1 lg:px-2">
          <span className="block truncate text-[0.8125rem] leading-tight font-semibold">{b.clientName}</span>
          <span className={cn("tnum mt-0.5 block truncate text-xs leading-tight", look.meta)}>
            {start} - {end}
          </span>
          {size === "lg" && <span className="mt-0.5 block truncate text-xs leading-tight text-muted">{service}</span>}
        </span>
      )}
      {draggable && (
        <span
          aria-hidden
          onPointerDown={(e) => props.onDown(e, b, "resize")}
          className="absolute inset-x-0 bottom-0 hidden h-2 cursor-ns-resize after:absolute after:bottom-[3px] after:left-1/2 after:h-[3px] after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-fg/30 after:opacity-0 group-hover/block:after:opacity-100 lg:block"
        />
      )}
    </button>
  );
});
