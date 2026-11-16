"use client";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { inputClass } from "@/components/ui/field";
import { fmt, type Locale } from "@/i18n/config";
import type { AdminDict } from "@/i18n/dictionaries";
import { cn } from "@/lib/cn";

export type Draft = { value: string; invalid: boolean };

/** `{n}`, `{day}` and the like: the site fills these in, so an edit has to keep them. */
export const placeholdersOf = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])];

// Browsers without `field-sizing` get the height set by hand instead.
const growsNatively = typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

/**
 * One string in one language. It owns its own text, so typing re-renders this
 * field alone; the editor only hears about it through `report`.
 */
export const TextField = memo(function TextField({
  id,
  locale,
  name,
  saved,
  original,
  initial,
  report,
  t,
}: {
  /** `${locale}:${key}`, the field's identity in the editor's list of unsaved changes. */
  id: string;
  locale: Locale;
  /** Accessible name: what the string is and which language. */
  name: string;
  /** What the site shows right now. */
  saved: string;
  /** The built-in text. */
  original: string;
  /** An unsaved edit carried over from before this field was last hidden by a filter. */
  initial: string | undefined;
  report: (id: string, draft: Draft | null) => void;
  t: AdminDict["texts"];
}) {
  const [text, setText] = useState(initial ?? saved);
  const area = useRef<HTMLTextAreaElement>(null);
  const required = placeholdersOf(original);
  const missing = required.filter((p) => !text.includes(p));
  const invalid = missing.length > 0;

  useLayoutEffect(() => {
    const el = area.current;
    if (growsNatively || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [text]);

  const update = (next: string) => {
    setText(next);
    report(
      id,
      next === saved ? null : { value: next, invalid: placeholdersOf(original).some((p) => !next.includes(p)) },
    );
  };

  return (
    <div data-invalid={invalid || undefined} className="min-w-0">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="label text-muted">{locale}</span>
        {text !== original && (
          <span className="inline-flex h-5 items-center rounded-full bg-accent-soft px-2 text-[0.6875rem] font-semibold text-accent-text">
            {t.edited}
          </span>
        )}
      </div>
      <textarea
        ref={area}
        rows={1}
        lang={locale}
        value={text}
        aria-label={name}
        aria-invalid={invalid || undefined}
        spellCheck={false}
        onChange={(e) => update(e.target.value)}
        // An emptied field means "use the original"; stray spaces at the ends are never wanted.
        onBlur={() => {
          const tidy = text.trim() || original;
          if (tidy !== text) update(tidy);
        }}
        className={cn(inputClass, "min-h-11 resize-none py-2.5 leading-snug [field-sizing:content]")}
      />
      {invalid ? (
        <p role="alert" className="mt-1.5 text-[0.8125rem] leading-snug text-danger">
          {fmt(t.missing, { list: missing.join(" ") })}
        </p>
      ) : required.length > 0 ? (
        <p className="mt-1.5 text-[0.8125rem] leading-snug text-muted">{fmt(t.keep, { list: required.join(" ") })}</p>
      ) : null}
      {text !== original && (
        <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4">
          <p className="min-w-0 flex-1 basis-48 py-2 text-[0.8125rem] leading-snug text-muted">
            <span className="font-semibold">{t.original}:</span> {original}
          </p>
          <button
            type="button"
            onClick={() => update(original)}
            className="-mr-2 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2 text-[0.8125rem] font-semibold text-accent-text hover:bg-accent-soft"
          >
            <ArrowCounterClockwise size={15} weight="bold" />
            {t.restore}
          </button>
        </div>
      )}
    </div>
  );
});
