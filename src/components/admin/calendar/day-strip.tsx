"use client";
import { useLayoutEffect, useRef } from "react";
import { fmt, type Locale } from "@/i18n/config";
import { useAdminI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { formatDateKey, isoWeekday } from "@/lib/time";
import { daysOf, STRIP_WEEKS_AROUND, stripRange } from "./range";
import type { CalHours } from "./types";

/**
 * Week-by-week day picker for the day view. Each page is one week and snaps
 * into place; the selected day's week is always the middle page.
 */
export function DayStrip({
  anchor,
  todayKey,
  locale,
  hours,
  countOf,
  onPick,
}: {
  anchor: string;
  todayKey: string;
  locale: Locale;
  hours: CalHours[];
  countOf: (day: string) => number;
  onPick: (day: string) => void;
}) {
  const { t } = useAdminI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const { from, days } = stripRange(anchor);
  const weeks = Array.from({ length: days / 7 }, (_, i) => daysOf(from, days).slice(i * 7, i * 7 + 7));
  const closed = new Set(hours.filter((h) => !h.isOpen).map((h) => h.weekday));

  // Re-centre on the selected week whenever it changes, before the browser paints.
  useLayoutEffect(() => {
    const el = scroller.current!;
    el.scrollLeft = el.clientWidth * STRIP_WEEKS_AROUND;
  }, [from]);

  return (
    <div
      ref={scroller}
      className="no-scrollbar mb-3 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-frame border border-line bg-surface"
    >
      {weeks.map((week) => (
        <div key={week[0]} className="grid w-full shrink-0 snap-start grid-cols-7 gap-0.5 p-1.5">
          {week.map((day) => {
            const selected = day === anchor;
            const isToday = day === todayKey;
            const count = countOf(day);
            const off = closed.has(isoWeekday(day));
            return (
              <button
                key={day}
                type="button"
                onClick={() => onPick(day)}
                aria-current={selected ? "date" : undefined}
                aria-label={fmt(t.cal.grid.dayLabel, {
                  day: formatDateKey(day, locale, { weekday: "long", day: "numeric", month: "long" }),
                  n: count,
                })}
                className={cn(
                  "flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-field transition-colors duration-200",
                  selected ? "bg-fg text-bg" : "hover:bg-fg/6",
                )}
              >
                <span className={cn("label", selected ? "text-bg/70" : isToday ? "text-accent-text" : "text-muted")}>
                  {formatDateKey(day, locale, { weekday: "short" }).replace(".", "")}
                </span>
                <span
                  className={cn(
                    "display tnum text-[1.75rem]",
                    !selected && (isToday ? "text-accent-text" : off && !count ? "text-faint" : "text-fg"),
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                <span className={cn("tnum text-[0.6875rem] leading-none font-semibold", selected ? "text-bg/70" : "text-muted")}>
                  {count || " "}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
