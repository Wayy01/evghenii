"use client";
import { useState, useTransition } from "react";
import { CaretDown, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useAdminI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { saveConfig } from "@/lib/admin/cms-actions";
import type { NavConfig } from "@/lib/site-config";
import { LocalizedField, SaveBar, uid, useUnsavedWarning } from "./parts";
import { DragHandle, MoveButtons, moveItem, RemoveButton, SortableList } from "./sortable";

const MAX_LINKS = 8;

// Places on the site a menu link can point at without typing an address.
const TARGETS = [
  { key: "work", href: "/work" },
  { key: "blog", href: "/blog" },
  { key: "book", href: "/book" },
  { key: "home", href: "/" },
  { key: "services", href: "/#services" },
  { key: "studio", href: "/#studio" },
] as const;
const CUSTOM = "custom";
const isKnown = (href: string) => TARGETS.some((target) => target.href === href);

type Row = NavConfig["links"][number] & { uid: string; custom: boolean };

const toRows = (nav: NavConfig): Row[] =>
  nav.links.map((link, i) => ({ ...link, uid: `link-${i}`, custom: !isKnown(link.href) }));
const toConfig = (rows: Row[]): NavConfig => ({
  links: rows.map((row) => ({
    label: { ro: row.label.ro.trim(), ru: row.label.ru.trim() },
    href: row.href.trim(),
  })),
});

export function MenuEditor({ nav }: { nav: NavConfig }) {
  const { t } = useAdminI18n();
  const s = t.site;
  const [rows, setRows] = useState(() => toRows(nav));
  const [base, setBase] = useState(() => toConfig(toRows(nav)));
  const [invalid, setInvalid] = useState<Record<string, { label?: boolean; href?: boolean }>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const config = toConfig(rows);
  const dirty = JSON.stringify(config) !== JSON.stringify(base);
  useUnsavedWarning(dirty);

  const edit = (change: (rows: Row[]) => Row[]) => {
    setRows(change);
    setSaved(false);
    setError(null);
  };
  const patch = (id: string, change: Partial<Row>) =>
    edit((list) => list.map((row) => (row.uid === id ? { ...row, ...change } : row)));

  const save = () => {
    const problems: typeof invalid = {};
    for (const row of rows) {
      const label = !row.label.ro.trim();
      const href = !row.href.trim();
      if (label || href) problems[row.uid] = { label, href };
    }
    setInvalid(problems);
    if (Object.keys(problems).length > 0) {
      setError(s.invalid);
      return;
    }
    startTransition(async () => {
      const result = await saveConfig("nav", config);
      if (result.ok) {
        setBase(config);
        setSaved(true);
        setError(null);
      } else {
        setError(result.error === "invalid" ? s.invalid : t.common.error);
      }
    });
  };

  return (
    <>
      <p className="mb-5 max-w-[64ch] text-[0.9375rem] text-muted">{s.menu.lead}</p>

      {rows.length === 0 ? (
        <p className="border-y border-line-strong py-8 text-[0.9375rem] text-muted">{s.menu.empty}</p>
      ) : (
        <SortableList
          items={rows}
          getKey={(row) => row.uid}
          onMove={(from, to) => edit((list) => moveItem(list, from, to))}
          className="border-y border-line-strong"
          itemClassName="border-t border-line bg-bg py-5 first:border-t-0"
        >
          {(row, index, handle) => {
            const name = row.label.ro.trim() || fmt(s.menu.link, { n: index + 1 });
            const flags = invalid[row.uid] ?? {};
            return (
              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="label text-muted">{fmt(s.menu.link, { n: index + 1 })}</p>
                  <div className="-mr-2 flex items-center">
                    <MoveButtons
                      index={index}
                      count={rows.length}
                      onMove={(from, to) => edit((list) => moveItem(list, from, to))}
                      labels={{ up: fmt(s.moveUp, { name }), down: fmt(s.moveDown, { name }) }}
                    />
                    <DragHandle handle={handle} label={fmt(s.drag, { name })} />
                    <RemoveButton
                      label={fmt(s.remove, { name })}
                      onClick={() => edit((list) => list.filter((other) => other.uid !== row.uid))}
                    />
                  </div>
                </div>
                <LocalizedField
                  id={`${row.uid}-label`}
                  label={s.menu.label}
                  value={row.label}
                  onChange={(label) => patch(row.uid, { label })}
                  maxLength={40}
                  invalid={flags.label}
                  error={flags.label ? s.menu.errors.label : null}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={s.menu.target} htmlFor={`${row.uid}-target`}>
                    <span className="relative block">
                      <Select
                        id={`${row.uid}-target`}
                        value={row.custom ? CUSTOM : row.href}
                        onChange={(e) =>
                          e.target.value === CUSTOM
                            ? patch(row.uid, { custom: true, href: "" })
                            : patch(row.uid, { custom: false, href: e.target.value })
                        }
                      >
                        {TARGETS.map((target) => (
                          <option key={target.key} value={target.href}>
                            {s.menu.targets[target.key]}
                          </option>
                        ))}
                        <option value={CUSTOM}>{s.menu.custom}</option>
                      </Select>
                      <CaretDown
                        size={14}
                        weight="bold"
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted"
                      />
                    </span>
                  </Field>
                  {row.custom ? (
                    <Field
                      label={s.menu.customUrl}
                      htmlFor={`${row.uid}-href`}
                      hint={s.menu.customHint}
                      error={flags.href ? s.menu.errors.href : null}
                    >
                      <Input
                        id={`${row.uid}-href`}
                        type="url"
                        inputMode="url"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={600}
                        placeholder="https://"
                        value={row.href}
                        onChange={(e) => patch(row.uid, { href: e.target.value })}
                        aria-invalid={flags.href || undefined}
                      />
                    </Field>
                  ) : null}
                </div>
              </div>
            );
          }}
        </SortableList>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="soft"
          size="sm"
          className="h-10"
          disabled={rows.length >= MAX_LINKS}
          onClick={() =>
            edit((list) => [
              ...list,
              { uid: uid(), label: { ro: "", ru: "" }, href: TARGETS[0].href, custom: false },
            ])
          }
        >
          <Plus size={16} weight="bold" />
          {s.menu.add}
        </Button>
        {rows.length >= MAX_LINKS ? <p className="text-sm text-muted">{fmt(s.limit, { n: MAX_LINKS })}</p> : null}
      </div>

      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={save}
        onDiscard={() => {
          setRows(toRows(base));
          setInvalid({});
          setError(null);
        }}
        labels={{ save: t.common.save, saving: t.common.saving, saved: t.common.saved, unsaved: s.unsaved, discard: s.discard }}
      />
    </>
  );
}
