"use client";
import { useState, useTransition } from "react";
import { SignOut } from "@phosphor-icons/react";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useAdminI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { addTimeOff, deleteTimeOff, saveWorkingHours } from "@/lib/admin/actions";
import { logoutAction } from "@/lib/admin/auth-actions";
import { cn } from "@/lib/cn";
import { formatInTz, toDateKey, toMinutes, toTimeKey } from "@/lib/time";
import { ConfirmDelete } from "./confirm-delete";
import { SaveStatus, Switch, TimeSelect } from "./controls";
import { useSubmit } from "./use-submit";

export type HoursRow = { weekday: number; isOpen: boolean; openTime: string; closeTime: string };
export type TimeOffRow = { id: number; startsAt: number; endsAt: number; reason: string };

export function HoursForm({ hours }: { hours: HoursRow[] }) {
  const { t } = useAdminI18n();
  const { state, pending, onSubmit } = useSubmit((formData) => saveWorkingHours(null, formData));
  const [days, setDays] = useState<HoursRow[]>(() =>
    [1, 2, 3, 4, 5, 6, 7].map(
      (weekday) =>
        hours.find((h) => h.weekday === weekday) ?? { weekday, isOpen: false, openTime: "10:00", closeTime: "19:00" },
    ),
  );
  const patch = (weekday: number, change: Partial<HoursRow>) =>
    setDays((list) => list.map((day) => (day.weekday === weekday ? { ...day, ...change } : day)));

  const backwards = (day: HoursRow) => day.isOpen && day.closeTime <= day.openTime;
  const totalMinutes = days.reduce(
    (sum, day) => sum + (day.isOpen ? Math.max(0, toMinutes(day.closeTime) - toMinutes(day.openTime)) : 0),
    0,
  );
  const error =
    days.some(backwards) || (state && !state.ok && state.error === "invalidHours")
      ? t.settings.invalidHours
      : state && !state.ok
        ? t.common.error
        : null;

  return (
    <Panel title={t.settings.hours} flush>
      <form onSubmit={onSubmit}>
        <p className="px-5 pt-4 text-sm text-muted">
          {t.settings.hoursLead} {t.settings.immediate}
        </p>
        <ul className="mt-2 divide-y divide-line px-5">
          {days.map((day) => {
            const name = t.settings.weekdays[day.weekday - 1];
            return (
              <li
                key={day.weekday}
                className="grid items-center gap-x-6 gap-y-2 py-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]"
              >
                <Switch
                  name={`open-${day.weekday}`}
                  label={name}
                  checked={day.isOpen}
                  onChange={(e) => patch(day.weekday, { isOpen: e.target.checked })}
                />
                {/* Closed days still submit their times, so reopening one restores them. */}
                <div className={cn("flex items-center gap-2.5 sm:justify-end", !day.isOpen && "hidden")}>
                  <TimeSelect
                    name={`from-${day.weekday}`}
                    aria-label={`${name}, ${t.settings.from}`}
                    aria-invalid={backwards(day) || undefined}
                    value={day.openTime}
                    onChange={(e) => patch(day.weekday, { openTime: e.target.value })}
                    className="flex-1 sm:w-28 sm:flex-none"
                  />
                  <span aria-hidden className="h-px w-3 shrink-0 bg-line-strong" />
                  <TimeSelect
                    name={`to-${day.weekday}`}
                    aria-label={`${name}, ${t.settings.to}`}
                    aria-invalid={backwards(day) || undefined}
                    value={day.closeTime}
                    onChange={(e) => patch(day.weekday, { closeTime: e.target.value })}
                    className="flex-1 sm:w-28 sm:flex-none"
                  />
                </div>
                {!day.isOpen && <p className="hidden text-sm text-muted sm:block sm:text-right">{t.settings.closed}</p>}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line px-5 py-4">
          <p className="tnum text-sm font-semibold">
            {fmt(t.settings.perWeek, { n: Math.round((totalMinutes / 60) * 10) / 10 })}
          </p>
          <div className="flex flex-1 items-center justify-end gap-4">
            <SaveStatus
              pending={pending}
              ok={Boolean(state?.ok)}
              error={error}
              labels={{ saving: t.common.saving, saved: t.common.saved }}
              className="text-right"
            />
            <Button type="submit" disabled={pending || days.some(backwards)} className="min-w-32">
              {t.common.save}
            </Button>
          </div>
        </div>
      </form>
    </Panel>
  );
}

export function TimeOffPanel({ timeOff, now }: { timeOff: TimeOffRow[]; now: number }) {
  const { locale, t } = useAdminI18n();
  const today = toDateKey(new Date(now));
  const [allDay, setAllDay] = useState(true);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [formKey, setFormKey] = useState(0);
  const { state, pending, onSubmit } = useSubmit(async (formData) => {
    const result = await addTimeOff(null, formData);
    // A fresh form after each added range, ready for the next one.
    if (result.ok) setFormKey((key) => key + 1);
    return result;
  });
  const [removing, startRemoving] = useTransition();

  const error = state && !state.ok ? (state.error === "invalidRange" ? t.settings.invalidRange : t.common.error) : null;

  const describe = (row: TimeOffRow) => {
    const start = new Date(row.startsAt);
    const end = new Date(row.endsAt);
    const wholeDays = toTimeKey(start) === "00:00" && toTimeKey(end) === "23:59";
    const day = (d: Date) => formatInTz(d, locale, { weekday: "short", day: "numeric", month: "long" });
    const sameDay = toDateKey(start) === toDateKey(end);
    if (wholeDays) return sameDay ? day(start) : `${day(start)} - ${day(end)}`;
    return sameDay
      ? `${day(start)}, ${toTimeKey(start)} - ${toTimeKey(end)}`
      : `${day(start)}, ${toTimeKey(start)} - ${day(end)}, ${toTimeKey(end)}`;
  };

  const upcoming = timeOff.filter((row) => row.endsAt >= now);
  const past = timeOff.filter((row) => row.endsAt < now).reverse();

  const renderRow = (row: TimeOffRow, muted: boolean) => (
    <li key={row.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
      <div className={cn("min-w-0", muted && "text-muted")}>
        <p className="tnum text-[0.9375rem] font-semibold first-letter:uppercase">{describe(row)}</p>
        <p className="text-sm text-muted">{row.reason || t.settings.noReason}</p>
      </div>
      <ConfirmDelete
        size="sm"
        question={t.settings.deleteConfirm}
        pending={removing}
        onConfirm={() =>
          startRemoving(async () => {
            await deleteTimeOff(row.id);
          })
        }
      />
    </li>
  );

  return (
    <Panel title={t.settings.timeOff} flush>
      <p className="px-5 pt-4 text-sm text-muted">{t.settings.timeOffLead}</p>

      <form key={formKey} onSubmit={onSubmit} className="grid gap-4 px-5 pt-4 pb-5">
        <Switch label={t.settings.allDay} checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <Field label={allDay ? t.settings.startDate : t.settings.start} htmlFor="off-start-date">
            <div className="flex gap-2">
              <Input
                id="off-start-date"
                name="startDate"
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="tnum h-11 min-w-0 flex-1"
              />
              {allDay ? (
                <input type="hidden" name="startTime" value="00:00" />
              ) : (
                <TimeSelect
                  name="startTime"
                  defaultValue="10:00"
                  aria-label={`${t.settings.start}, ${t.pickers.hour}`}
                  className="w-[6.25rem] shrink-0"
                />
              )}
            </div>
          </Field>
          <Field label={allDay ? t.settings.endDate : t.settings.end} htmlFor="off-end-date">
            <div className="flex gap-2">
              <Input
                id="off-end-date"
                name="endDate"
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="tnum h-11 min-w-0 flex-1"
              />
              {allDay ? (
                <input type="hidden" name="endTime" value="23:59" />
              ) : (
                <TimeSelect
                  name="endTime"
                  defaultValue="14:00"
                  aria-label={`${t.settings.end}, ${t.pickers.hour}`}
                  className="w-[6.25rem] shrink-0"
                />
              )}
            </div>
          </Field>
        </div>
        <Field label={t.settings.reason} htmlFor="off-reason" optional={t.common.optional} hint={t.settings.reasonHint}>
          <Input id="off-reason" name="reason" maxLength={200} />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SaveStatus
            pending={pending}
            ok={Boolean(state?.ok)}
            error={error}
            labels={{ saving: t.common.saving, saved: t.settings.added }}
          />
          <Button type="submit" variant="ink" disabled={pending}>
            {t.settings.addTimeOff}
          </Button>
        </div>
      </form>

      <div className="border-t border-line px-5 pt-4 pb-2">
        <h3 className="label text-muted">{t.settings.upcoming}</h3>
        {upcoming.length === 0 ? (
          <p className="py-4 text-[0.9375rem] text-muted">{t.settings.none}</p>
        ) : (
          <ul className="divide-y divide-line">{upcoming.map((row) => renderRow(row, false))}</ul>
        )}
      </div>
      {past.length > 0 && (
        <div className="border-t border-line px-5 pt-4 pb-2">
          <h3 className="label text-muted">{t.settings.past}</h3>
          <ul className="divide-y divide-line">{past.map((row) => renderRow(row, true))}</ul>
        </div>
      )}
    </Panel>
  );
}

export function AccountPanel() {
  const { locale, t } = useAdminI18n();
  return (
    <Panel title={t.settings.account}>
      <form action={logoutAction} className="flex flex-wrap items-center justify-between gap-4">
        <input type="hidden" name="locale" value={locale} />
        <p className="max-w-[36ch] text-sm text-muted">{t.settings.accountLead}</p>
        <Button type="submit" variant="outline">
          <SignOut size={18} />
          {t.settings.logout}
        </Button>
      </form>
    </Panel>
  );
}
