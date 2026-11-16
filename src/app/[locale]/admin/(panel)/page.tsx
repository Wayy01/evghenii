import { Suspense } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CalendarBlank, Phone, Plus } from "@phosphor-icons/react/dist/ssr";
import { CountUp } from "@/components/admin/overview/count-up";
import { RevenueChart } from "@/components/admin/overview/revenue-chart";
import { StatusActions } from "@/components/admin/overview/status-actions";
import { Empty, PageHeader, Panel, StatusPill } from "@/components/admin/ui";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { fmt, hasLocale, tr, type Locale } from "@/i18n/config";
import { getAdminDict, type AdminDict } from "@/i18n/dictionaries";
import { getOverview, type AdminBooking } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { addDaysKey, formatDateKey, formatPrice, intlLocale, toDateKey, toTimeKey } from "@/lib/time";

export default function OverviewPage({ params }: PageProps<"/[locale]/admin">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview params={params} />
    </Suspense>
  );
}

const unit = (locale: Locale) => (locale === "ru" ? "лей" : "lei");

async function Overview({ params }: Pick<PageProps<"/[locale]/admin">, "params">) {
  const { locale: raw } = await params;
  const locale: Locale = hasLocale(raw) ? raw : "ro";
  await requireAdmin(locale);
  const now = new Date();
  const [data, t] = await Promise.all([getOverview(now), getAdminDict(locale)]);
  const base = `/${locale}/admin`;

  const { revenue } = data;
  const delta = revenue.prevTotal > 0 ? (revenue.total - revenue.prevTotal) / revenue.prevTotal : null;
  const percent = new Intl.NumberFormat(intlLocale[locale], { style: "percent", maximumFractionDigits: 1 });
  const number = new Intl.NumberFormat(intlLocale[locale]);
  const signedPercent = new Intl.NumberFormat(intlLocale[locale], {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  });

  const weeks = data.weeks.map((w) => ({
    key: w.week,
    label: formatDateKey(w.week, locale, { day: "numeric", month: "short" }),
    range: `${formatDateKey(w.week, locale, { day: "numeric", month: "short" })} - ${formatDateKey(addDaysKey(w.week, 6), locale, { day: "numeric", month: "short" })}`,
    total: w.total,
    count: w.count,
    current: w.current,
  }));

  const figures = [
    {
      label: t.overview.bookings,
      value: String(data.bookingsThisMonth),
      hint: fmt(t.overview.completedCount, { n: revenue.count }),
    },
    { label: t.overview.newClients, value: String(data.newClients), hint: t.overview.thisMonth },
    {
      label: t.overview.avgTicket,
      value: number.format(data.avgTicket),
      unit: unit(locale),
      hint: t.overview.revenueHint,
    },
    { label: t.overview.noShowRate, value: percent.format(data.noShowRate), hint: t.overview.last30 },
  ];

  const topMax = Math.max(...data.topServices.map((s) => s.total), 1);

  return (
    <>
      <PageHeader
        title={formatDateKey(data.todayKey, locale, { weekday: "long", day: "numeric", month: "long" })}
        actions={
          <>
            <ButtonLink href={`${base}/calendar`} variant="outline" size="sm" className="h-10">
              <CalendarBlank size={18} />
              {t.nav.calendar}
            </ButtonLink>
            <ButtonLink href={`${base}/calendar?new=1`} size="sm" className="h-10">
              <Plus size={18} weight="bold" />
              {t.nav.newBooking}
            </ButtonLink>
          </>
        }
      />

      <div className="grid items-start gap-4 lg:gap-5 xl:grid-cols-12">
        <div className="grid content-start gap-4 lg:gap-5 xl:col-span-5">
          <Today bookings={data.today} todayKey={data.todayKey} now={now} locale={locale} t={t} base={base} />
        </div>

        <div className="grid content-start gap-4 lg:gap-5 xl:col-span-7">
          <Panel>
            <p className="label text-muted">{t.overview.revenue}</p>
            <p className="display mt-3 text-[clamp(3.75rem,13vw,6.5rem)] leading-[0.85]">
              <CountUp value={revenue.total} locale={locale} />
              <span className="ml-2 text-[0.42em] text-muted">{unit(locale)}</span>
            </p>
            <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-muted">
              {delta === null ? (
                t.overview.noPrev
              ) : (
                <>
                  <span
                    className={cn(
                      "tnum inline-flex h-7 items-center gap-1 rounded-full px-2.5 font-semibold",
                      delta >= 0 ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger",
                    )}
                  >
                    {delta >= 0 ? <ArrowUpRight size={15} weight="bold" /> : <ArrowDownRight size={15} weight="bold" />}
                    {signedPercent.format(delta)}
                  </span>
                  {t.overview.vsLastPlain}
                </>
              )}
            </p>

            <div className="mt-8 border-t border-line pt-5">
              <h2 className="text-[0.9375rem] font-semibold">{t.overview.weeksTitle}</h2>
              <p className="mt-0.5 text-sm text-muted">{t.overview.weeksLead}</p>
              <div className="mt-4">
                <RevenueChart
                  weeks={weeks}
                  locale={locale}
                  labels={{
                    summary: t.overview.weeksSummary,
                    amount: t.overview.amount,
                    visits: t.overview.visits,
                    period: t.overview.period,
                    inProgress: t.overview.inProgress,
                    table: t.common.table,
                    hideTable: t.common.hideTable,
                    noData: t.common.noData,
                  }}
                />
              </div>
            </div>
          </Panel>

          {/* Secondary figures share one surface, split by hairlines instead of four boxes. */}
          <Panel flush className="overflow-hidden">
            <dl className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
              {figures.map((figure, i) => (
                <div
                  key={figure.label}
                  className={cn(
                    "border-line px-5 py-5",
                    i % 2 === 1 && "border-l",
                    i >= 2 && "border-t lg:border-t-0 xl:border-t 2xl:border-t-0",
                    i === 2 && "lg:border-l xl:border-l-0 2xl:border-l",
                  )}
                >
                  <dt className="label text-muted">{figure.label}</dt>
                  <dd className="display tnum mt-2.5 text-[2.5rem]">
                    {figure.value}
                    {figure.unit ? <span className="ml-1.5 text-[0.5em] text-muted">{figure.unit}</span> : null}
                  </dd>
                  <dd className="mt-1.5 text-sm text-muted">{figure.hint}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        <Panel title={t.overview.mixTitle} action={<span className="text-sm text-muted">{t.overview.last30}</span>} className="xl:col-span-7">
          {data.topServices.length === 0 ? (
            <p className="py-6 text-center text-[0.9375rem] text-muted">{t.common.noData}</p>
          ) : (
            <Reveal stagger={0.05} y={12} className="grid gap-5">
              {data.topServices.map((service) => (
                <div key={service.id}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="min-w-0 truncate text-[0.9375rem] font-medium">
                      {tr(locale, service.nameRo, service.nameRu)}
                    </p>
                    <p className="tnum shrink-0 text-[0.9375rem] font-semibold">{formatPrice(service.total, locale)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span
                      className="block h-1.5 min-w-1.5 rounded-full bg-accent"
                      style={{ width: `${(service.total / topMax) * 82}%` }}
                    />
                    <span className="tnum shrink-0 text-sm text-muted">
                      {fmt(t.overview.mixCount, { n: service.count })}
                    </span>
                  </div>
                </div>
              ))}
            </Reveal>
          )}
        </Panel>

        <Panel title={t.overview.upcoming} flush className="xl:col-span-5">
          {data.upcoming.length === 0 ? (
            <p className="px-5 py-10 text-center text-[0.9375rem] text-muted">{t.overview.upcomingEmpty}</p>
          ) : (
            <ul>
              {data.upcoming.map((b) => {
                const key = toDateKey(b.startsAt);
                const day =
                  key === addDaysKey(data.todayKey, 1)
                    ? t.common.tomorrow
                    : formatDateKey(key, locale, { weekday: "short", day: "numeric", month: "short" });
                return (
                  <li key={b.id} className="border-b border-line last:border-b-0">
                    <Link
                      href={`${base}/calendar?date=${key}`}
                      className="grid min-h-16 grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3 px-5 py-3 transition-colors duration-200 hover:bg-fg/4"
                    >
                      <span>
                        <span className="tnum block text-[0.9375rem] font-semibold">{toTimeKey(b.startsAt)}</span>
                        <span className="block text-sm text-muted first-letter:uppercase">{day}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.9375rem] font-medium">{b.clientName}</span>
                        <span className="block truncate text-sm text-muted">{tr(locale, b.serviceRo, b.serviceRu)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Today({
  bookings,
  todayKey,
  now,
  locale,
  t,
  base,
}: {
  bookings: AdminBooking[];
  todayKey: string;
  now: Date;
  locale: Locale;
  t: AdminDict;
  base: string;
}) {
  const time = now.getTime();
  const live = bookings.filter((b) => b.status === "confirmed" || b.status === "completed");
  const inChair = live.find((b) => b.startsAt.getTime() <= time && b.endsAt.getTime() > time);
  const next = live.find((b) => b.status === "confirmed" && b.startsAt.getTime() > time);
  const focus = inChair ?? next;
  const kept = bookings.filter((b) => b.status !== "cancelled");
  const done = bookings.filter((b) => b.status === "completed").length;
  const calendarHref = `${base}/calendar?date=${todayKey}`;

  const minutes = (ms: number) => Math.max(1, Math.round(ms / 60_000));
  const focusNote = !focus
    ? null
    : focus === inChair
      ? fmt(t.overview.minutesLeft, { n: minutes(focus.endsAt.getTime() - time) })
      : focus.startsAt.getTime() - time <= 90 * 60_000
        ? fmt(t.overview.startsIn, { n: minutes(focus.startsAt.getTime() - time) })
        : null;

  return (
    <>
      {/* The one thing he needs between clients: who is next, when, and how to reach them. */}
      <section className="rounded-frame bg-inverse p-5 text-on-inverse">
        {focus ? (
          <>
            <p className="label flex items-center justify-between gap-3 text-on-inverse-muted">
              <span>{focus === inChair ? t.overview.inChair : t.overview.next}</span>
              <span className="tnum">{focusNote}</span>
            </p>
            <p className="display tnum mt-4 text-[clamp(4rem,19vw,5.5rem)] leading-[0.85]">{toTimeKey(focus.startsAt)}</p>
            <p className="mt-4 truncate text-xl font-semibold">{focus.clientName}</p>
            <p className="mt-1 text-[0.9375rem] text-on-inverse-muted">
              {tr(locale, focus.serviceRo, focus.serviceRu)}
              <span className="tnum">, {formatPrice(focus.price, locale)}</span>
            </p>
            {focus.comment ? <p className="mt-3 text-[0.9375rem] text-pretty">{focus.comment}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`tel:${focus.clientPhone}`}
                className="tnum inline-flex h-11 items-center gap-2 rounded-full bg-on-inverse px-4 text-sm font-semibold text-inverse transition-[opacity,scale] duration-200 hover:opacity-85 active:scale-[0.97]"
              >
                <Phone size={18} weight="fill" />
                {formatPhone(focus.clientPhone)}
              </a>
              <Link
                href={calendarHref}
                className="inline-flex h-11 items-center rounded-full border border-on-inverse/25 px-4 text-sm font-semibold transition-colors duration-200 hover:border-on-inverse/60"
              >
                {t.overview.openCalendar}
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="label text-on-inverse-muted">{t.overview.agenda}</p>
            <p className="display mt-4 text-[2.5rem]">
              {kept.length === 0 ? t.overview.agendaEmpty : t.overview.nothingNext}
            </p>
            <Link
              href={calendarHref}
              className="mt-5 inline-flex h-11 items-center rounded-full border border-on-inverse/25 px-4 text-sm font-semibold transition-colors duration-200 hover:border-on-inverse/60"
            >
              {t.overview.openCalendar}
            </Link>
          </>
        )}
      </section>

      <Panel
        title={t.overview.agenda}
        action={
          kept.length > 0 ? (
            <span className="tnum text-sm text-muted">{fmt(t.overview.agendaCount, { done, total: kept.length })}</span>
          ) : undefined
        }
        flush
      >
        {bookings.length === 0 ? (
          <Empty
            title={t.overview.agendaEmpty}
            action={
              <ButtonLink href={`${base}/calendar?new=1`} variant="soft" size="sm" className="h-10">
                <Plus size={18} weight="bold" />
                {t.nav.newBooking}
              </ButtonLink>
            }
          />
        ) : (
          <ol>
            {bookings.map((b) => {
              const current = b === inChair;
              const overdue = b.status === "confirmed" && b.endsAt.getTime() <= time;
              const faded = b.status === "cancelled" || b.status === "no_show";
              return (
                <li
                  key={b.id}
                  className={cn(
                    "relative border-b border-line px-5 py-3 last:border-b-0",
                    current && "bg-accent-soft",
                  )}
                >
                  {current && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <Link href={calendarHref} className="grid min-h-11 grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-3">
                      <span className={cn("tnum text-[0.9375rem] font-semibold", faded && "text-muted line-through")}>
                        {toTimeKey(b.startsAt)}
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block truncate text-[0.9375rem] font-medium", faded && "text-muted")}>
                          {b.clientName}
                        </span>
                        <span className="block truncate text-sm text-muted">{tr(locale, b.serviceRo, b.serviceRu)}</span>
                      </span>
                    </Link>
                    <StatusPill status={b.status} label={current ? t.overview.inProgress : t.status[b.status]} />
                  </div>
                  {overdue && (
                    <div className="mt-2.5 pl-[4rem]">
                      <StatusActions bookingId={b.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-6 lg:mb-8">
        <div className="skeleton h-12 w-72 max-w-full lg:h-14" />
        <div className="skeleton mt-3 h-5 w-48" />
      </div>
      <div className="grid gap-4 lg:gap-5 xl:grid-cols-12">
        <div className="grid content-start gap-4 lg:gap-5 xl:col-span-5">
          <div className="skeleton h-64 rounded-frame" />
          <div className="skeleton h-80 rounded-frame" />
        </div>
        <div className="grid content-start gap-4 lg:gap-5 xl:col-span-7">
          <div className="skeleton h-[34rem] rounded-frame" />
          <div className="skeleton h-36 rounded-frame" />
        </div>
        <div className="skeleton h-72 rounded-frame xl:col-span-7" />
        <div className="skeleton h-72 rounded-frame xl:col-span-5" />
      </div>
    </div>
  );
}
