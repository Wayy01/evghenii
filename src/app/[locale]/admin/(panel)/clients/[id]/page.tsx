import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, CaretDown, Phone } from "@phosphor-icons/react/dist/ssr";
import { ClientForm } from "@/components/admin/clients/client-form";
import { Empty, PageHeader, Panel, StatusPill } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { fmt, hasLocale, tr, type Locale } from "@/i18n/config";
import { getAdminDict } from "@/i18n/dictionaries";
import { getClientDetail } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { formatInTz, formatPrice, intlLocale, toDateKey, toTimeKey } from "@/lib/time";

type Props = PageProps<"/[locale]/admin/clients/[id]">;

/** Regulars pile up dozens of visits; the rest stays one tap away. */
const HISTORY_PREVIEW = 10;

export default function ClientPage({ params }: Props) {
  return (
    <Suspense fallback={<ClientSkeleton />}>
      <ClientDetail params={params} />
    </Suspense>
  );
}

async function ClientDetail({ params }: Pick<Props, "params">) {
  const { locale: raw, id } = await params;
  const locale: Locale = hasLocale(raw) ? raw : "ro";
  await requireAdmin(locale);
  const clientId = Number(id);
  if (!Number.isInteger(clientId) || clientId <= 0) notFound();
  const [data, t] = await Promise.all([getClientDetail(clientId), getAdminDict(locale)]);
  if (!data) notFound();

  const { client, history, next } = data;
  const base = `/${locale}/admin`;
  const completed = history.filter((b) => b.status === "completed");
  const spent = completed.reduce((sum, b) => sum + b.price, 0);
  const noShows = history.filter((b) => b.status === "no_show").length;
  // History is newest first.
  const lastVisit = completed[0]?.startsAt ?? null;
  const firstVisit = completed.at(-1)?.startsAt ?? null;
  const date = (d: Date) => formatInTz(d, locale, { day: "numeric", month: "long", year: "numeric" });

  const number = new Intl.NumberFormat(intlLocale[locale]);
  const unit = locale === "ru" ? "лей" : "lei";

  const figures = [
    { label: t.clients.visits, value: String(completed.length) },
    { label: t.clients.spent, value: number.format(spent), unit },
    { label: t.clients.avgTicket, value: number.format(completed.length ? Math.round(spent / completed.length) : 0), unit },
    { label: t.clients.noShows, value: String(noShows), danger: noShows > 0 },
  ];

  const visit = (b: (typeof history)[number]) => (
    <li key={b.id} className="border-b border-line last:border-b-0">
      <Link
        href={`${base}/calendar?date=${toDateKey(b.startsAt)}`}
        className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3 transition-colors duration-200 hover:bg-fg/4"
      >
        <span className="min-w-0">
          <span className="tnum block text-[0.9375rem] font-semibold">
            {formatInTz(b.startsAt, locale, { day: "numeric", month: "short", year: "numeric" })}
            <span className="font-normal text-muted">, {toTimeKey(b.startsAt)}</span>
          </span>
          <span className="block truncate text-sm text-muted">{tr(locale, b.serviceRo, b.serviceRu)}</span>
        </span>
        <span className="grid justify-items-end gap-1.5">
          <span className={cn("tnum text-[0.9375rem] font-semibold", b.status !== "completed" && b.status !== "confirmed" && "text-muted line-through")}>
            {formatPrice(b.price, locale)}
          </span>
          <StatusPill status={b.status} label={t.status[b.status]} />
        </span>
        {b.comment ? <span className="col-span-2 text-sm text-pretty text-muted">{b.comment}</span> : null}
      </Link>
    </li>
  );

  return (
    <>
      <Link
        href={`${base}/clients`}
        className="mb-3 inline-flex h-11 items-center gap-2 text-[0.9375rem] font-medium text-muted transition-colors duration-200 hover:text-fg"
      >
        <ArrowLeft size={18} />
        {t.clients.back}
      </Link>

      <PageHeader
        title={client.name}
        description={fmt(t.clients.since, { date: date(client.createdAt) })}
        actions={
          <a href={`tel:${client.phone}`} className={buttonClass({ size: "md" }, "tnum")}>
            <Phone size={18} weight="fill" />
            {formatPhone(client.phone)}
          </a>
        }
      />

      <div className="grid gap-4 lg:gap-5">
        {next && (
          <Link
            href={`${base}/calendar?date=${toDateKey(next.startsAt)}`}
            className="flex items-center gap-3.5 rounded-frame bg-accent-soft px-5 py-4 text-accent-text transition-opacity duration-200 hover:opacity-80"
          >
            <CalendarCheck size={24} weight="fill" className="shrink-0" />
            <span className="min-w-0">
              <span className="label block">{t.clients.nextVisit}</span>
              <span className="tnum mt-0.5 block text-[0.9375rem] font-semibold first-letter:uppercase">
                {formatInTz(next.startsAt, locale, { weekday: "long", day: "numeric", month: "long" })}, {toTimeKey(next.startsAt)}
                <span className="font-normal">, {tr(locale, next.serviceRo, next.serviceRu)}</span>
              </span>
            </span>
          </Link>
        )}

        <Panel flush className="overflow-hidden">
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {figures.map((figure, i) => (
              <div
                key={figure.label}
                className={cn(
                  "border-line px-5 py-5",
                  i % 2 === 1 && "border-l",
                  i >= 2 && "border-t lg:border-t-0",
                  i === 2 && "lg:border-l",
                )}
              >
                <dt className="label text-muted">{figure.label}</dt>
                <dd className={cn("display tnum mt-2.5 text-[2.5rem] lg:text-[3rem]", figure.danger && "text-danger")}>
                  {figure.value}
                  {figure.unit ? <span className="ml-1.5 text-[0.5em] text-muted">{figure.unit}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-5">
          {/* Notes come first on a phone: they are what he checks before the client sits down. */}
          <Panel title={t.clients.details} className="lg:order-2">
            <ClientForm client={{ id: client.id, name: client.name, phone: formatPhone(client.phone), notes: client.notes }} />
            <dl className="mt-6 grid gap-2.5 border-t border-line pt-5 text-[0.9375rem]">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t.clients.firstVisit}</dt>
                <dd className="tnum font-medium">{firstVisit ? date(firstVisit) : t.clients.never}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t.clients.lastVisit}</dt>
                <dd className="tnum font-medium">{lastVisit ? date(lastVisit) : t.clients.never}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title={t.clients.history} flush className="overflow-hidden">
            {history.length === 0 ? (
              <Empty title={t.clients.historyEmpty} />
            ) : (
              <>
                <ul>{history.slice(0, HISTORY_PREVIEW).map(visit)}</ul>
                {history.length > HISTORY_PREVIEW && (
                  <details className="group border-t border-line">
                    <summary className="flex h-14 cursor-pointer list-none items-center justify-center gap-2 text-[0.9375rem] font-semibold text-accent-text transition-colors duration-200 group-open:hidden hover:bg-fg/4 [&::-webkit-details-marker]:hidden">
                      {fmt(t.clients.showAll, { n: history.length })}
                      <CaretDown size={16} weight="bold" />
                    </summary>
                    <ul>{history.slice(HISTORY_PREVIEW).map(visit)}</ul>
                  </details>
                )}
              </>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function ClientSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton mb-4 h-6 w-32" />
      <div className="mb-6 lg:mb-8">
        <div className="skeleton h-12 w-72 max-w-full lg:h-14" />
        <div className="skeleton mt-3 h-5 w-52" />
      </div>
      <div className="grid gap-4 lg:gap-5">
        <div className="skeleton h-32 rounded-frame" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-5">
          <div className="skeleton h-[26rem] rounded-frame lg:order-2" />
          <div className="skeleton h-[26rem] rounded-frame" />
        </div>
      </div>
    </div>
  );
}
