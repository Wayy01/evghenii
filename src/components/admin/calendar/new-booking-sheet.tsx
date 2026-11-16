"use client";
import { useEffect, useId, useRef, useState } from "react";
import { MagnifyingGlass, UserPlus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { fmt, tr, type Locale } from "@/i18n/config";
import { useAdminI18n } from "@/i18n/client";
import { findClients, getSlotsForAdmin } from "@/lib/admin/actions";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { formatDateKey, formatPrice, fromMinutes, toMinutes } from "@/lib/time";
import type { Outcome } from "./booking-sheet";
import type { CalService } from "./types";

export type NewBookingInput = {
  serviceId: number;
  date: string;
  time: string;
  price?: number;
  clientId?: number;
  name?: string;
  phone?: string;
  comment: string;
};

type Client = { id: number; name: string; phone: string };
type Slots = { open: boolean; slots: string[] };

const chip =
  "tnum inline-flex h-11 items-center justify-center rounded-full border text-[0.9375rem] font-semibold transition-colors duration-150";

/**
 * Form for a manual booking. The footer button lives in the sheet's footer,
 * so the form is submitted by id from there.
 */
export function NewBookingForm({
  formId,
  locale,
  services,
  initial,
  onSubmit,
  onPending,
}: {
  formId: string;
  locale: Locale;
  services: CalService[];
  /** `auto` lets the form move to the nearest free time; a slot tapped in the grid is kept as tapped. */
  initial: { date: string; start: number; auto: boolean };
  onSubmit: (input: NewBookingInput) => Outcome;
  onPending: (pending: boolean) => void;
}) {
  const { t } = useAdminI18n();
  const c = t.cal.create;
  const uid = useId();

  const [serviceId, setServiceId] = useState(services[0]?.id ?? 0);
  const [date, setDate] = useState(initial.date);
  const [picked, setPicked] = useState<string | null>(initial.auto ? null : fromMinutes(initial.start));
  const [priceEdit, setPriceEdit] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const [client, setClient] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; clients: Client[] } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [loaded, setLoaded] = useState<{ key: string; day: Slots | null } | null>(null);
  const [error, setError] = useState<{ field: "client" | "name" | "phone" | "form"; text: string } | null>(null);

  const service = services.find((s) => s.id === serviceId);
  const price = priceEdit ?? String(service?.price ?? "");

  // Free start times for the chosen service and day.
  const slotsKey = `${serviceId}|${date}`;
  useEffect(() => {
    let stale = false;
    getSlotsForAdmin(serviceId, date)
      .then((day) => !stale && setLoaded({ key: slotsKey, day }))
      .catch(() => !stale && setLoaded({ key: slotsKey, day: null }));
    return () => {
      stale = true;
    };
  }, [serviceId, date, slotsKey]);
  const slots = loaded?.key === slotsKey ? loaded.day : undefined;
  // Until a time is chosen by hand, follow the first free slot at or after the suggested one.
  const suggested = fromMinutes(initial.start);
  const time = picked ?? slots?.slots.find((s) => s >= suggested) ?? slots?.slots[0] ?? suggested;

  // Bring a rejected field into view; the submit button sits in the footer, away from it.
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (error) form.current?.querySelector("[role=alert]")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);

  // Client lookup, debounced so each keystroke does not hit the server.
  const term = query.trim();
  useEffect(() => {
    if (term.length < 2) return;
    let stale = false;
    const timer = window.setTimeout(() => {
      findClients(term)
        .then((clients) => !stale && setFound({ query: term, clients }))
        .catch(() => !stale && setFound({ query: term, clients: [] }));
    }, 220);
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [term]);
  const results = term.length >= 2 && found?.query === term ? found.clients : null;

  const startNewClient = () => {
    // Whatever was typed into search becomes the first field of the new client.
    if (/^[\d\s+()-]+$/.test(term)) setPhone(term);
    else setName(term);
    setCreating(true);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;
    if (!client && !creating) return setError({ field: "client", text: c.pickClient });
    if (creating && name.trim().length < 2) return setError({ field: "name", text: t.cal.toast.invalidName });
    if (creating && phone.trim().length < 6) return setError({ field: "phone", text: t.cal.toast.invalidPhone });
    setError(null);
    onPending(true);
    const result = await onSubmit({
      serviceId,
      date,
      time,
      price: price.trim() === "" ? undefined : Number(price),
      clientId: client?.id,
      name: creating ? name.trim() : undefined,
      phone: creating ? phone.trim() : undefined,
      comment: comment.trim(),
    });
    onPending(false);
    if (!result) return;
    setError({
      field: result === t.cal.toast.invalidName ? "name" : result === t.cal.toast.invalidPhone ? "phone" : "form",
      text: result,
    });
  };

  const timeTaken = slots != null && !slots.slots.includes(time);
  const end = service ? fromMinutes(Math.min(toMinutes(time) + service.durationMin, 24 * 60 - 1)) : "";

  return (
    <form ref={form} id={formId} onSubmit={submit} className="grid gap-7 *:min-w-0" noValidate>
      {/* Client */}
      <section className="grid gap-3">
        <h3 className="text-sm font-semibold">{c.client}</h3>
        {client ? (
          <div className="flex items-center justify-between gap-3 rounded-field border border-line-strong bg-bg px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-semibold">{client.name}</p>
              <p className="tnum text-sm text-muted">{formatPhone(client.phone)}</p>
            </div>
            <Button variant="soft" size="sm" onClick={() => setClient(null)}>
              {c.change}
            </Button>
          </div>
        ) : creating ? (
          <div className="grid gap-3">
            <Field label={c.name} htmlFor={`${uid}-name`} error={error?.field === "name" ? error.text : null}>
              <Input
                id={`${uid}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                aria-invalid={error?.field === "name"}
                autoFocus
              />
            </Field>
            <Field label={c.phone} htmlFor={`${uid}-phone`} error={error?.field === "phone" ? error.text : null}>
              <Input
                id={`${uid}-phone`}
                type="tel"
                inputMode="tel"
                placeholder="069 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="off"
                aria-invalid={error?.field === "phone"}
                className="tnum"
              />
            </Field>
            <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setCreating(false)}>
              <X size={16} weight="bold" />
              {c.existing}
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            <div className="relative">
              <MagnifyingGlass size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
              <Input
                type="search"
                aria-label={c.search}
                placeholder={c.search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                aria-invalid={error?.field === "client"}
                className="pl-10"
              />
            </div>
            {error?.field === "client" && (
              <p role="alert" className="text-sm text-danger">
                {error.text}
              </p>
            )}
            {term.length >= 2 && results === null && <p className="px-1 text-sm text-muted">{c.searching}</p>}
            {results && results.length > 0 && (
              <ul className="grid gap-1">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setClient(r);
                        setError(null);
                      }}
                      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-field px-3.5 py-2 text-left transition-colors duration-150 hover:bg-fg/6"
                    >
                      <span className="truncate font-medium">{r.name}</span>
                      <span className="tnum shrink-0 text-sm text-muted">{formatPhone(r.phone)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {results && results.length === 0 && <p className="px-1 text-sm text-muted">{c.noResults}</p>}
            <Button variant="outline" onClick={startNewClient}>
              <UserPlus size={18} weight="bold" />
              {c.newClient}
            </Button>
          </div>
        )}
      </section>

      {/* Service */}
      <fieldset className="grid gap-3">
        <legend className="mb-3 text-sm font-semibold">{c.service}</legend>
        <div className="grid gap-1.5">
          {services.map((s) => {
            const active = s.id === serviceId;
            return (
              <label
                key={s.id}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-field border px-3.5 py-2 transition-colors duration-150",
                  active ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name={`${uid}-service`}
                  checked={active}
                  onChange={() => {
                    setServiceId(s.id);
                    setPriceEdit(null);
                  }}
                  className="sr-only"
                />
                <span className="min-w-0 truncate text-[0.9375rem] font-medium">{tr(locale, s.nameRo, s.nameRu)}</span>
                <span className="tnum shrink-0 text-sm text-muted">
                  {fmt(t.cal.units.min, { n: s.durationMin })}
                  {", "}
                  {formatPrice(s.price, locale)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* When */}
      <section className="grid gap-4">
        <Field label={c.date} htmlFor={`${uid}-date`}>
          <Input id={`${uid}-date`} type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </Field>
        <div className="grid gap-2">
          <p className="text-sm font-semibold">{c.slots}</p>
          {slots === undefined ? (
            <div aria-label={c.loadingSlots} className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="skeleton h-11 rounded-full" />
              ))}
            </div>
          ) : slots && slots.slots.length > 0 ? (
            <div className="grid grid-cols-4 gap-1.5">
              {slots.slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={slot === time}
                  onClick={() => setPicked(slot)}
                  className={cn(
                    chip,
                    slot === time ? "border-accent bg-accent text-on-accent" : "border-line hover:border-line-strong",
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">{slots && !slots.open ? c.closedDay : c.noSlots}</p>
          )}
        </div>
        <Field label={c.otherTime} htmlFor={`${uid}-time`} hint={timeTaken ? c.taken : undefined}>
          <Input
            id={`${uid}-time`}
            type="time"
            step={300}
            value={time}
            onChange={(e) => e.target.value && setPicked(e.target.value)}
            className="tnum"
          />
        </Field>
      </section>

      {/* Price and note */}
      <section className="grid gap-4">
        <Field label={c.price} htmlFor={`${uid}-price`}>
          <Input
            id={`${uid}-price`}
            inputMode="numeric"
            value={price}
            onChange={(e) => setPriceEdit(e.target.value.replace(/[^\d]/g, ""))}
            className="tnum"
          />
        </Field>
        <Field label={c.comment} htmlFor={`${uid}-comment`} optional={c.optional}>
          <Textarea id={`${uid}-comment`} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
        </Field>
      </section>

      <div className="grid gap-1.5 border-t border-line pt-5">
        <p className="tnum text-[0.9375rem] font-semibold first-letter:uppercase">
          {formatDateKey(date, locale, { weekday: "long", day: "numeric", month: "long" })}
          {", "}
          {time} - {end}
        </p>
        {error?.field === "form" && (
          <p role="alert" className="text-sm text-danger">
            {error.text}
          </p>
        )}
      </div>
    </form>
  );
}
