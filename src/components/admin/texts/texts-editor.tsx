"use client";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle, MagnifyingGlass, X } from "@phosphor-icons/react";
import { Empty } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { useAdminI18n } from "@/i18n/client";
import { fmt, locales, type Locale } from "@/i18n/config";
import type { AdminDict } from "@/i18n/dictionaries";
import { saveTexts } from "@/lib/admin/cms-actions";
import type { TextEntry } from "@/lib/admin/cms-queries";
import { cn } from "@/lib/cn";
import { TextField, type Draft } from "./text-field";

type GroupName = keyof AdminDict["texts"]["groups"];

const groupOf = (key: string) => key.split(".")[0];

/**
 * Unsaved changes, keyed by `${locale}:${key}`. Kept outside React state on purpose:
 * a keystroke then re-renders the one field being typed in, not a list of 400.
 */
class DraftStore {
  private drafts = new Map<string, Draft>();
  set(id: string, draft: Draft | null) {
    if (draft) this.drafts.set(id, draft);
    else this.drafts.delete(id);
  }
  valueOf(id: string) {
    return this.drafts.get(id)?.value;
  }
  entries() {
    return [...this.drafts];
  }
  summary() {
    return { count: this.drafts.size, invalid: [...this.drafts.values()].filter((d) => d.invalid).length };
  }
  clear() {
    this.drafts.clear();
  }
}

