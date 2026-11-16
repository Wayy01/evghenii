import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** On/off row: the label and hint are the tap target, the pill shows the state. */
export function Switch({
  label,
  hint,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type" | "className"> & { label: string; hint?: string; className?: string }) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-5", className)}>
      <span className="min-w-0">
        <span className="block text-[0.9375rem] font-semibold">{label}</span>
        {hint ? <span className="mt-0.5 block text-sm text-muted">{hint}</span> : null}
      </span>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className="relative h-7 w-12 shrink-0 rounded-full bg-fg/18 transition-colors duration-200 peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent peer-disabled:opacity-50 after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-on-accent after:shadow-[0_1px_3px_rgb(0_0_0/0.3)] after:transition-transform after:duration-200 after:ease-out-expo peer-checked:after:translate-x-5"
      />
    </label>
  );
}

const segmentTrack = "inline-flex max-w-full rounded-full bg-fg/7 p-1";
const segmentItem =
  "inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-200";
const segmentOn = "bg-surface text-fg shadow-[0_1px_2px_rgb(0_0_0/0.14)]";
const segmentOff = "text-muted hover:text-fg";

/** Section switch that lives in the URL, so a tab can be linked and survives a reload. */
export function Tabs({
  label,
  value,
  options,
  className,
}: {
  label: string;
  value: string;
  options: { value: string; href: string; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn(segmentTrack, className)}>
      {options.map((option) => (
        <Link
          key={option.value}
          href={option.href}
          aria-current={option.value === value ? "page" : undefined}
          className={cn(segmentItem, option.value === value ? segmentOn : segmentOff)}
        >
          {option.label}
          {option.count != null ? <span className="tnum font-normal text-muted">{option.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** Same look as Tabs, for a choice held in component state. */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn(segmentTrack, className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(segmentItem, option.value === value ? segmentOn : segmentOff)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Radio group drawn as pills; works as a plain form field. */
export function RadioPills({
  name,
  legend,
  defaultValue,
  options,
}: {
  name: string;
  legend: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="peer sr-only"
            />
            <span className="inline-flex h-11 items-center rounded-full border border-line-strong px-5 text-[0.9375rem] font-semibold transition-colors duration-200 peer-checked:border-fg peer-checked:bg-fg peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** One line of feedback next to a save button: working, done, or what went wrong. */
export function SaveStatus({
  pending,
  ok,
  error,
  labels,
  className,
}: {
  pending: boolean;
  ok: boolean;
  error?: string | null;
  labels: { saving: string; saved: string };
  className?: string;
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn("min-w-0 text-sm", error && !pending ? "text-danger" : "text-muted", className)}
    >
      {pending ? labels.saving : error ? error : ok ? labels.saved : ""}
    </p>
  );
}

const HALF_HOURS = Array.from(
  { length: 48 },
  (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
);

/**
 * 24-hour time choice in half-hour steps. A select instead of a native time
 * input, which shows AM/PM whenever the device language is English.
 */
export function TimeSelect({
  value,
  defaultValue,
  allowEmpty,
  className,
  ...props
}: Omit<ComponentProps<"select">, "children" | "value" | "defaultValue"> & {
  value?: string;
  defaultValue?: string;
  /** Adds a blank first choice for times that may be left unset. */
  allowEmpty?: boolean;
}) {
  const current = value ?? defaultValue;
  // A stored time off the half-hour grid stays selectable.
  const options = current && !HALF_HOURS.includes(current) ? [...HALF_HOURS, current].sort() : HALF_HOURS;
  return (
    <span className={cn("relative block", className)}>
      <select
        value={value}
        defaultValue={defaultValue}
        className="tnum block h-11 w-full appearance-none rounded-field border border-line-strong bg-surface pr-8 pl-3 text-base text-fg transition-[border-color,box-shadow] duration-150 hover:border-fg/50 focus:border-accent focus:ring-3 focus:ring-accent-soft focus:outline-none aria-invalid:border-danger"
        {...props}
      >
        {allowEmpty && <option value="">--:--</option>}
        {options.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
      <CaretDown
        size={14}
        weight="bold"
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
      />
    </span>
  );
}
