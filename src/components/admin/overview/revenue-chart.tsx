"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { formatPrice, intlLocale } from "@/lib/time";

export type ChartWeek = {
  key: string;
  /** Short axis label: the Monday the week starts on. */
  label: string;
  /** Full range for the tooltip and the table. */
  range: string;
  total: number;
  count: number;
  /** The running week is still filling up, so it is drawn as an outline. */
  current: boolean;
};

type Labels = {
  summary: string;
  amount: string;
  visits: string;
  period: string;
  inProgress: string;
  table: string;
  hideTable: string;
  noData: string;
};

const HEIGHT = 248;
const M = { top: 14, right: 2, bottom: 28 };
const MAX_BAR = 30;

/** Rounds the axis ceiling up to a 1, 2, 2.5 or 5 step so ticks land on clean numbers. */
function niceScale(max: number, ticks = 4) {
  const rough = Math.max(max, 1) / ticks;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough)!;
  const top = Math.ceil(Math.max(max, 1) / step) * step;
  return { top, step };
}

/** Bar anchored to the baseline with only its data end rounded. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function RevenueChart({ weeks, locale, labels }: { weeks: ChartWeek[]; locale: Locale; labels: Labels }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  useEffect(() => {
    const el = wrap.current!;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ready = width > 0;
  useGSAP(
    () => {
      if (!ready || !window.matchMedia(MOTION_OK).matches) return;
      gsap.from("[data-bar]", {
        scaleY: 0,
        transformOrigin: "50% 100%",
        duration: 0.8,
        stagger: 0.035,
      });
    },
    { dependencies: [ready], scope: wrap },
  );

  const hasData = weeks.some((w) => w.total > 0);
  const compact = new Intl.NumberFormat(intlLocale[locale], { notation: "compact", maximumFractionDigits: 1 });
  const { top, step } = niceScale(Math.max(...weeks.map((w) => w.total)));
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  // Compact units differ per language ("30 K" against "30 тыс."), so the gutter follows the widest tick.
  const left = Math.max(...ticks.map((tick) => compact.format(tick).length)) * 6.4 + 16;
  const innerW = Math.max(width - left - M.right, 0);
  const innerH = HEIGHT - M.top - M.bottom;
  const band = weeks.length ? innerW / weeks.length : 0;
  const barW = Math.min(band * 0.62, MAX_BAR);
  const y = (value: number) => M.top + innerH - (value / top) * innerH;
  // Skip axis labels on narrow screens instead of letting them collide.
  const every = band >= 58 ? 1 : band >= 30 ? 2 : 3;
  const focus = active === null ? null : weeks[active];
  const focusX = active === null ? 0 : left + band * active + band / 2;

  const pick = (clientX: number) => {
    const rect = wrap.current!.getBoundingClientRect();
    const index = Math.floor((clientX - rect.left - left) / band);
    setActive(index >= 0 && index < weeks.length ? index : null);
  };

  return (
    <div>
      <div ref={wrap} className="relative" style={{ height: HEIGHT }}>
        {!hasData ? (
          <p className="absolute inset-0 flex items-center justify-center text-center text-[0.9375rem] text-muted">
            {labels.noData}
          </p>
        ) : ready ? (
          <>
            <svg
              width={width}
              height={HEIGHT}
              role="img"
              aria-label={labels.summary}
              className="block touch-pan-y"
              onPointerMove={(e) => pick(e.clientX)}
              onPointerDown={(e) => pick(e.clientX)}
              onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
            >
              {ticks.map((tick) => (
                <g key={tick}>
                  <line x1={left} x2={width - M.right} y1={y(tick)} y2={y(tick)} stroke="var(--line)" />
                  <text
                    x={left - 10}
                    y={y(tick)}
                    dy="0.32em"
                    textAnchor="end"
                    fontSize="11"
                    fill="var(--muted)"
                    className="tnum"
                  >
                    {compact.format(tick)}
                  </text>
                </g>
              ))}
              {weeks.map((week, i) => {
                const x = left + band * i + (band - barW) / 2;
                const h = (week.total / top) * innerH;
                const dimmed = active !== null && active !== i;
                return (
                  <g key={week.key} opacity={dimmed ? 0.4 : 1}>
                    {week.total > 0 && (
                      <path
                        data-bar
                        d={barPath(x, y(week.total), barW, h)}
                        fill={week.current ? "var(--accent-soft)" : "var(--accent)"}
                        stroke={week.current ? "var(--accent)" : undefined}
                        strokeWidth={week.current ? 1.5 : undefined}
                      />
                    )}
                    {i % every === 0 && (
                      <text
                        x={x + barW / 2}
                        y={HEIGHT - 8}
                        textAnchor="middle"
                        fontSize="11"
                        fill="var(--muted)"
                        className="tnum"
                      >
                        {week.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            {focus && (
              <div
                role="status"
                className="pointer-events-none absolute top-0 z-10 w-max max-w-[220px] -translate-x-1/2 rounded-field bg-inverse px-3 py-2 text-on-inverse shadow-[0_8px_30px_rgb(0_0_0/0.18)]"
                style={{ left: Math.min(Math.max(focusX, 96), Math.max(width - 96, 96)) }}
              >
                <p className="text-xs text-on-inverse-muted">
                  {focus.range}
                  {focus.current ? `, ${labels.inProgress}` : ""}
                </p>
                <p className="tnum mt-0.5 text-[0.9375rem] font-semibold">{formatPrice(focus.total, locale)}</p>
                <p className="tnum text-xs text-on-inverse-muted">
                  {labels.visits}: {focus.count}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="skeleton absolute inset-x-0 top-3 bottom-7" />
        )}
      </div>

      {hasData && (
        <>
          <button
            type="button"
            onClick={() => setTable((v) => !v)}
            aria-expanded={table}
            className="mt-2 inline-flex h-11 items-center text-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            {table ? labels.hideTable : labels.table}
          </button>
          {table && (
            <table className="mt-1 w-full text-sm">
              <thead>
                <tr className="label text-left text-muted">
                  <th scope="col" className="py-2 font-semibold">
                    {labels.period}
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    {labels.visits}
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    {labels.amount}
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={week.key} className="border-t border-line">
                    <td className="py-2.5">
                      {week.range}
                      {week.current ? <span className="text-muted">, {labels.inProgress}</span> : null}
                    </td>
                    <td className="tnum py-2.5 text-right">{week.count}</td>
                    <td className="tnum py-2.5 text-right font-medium">{formatPrice(week.total, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
