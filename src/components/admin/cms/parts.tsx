"use client";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { Localized } from "@/lib/site-config";
import { cn } from "@/lib/cn";

let counter = 0;
/** Local id for a list row that has no id of its own (points, lines, links). */
export const uid = () => `row-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** One piece of copy in both site languages, side by side on wide screens. */
export function LocalizedField({
  id,
  label,
  value,
  onChange,
  multiline,
  maxLength = 2000,
  invalid,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: Localized;
  onChange: (value: Localized) => void;
  multiline?: boolean;
  maxLength?: number;
  /** Marks the Romanian field, which is the one that must be filled. */
  invalid?: boolean;
  error?: string | null;
  hint?: string;
}) {
  const Control = multiline ? Textarea : Input;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(["ro", "ru"] as const).map((lang) => (
        <Field
          key={lang}
          label={`${label} (${lang.toUpperCase()})`}
          htmlFor={`${id}-${lang}`}
          error={lang === "ro" ? error : undefined}
          hint={lang === "ro" ? hint : undefined}
        >
          <Control
            id={`${id}-${lang}`}
            lang={lang}
            maxLength={maxLength}
            value={value[lang]}
            onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
            aria-invalid={(lang === "ro" && invalid) || undefined}
            className={multiline ? "min-h-24!" : undefined}
          />
        </Field>
      ))}
    </div>
  );
}

/** Bare on/off pill for rows that already carry their own text. */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center" title={label}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span
        aria-hidden
        className="relative h-7 w-12 rounded-full bg-fg/18 transition-colors duration-200 peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-on-accent after:shadow-[0_1px_3px_rgb(0_0_0/0.3)] after:transition-transform after:duration-200 after:ease-out-expo peer-checked:after:translate-x-5"
      />
    </label>
  );
}

/** Warns before the tab is closed or reloaded with edits that were not saved. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

/** Save bar that stays in reach: above the phone tab bar, at the foot of the page on wide screens. */
export function SaveBar({
  dirty,
  pending,
  saved,
  error,
  onSave,
  onDiscard,
  labels,
  children,
}: {
  dirty: boolean;
  pending: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
  onDiscard: () => void;
  labels: { save: string; saving: string; saved: string; unsaved: string; discard: string };
  children?: ReactNode;
}) {
  const status = pending ? labels.saving : error ? error : dirty ? labels.unsaved : saved ? labels.saved : "";
  // Nothing to say and nothing to save: stay out of the way.
  if (!dirty && !pending && !saved && !error) return null;
  return (
    <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-8 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[28px] border border-line bg-surface/95 py-2 pr-2 pl-5 shadow-[0_10px_40px_rgb(0_0_0/0.14)] backdrop-blur-md lg:bottom-5">
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "min-w-0 flex-1 text-sm",
          error && !pending ? "text-danger" : saved && !dirty && !pending ? "font-semibold text-ok" : "text-muted",
        )}
      >
        {status}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {children}
        {dirty && !pending ? (
          <Button variant="ghost" onClick={onDiscard}>
            {labels.discard}
          </Button>
        ) : null}
        <Button onClick={onSave} disabled={!dirty || pending} className="min-w-32">
          {labels.save}
        </Button>
      </div>
    </div>
  );
}