/** `book.errors.slotTaken` -> "Errors › slot taken"; list positions count from 1. */
function labelOf(key: string) {
  const parts = key
    .split(".")
    .slice(1)
    .map((part) => (/^\d+$/.test(part) ? String(Number(part) + 1) : part.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()));
  const label = parts.join(" › ") || key;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const TextRow = memo(function TextRow({
  entry,
  draftOf,
  report,
  t,
  languages,
}: {
  entry: TextEntry;
  draftOf: (id: string) => string | undefined;
  report: (id: string, draft: Draft | null) => void;
  t: AdminDict["texts"];
  languages: Record<Locale, string>;
}) {
  const label = labelOf(entry.key);
  return (
    <li className="grid gap-x-8 gap-y-3 border-t border-line py-5 xl:grid-cols-[180px_minmax(0,1fr)]">
      <div className="min-w-0">
        <p className="text-[0.9375rem] leading-snug font-semibold">{label}</p>
        <p className="mt-0.5 text-xs break-all text-faint">{entry.key}</p>
      </div>
      <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
        {locales.map((locale) => {
          const id = `${locale}:${entry.key}`;
          return (
            <TextField
              key={locale}
              id={id}
              locale={locale}
              name={`${label}, ${languages[locale]}`}
              saved={entry.values[locale] ?? entry.defaults[locale]}
              original={entry.defaults[locale]}
              initial={draftOf(id)}
              report={report}
              t={t}
            />
          );
        })}
      </div>
    </li>
  );
});

export function TextsEditor({ entries }: { entries: TextEntry[] }) {
  const { t } = useAdminI18n();
  const tt = t.texts;
  const languages = useMemo(() => ({ ro: t.common.ro, ru: t.common.ru }), [t.common.ro, t.common.ru]);

  const [drafts] = useState(() => new DraftStore());
  const [summary, setSummary] = useState({ count: 0, invalid: 0 });
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [onlyEdited, setOnlyEdited] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error" | "fix">("idle");
  const [pending, startTransition] = useTransition();
  const needle = useDeferredValue(query).trim().toLocaleLowerCase();

  const report = useCallback(
    (id: string, draft: Draft | null) => {
      drafts.set(id, draft);
      const next = drafts.summary();
      setSummary((prev) => (prev.count === next.count && prev.invalid === next.invalid ? prev : next));
      setStatus((prev) => (prev === "idle" ? prev : "idle"));
    },
    [drafts],
  );
  const draftOf = useCallback((id: string) => drafts.valueOf(id), [drafts]);

  useEffect(() => {
    if (summary.count === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [summary.count]);

  useEffect(() => {
    if (status !== "saved") return;
    const timer = setTimeout(() => setStatus("idle"), 2600);
    return () => clearTimeout(timer);
  }, [status]);

  const groups = useMemo(() => {
    const map = new Map<string, TextEntry[]>();
    for (const entry of entries) {
      const group = groupOf(entry.key);
      map.set(group, [...(map.get(group) ?? []), entry]);
    }
    return [...map].map(([name, items]) => ({ name, items }));
  }, [entries]);
  const groupLabel = (name: string) => tt.groups[name as GroupName] ?? name;

  // Filtering reads the unsaved edits too; it re-runs whenever a filter or the change count moves.
  const visible = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((entry) => {
        const current = locales.map((l) => draftOf(`${l}:${entry.key}`) ?? entry.values[l] ?? entry.defaults[l]);
        if (onlyEdited && !locales.some((l, i) => current[i] !== entry.defaults[l])) return false;
        if (!needle) return true;
        return [entry.key, groupLabel(group.name), ...current, ...locales.map((l) => entry.defaults[l])].some((text) =>
          text.toLocaleLowerCase().includes(needle),
        );
      }),
    }))
    .filter((group) => group.items.length > 0);
  const shown = visible.reduce((sum, group) => sum + group.items.length, 0);

  const discard = () => {
    drafts.clear();
    setSummary({ count: 0, invalid: 0 });
    setStatus("idle");
    // Remounting the fields puts each one back to what the site shows.
    setVersion((v) => v + 1);
  };

  const save = () => {
    if (summary.invalid > 0) {
      setStatus("fix");
      document.querySelector("[data-invalid]")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const defaults = new Map<string, string>(entries.flatMap((e) => locales.map((l) => [`${l}:${e.key}`, e.defaults[l]])));
    const edits = drafts.entries().map(([id, draft]) => {
      const locale = id.slice(0, 2) as Locale;
      const value = draft.value.trim();
      return { locale, key: id.slice(3), value: value === defaults.get(id) ? null : value };
    });
    startTransition(async () => {
      const result = await saveTexts(edits);
      if (!result.ok) return setStatus("error");
      drafts.clear();
      setSummary({ count: 0, invalid: 0 });
      setStatus("saved");
    });
  };

  const barOpen = summary.count > 0 || status === "saved";

  return (
    <div className="grid gap-x-10 pb-24 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label={tt.sections} className="hidden lg:block">
        <ul className="sticky top-10 grid max-h-[calc(100dvh-5rem)] gap-0.5 overflow-y-auto pr-1">
          {visible.map((group) => (
            <li key={group.name}>
              <a
                href={`#texts-${group.name}`}
                className="flex min-h-10 items-center justify-between gap-3 rounded-field px-3 py-1.5 text-[0.9375rem] leading-snug text-muted transition-colors duration-200 hover:bg-fg/6 hover:text-fg"
              >
                {groupLabel(group.name)}
                <span className="text-xs text-faint">{group.items.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">
        <div className="sticky top-0 z-10 -mx-4 border-b border-line bg-bg/92 px-4 pt-3 pb-3 backdrop-blur-lg md:-mx-8 md:px-8 lg:mx-0 lg:px-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-0 flex-1 basis-40">
              <MagnifyingGlass size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tt.search}
                aria-label={tt.search}
                className={cn(inputClass, "h-11 pr-11 pl-10 [&::-webkit-search-cancel-button]:hidden")}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={tt.clearSearch}
                  className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-fg/7 hover:text-fg"
                >
                  <X size={16} weight="bold" />
                </button>
              )}
            </div>
            <button
              type="button"
              aria-pressed={onlyEdited}
              onClick={() => setOnlyEdited((v) => !v)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors duration-200",
                onlyEdited ? "border-fg bg-fg text-bg" : "border-line-strong text-fg hover:border-fg",
              )}
            >
              {tt.onlyEdited}
            </button>
            <p className="text-sm text-muted max-sm:hidden">{fmt(tt.count, { n: shown })}</p>
          </div>

          <nav aria-label={tt.sections} className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:-mx-8 md:px-8 lg:hidden">
            {visible.map((group) => (
              <a
                key={group.name}
                href={`#texts-${group.name}`}
                className="inline-flex h-10 shrink-0 items-center rounded-full bg-fg/7 px-4 text-sm font-medium whitespace-nowrap"
              >
                {groupLabel(group.name)}
              </a>
            ))}
          </nav>
        </div>

        {visible.length === 0 ? (
          <Empty
            title={needle ? tt.noResults : tt.noEdited}
            body={needle ? tt.noResultsBody : tt.noEditedBody}
            action={
              <Button
                variant="outline"
                size="sm"
                className="h-11"
                onClick={() => {
                  setQuery("");
                  setOnlyEdited(false);
                }}
              >
                {tt.clearSearch}
              </Button>
            }
          />
        ) : (
          <div key={version}>
            {visible.map((group) => (
              <section
                key={group.name}
                id={`texts-${group.name}`}
                aria-labelledby={`texts-${group.name}-title`}
                className="scroll-mt-36 pt-10 first:pt-8 lg:scroll-mt-24"
              >
                <h2 id={`texts-${group.name}-title`} className="display mb-4 text-[2rem]">
                  {groupLabel(group.name)}
                </h2>
                <ul>
                  {group.items.map((entry) => (
                    <TextRow key={entry.key} entry={entry} draftOf={draftOf} report={report} t={tt} languages={languages} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Unsaved changes: sits above the phone tab bar, clear of the sidebar on wide screens. */}
      <div
        inert={!barOpen}
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-(--z-chrome) px-3 pb-3 transition-[translate,opacity] duration-300 ease-out-expo lg:bottom-0 lg:left-[248px] lg:px-10 lg:pb-5",
          barOpen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        )}
      >
        <div className="pointer-events-auto mx-auto max-w-[720px] rounded-frame bg-inverse p-2 pl-4 text-on-inverse shadow-[0_10px_40px_rgb(0_0_0/0.28)]">
          {(status === "fix" || status === "error") && (
            <p role="alert" className="pt-1.5 pr-2 pb-2 text-sm leading-snug">
              {status === "fix" ? tt.fixFirst : t.common.error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <p aria-live="polite" className="min-w-0 flex-1 text-[0.9375rem] font-semibold">
              {status === "saved" ? (
                <span className="inline-flex items-center gap-2">
                  <CheckCircle size={20} weight="fill" />
                  {t.common.saved}
                </span>
              ) : (
                fmt(tt.changed, { n: summary.count })
              )}
            </p>
            {summary.count > 0 && (
              <>
                <button
                  type="button"
                  onClick={discard}
                  disabled={pending}
                  className="inline-flex h-11 shrink-0 items-center rounded-full px-4 text-[0.9375rem] font-semibold transition-colors duration-200 hover:bg-on-inverse/12 disabled:opacity-45"
                >
                  {tt.discard}
                </button>
                <Button onClick={save} disabled={pending} className="h-11 px-5">
                  {pending ? t.common.saving : t.common.save}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
