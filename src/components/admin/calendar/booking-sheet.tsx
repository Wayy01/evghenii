"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowCounterClockwise, CalendarDots, Check, Phone, UserCircle } from "@phosphor-icons/react";
import { StatusPill } from "@/components/admin/ui";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { BookingStatus } from "@/db/schema";
import { fmt, tr, type Locale } from "@/i18n/config";
import { useAdminI18n } from "@/i18n/client";
import { formatPhone } from "@/lib/phone";
import { formatInTz, formatPrice, fromMinutes } from "@/lib/time";
import { dayKeyOf, durationMin, minuteOf } from "./range";
import type { CalBooking } from "./types";

/** What the calendar hands back after a mutation: null on success, else a message to show inline. */
export type Outcome = Promise<string | null>;

type Props = {
  booking: CalBooking;
  locale: Locale;
  onStatus: (status: BookingStatus) => Outcome;
  onMove: (date: string, time: string, durationMin: number) => Outcome;
  onDetails: (changes: { price?: number; comment?: string }) => Outcome;
};

const DURATIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 15);

export function BookingSheetBody({ booking: b, locale, onMove, onDetails }: Props) {
  const { t } = useAdminI18n();
  const d = t.cal.details;
  const startTime = fromMinutes(minuteOf(b.start));
  const length = durationMin(b);

  const [moving, setMoving] = useState(false);
  const [date, setDate] = useState(dayKeyOf(b.start));
  const [time, setTime] = useState(startTime);
  const [duration, setDuration] = useState(length);
  const [price, setPrice] = useState(String(b.price));
  const [comment, setComment] = useState(b.comment);
  const [busy, setBusy] = useState<"time" | "details" | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const timeDirty = date !== dayKeyOf(b.start) || time !== startTime || duration !== length;
  const priceValue = Number(price);
  const priceValid = price.trim() !== "" && Number.isInteger(priceValue) && priceValue >= 0;
  const detailsDirty = (priceValid && priceValue !== b.price) || comment.trim() !== b.comment;

  const saveTime = async () => {
    setBusy("time");
    const error = await onMove(date, time, duration);
    setBusy(null);
    setTimeError(error);
    if (!error) setMoving(false);
  };

  const saveDetails = async () => {
    setBusy("details");
    const error = await onDetails({ price: priceValid ? priceValue : undefined, comment: comment.trim() });
    setBusy(null);
    setDetailsError(error);
  };

  return (
    <div className="grid gap-7 *:min-w-0">
      <section>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="display text-[2.25rem] break-words">{b.clientName}</p>
            <p className="tnum mt-1.5 text-[0.9375rem] text-muted">{formatPhone(b.clientPhone)}</p>
          </div>
          <StatusPill status={b.status} label={t.status[b.status]} className="mt-1.5" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={`tel:${b.clientPhone}`} className={buttonClass({ variant: "soft" })}>
            <Phone size={18} weight="bold" />
            {d.call}
          </a>
          <Link href={`/${locale}/admin/clients/${b.clientId}`} className={buttonClass({ variant: "outline" })}>
            <UserCircle size={18} weight="bold" />
            {d.profile}
          </Link>
        </div>
      </section>

      <section className="grid gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[0.9375rem]">
          <dt className="text-muted">{d.service}</dt>
          <dd className="text-right font-medium">{tr(locale, b.serviceRo, b.serviceRu)}</dd>
          <dt className="text-muted">{d.when}</dt>
          <dd className="tnum text-right font-medium first-letter:uppercase">
            {formatInTz(new Date(b.start), locale, { weekday: "short", day: "numeric", month: "long" })}
            <span className="block">
              {startTime} - {fromMinutes(minuteOf(b.end))}
            </span>
          </dd>
          <dt className="text-muted">{d.duration}</dt>
          <dd className="tnum text-right font-medium">{fmt(t.cal.units.min, { n: length })}</dd>
          <dt className="text-muted">{d.price}</dt>
          <dd className="tnum text-right font-medium">{formatPrice(b.price, locale)}</dd>
        </dl>
        <p className="text-sm text-muted">
          {d.source[b.source]}
          {", "}
          {formatInTz(new Date(b.createdAt), locale, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
        </p>
      </section>

      {b.status !== "cancelled" && (
        <section className="grid gap-4 border-t border-line pt-6">
          {moving ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.cal.create.date} htmlFor="booking-date" className="col-span-2">
                  <Input id="booking-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
                </Field>
                <Field label={t.cal.create.time} htmlFor="booking-time">
                  <Input
                    id="booking-time"
                    type="time"
                    step={300}
                    value={time}
                    onChange={(e) => e.target.value && setTime(e.target.value)}
                    className="tnum"
                  />
                </Field>
                <Field label={d.duration} htmlFor="booking-duration">
                  <Select id="booking-duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="tnum">
                    {(DURATIONS.includes(length) ? DURATIONS : [...DURATIONS, length].sort((x, y) => x - y)).map((n) => (
                      <option key={n} value={n}>
                        {fmt(t.cal.units.min, { n })}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {timeError && (
                <p role="alert" className="text-sm text-danger">
                  {timeError}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ink" onClick={saveTime} disabled={!timeDirty || busy !== null}>
                  {busy === "time" ? t.common.saving : d.saveTime}
                </Button>
                <Button
                  variant="soft"
                  onClick={() => {
                    setMoving(false);
                    setTimeError(null);
                    setDate(dayKeyOf(b.start));
                    setTime(startTime);
                    setDuration(length);
                  }}
                >
                  {t.common.cancel}
                </Button>
              </div>
            </>
          ) : (
            <Button variant="outline" onClick={() => setMoving(true)}>
              <CalendarDots size={18} weight="bold" />
              {d.reschedule}
            </Button>
          )}
        </section>
      )}

      <section className="grid gap-4 border-t border-line pt-6">
        <Field label={d.price} htmlFor="booking-price">
          <Input
            id="booking-price"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
            aria-invalid={!priceValid}
            className="tnum"
          />
        </Field>
        <Field label={d.comment} htmlFor="booking-comment" optional={t.common.optional}>
          <Textarea id="booking-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
        </Field>
        {detailsError && (
          <p role="alert" className="text-sm text-danger">
            {detailsError}
          </p>
        )}
        {detailsDirty && (
          <Button variant="ink" onClick={saveDetails} disabled={!priceValid || busy !== null}>
            {busy === "details" ? t.common.saving : d.save}
          </Button>
        )}
      </section>
    </div>
  );
}

/** Status actions pinned to the bottom of the sheet, within thumb reach. */
export function BookingSheetFooter({ booking: b, onStatus }: Pick<Props, "booking" | "onStatus">) {
  const { t } = useAdminI18n();
  const d = t.cal.details;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = async (status: BookingStatus) => {
    setBusy(true);
    const result = await onStatus(status);
    setBusy(false);
    setError(result);
    setConfirming(false);
  };

  return (
    <div className="grid gap-3">
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {confirming ? (
        <>
          <p className="text-[0.9375rem] font-semibold">{d.cancelConfirm}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" onClick={() => set("cancelled")} disabled={busy}>
              {d.cancelYes}
            </Button>
            <Button variant="soft" onClick={() => setConfirming(false)} disabled={busy}>
              {d.cancelNo}
            </Button>
          </div>
        </>
      ) : b.status === "confirmed" ? (
        <div className="grid grid-cols-2 gap-2">
          <Button className="col-span-2" onClick={() => set("completed")} disabled={busy}>
            <Check size={18} weight="bold" />
            {d.complete}
          </Button>
          <Button variant="soft" onClick={() => set("no_show")} disabled={busy}>
            {d.noShow}
          </Button>
          <Button variant="danger" onClick={() => setConfirming(true)} disabled={busy}>
            {d.cancel}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ink" className={b.status === "cancelled" ? "col-span-2" : undefined} onClick={() => set("confirmed")} disabled={busy}>
            <ArrowCounterClockwise size={18} weight="bold" />
            {d.restore}
          </Button>
          {b.status === "completed" && (
            <Button variant="soft" onClick={() => set("no_show")} disabled={busy}>
              {d.noShow}
            </Button>
          )}
          {b.status === "no_show" && (
            <Button variant="soft" onClick={() => set("completed")} disabled={busy}>
              {d.complete}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
