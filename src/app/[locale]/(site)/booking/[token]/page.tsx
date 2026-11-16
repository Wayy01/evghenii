import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { ArrowUpRight, CalendarPlus, MapPin } from "@phosphor-icons/react/dist/ssr";
import { db, schema } from "@/db";
import type { BookingStatus } from "@/db/schema";
import { fmt, hasLocale, tr } from "@/i18n/config";
import { getSiteDict } from "@/i18n/dictionaries";
import { SplitHeading } from "@/components/motion/split-heading";
import { CancelBooking } from "@/components/site/booking/cancel-booking";
import { Ticket, TicketRow } from "@/components/site/booking/ticket";
import { TicketArrival } from "@/components/site/booking/ticket-arrival";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { CANCEL_CUTOFF_MS } from "@/lib/availability";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { getSite } from "@/lib/content";
import { formatInTz, formatPrice, toTimeKey } from "@/lib/time";

// The link is the key to the booking, so it stays out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function BookingPage({ params, searchParams }: PageProps<"/[locale]/booking/[token]">) {
  return (
    <section className="page pt-24 pb-24 lg:pt-32 lg:pb-32">
      <Suspense fallback={<BookingSkeleton />}>
        <BookingDetails params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const statusTone: Record<BookingStatus, string> = {
  confirmed: "bg-ok-soft text-ok",
  completed: "bg-fg/7 text-muted",
  cancelled: "bg-danger-soft text-danger",
  no_show: "bg-warn-soft text-warn",
};

// Rendered per request (inside Suspense), so reading the clock here is intended.
const msUntil = (date: Date) => date.getTime() - Date.now();

async function BookingDetails({
  params,
  searchParams,
}: Pick<PageProps<"/[locale]/booking/[token]">, "params" | "searchParams">) {
  await connection();
  const [{ locale: raw, token }, query] = await Promise.all([params, searchParams]);
  const locale = hasLocale(raw) ? raw : "ro";
  const [t, site] = await Promise.all([getSiteDict(locale), getSite()]);

  const [row] = await db
    .select({ booking: schema.bookings, service: schema.services, client: schema.clients })
    .from(schema.bookings)
    .innerJoin(schema.services, eq(schema.services.id, schema.bookings.serviceId))
    .innerJoin(schema.clients, eq(schema.clients.id, schema.bookings.clientId))
    .where(eq(schema.bookings.manageToken, token))
    .limit(1);

  if (!row) {
    return (
      <div className="max-w-2xl py-10 lg:py-16">
        <h1 className="display text-[clamp(3rem,12vw,6rem)]">{t.booking.notFound}</h1>
        <p className="mt-5 max-w-[46ch] text-[1.0625rem] text-muted">{t.booking.notFoundBody}</p>
        <ButtonLink href={`/${locale}/book`} size="lg" className="mt-9">
          {t.booking.again}
        </ButtonLink>
      </div>
    );
  }

  const { booking, service, client } = row;
  const lead = msUntil(booking.startsAt);
  const confirmed = booking.status === "confirmed";
  const upcoming = confirmed && lead > 0;
  const canCancel = confirmed && lead >= CANCEL_CUTOFF_MS;
  const isNew = query.created === "1" && upcoming;
  const title = isNew
    ? t.booking.createdTitle
    : booking.status === "cancelled"
      ? t.booking.cancelledTitle
      : t.booking.title;
  const [tooLateBefore, tooLateAfter] = t.booking.tooLate.split("{phone}");

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <p className={cn("inline-flex h-8 items-center rounded-full px-3.5 text-sm font-semibold", statusTone[booking.status])}>
          {t.booking.status[booking.status]}
        </p>
        {isNew ? (
          <SplitHeading as="h1" immediate className="display mt-5 text-[clamp(4rem,19vw,9.5rem)]">
            {title}
          </SplitHeading>
        ) : (
          <h1 className="display mt-5 text-[clamp(3.25rem,13vw,7rem)]">{title}</h1>
        )}
        {(isNew || booking.status === "cancelled") && (
          <p className="mt-5 max-w-[44ch] text-[1.0625rem] text-muted">
            {isNew ? t.booking.createdLead : t.booking.cancelledLead}
          </p>
        )}

        <div className={cn("mt-9 border-t border-line pt-7 lg:mt-12", !confirmed && "text-faint")}>
          <p className="label text-muted">{t.booking.when}</p>
          <p className="mt-3 text-xl font-semibold first-letter:uppercase sm:text-2xl">
            <time dateTime={booking.startsAt.toISOString()}>
              {formatInTz(booking.startsAt, locale, { weekday: "long", day: "numeric", month: "long" })}
            </time>
          </p>
          <p
            className={cn(
              "display tnum mt-1 text-[clamp(5rem,26vw,11rem)] leading-[0.85]",
              booking.status === "cancelled" && "line-through decoration-[0.06em]",
            )}
          >
            {toTimeKey(booking.startsAt)}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2.5">
          {upcoming && (
            <a href={`/api/booking/${token}/ics`} className={buttonClass({ variant: "ink", size: "lg" })}>
              <CalendarPlus size={20} weight="bold" />
              {t.booking.calendar}
            </a>
          )}
          {upcoming && (
            <a href={site.mapsUrl} target="_blank" rel="noreferrer" className={buttonClass({ variant: "outline", size: "lg" })}>
              <MapPin size={20} weight="bold" />
              {t.booking.maps}
            </a>
          )}
          {!confirmed && (
            <ButtonLink href={`/${locale}/book`} size="lg">
              {t.booking.again}
            </ButtonLink>
          )}
        </div>
      </div>

      <div className="lg:col-span-5 xl:col-span-4 xl:col-start-9">
        <TicketArrival play={isNew}>
          <Ticket
            footer={
              <>
                <div className="flex items-end justify-between gap-4">
                  <p className="label pb-1.5 text-muted">{t.booking.price}</p>
                  <p className="display tnum text-[3.25rem]">{formatPrice(booking.price, locale)}</p>
                </div>
                {confirmed && (
                  <div className="mt-5">
                    {canCancel ? (
                      <CancelBooking token={token} />
                    ) : (
                      <p className="text-[0.9375rem] text-muted">
                        {tooLateBefore}
                        <a
                          href={site.phoneHref}
                          className="tnum font-semibold whitespace-nowrap text-accent-text underline underline-offset-3"
                        >
                          {site.phoneDisplay}
                        </a>
                        {tooLateAfter}
                      </p>
                    )}
                  </div>
                )}
              </>
            }
          >
            <dl className="divide-y divide-line">
              <TicketRow label={t.booking.service}>{tr(locale, service.nameRo, service.nameRu)}</TicketRow>
              <TicketRow label={t.booking.duration}>{fmt(t.services.minutes, { n: service.durationMin })}</TicketRow>
              <TicketRow label={t.booking.client}>
                {client.name}
                <span className="tnum mt-0.5 block text-[0.9375rem] font-normal text-muted">{formatPhone(client.phone)}</span>
              </TicketRow>
              <TicketRow label={t.booking.address}>
                <a
                  href={site.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1.5 hover:text-accent-text"
                >
                  {site.address[locale]}
                  <ArrowUpRight
                    size={16}
                    weight="bold"
                    className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </a>
              </TicketRow>
              <TicketRow label={t.booking.phone}>
                <a href={site.phoneHref} className="tnum hover:text-accent-text">
                  {site.phoneDisplay}
                </a>
              </TicketRow>
            </dl>
          </Ticket>
        </TicketArrival>
      </div>
    </div>
  );
}

function BookingSkeleton() {
  return (
    <div aria-hidden className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <div className="skeleton h-8 w-28 !rounded-full" />
        <div className="skeleton mt-5 h-24 w-4/5 sm:h-32" />
        <div className="skeleton mt-12 h-6 w-56" />
        <div className="skeleton mt-3 h-28 w-64 sm:h-40" />
      </div>
      <div className="skeleton h-[28rem] !rounded-frame lg:col-span-5 xl:col-span-4 xl:col-start-9" />
    </div>
  );
}
