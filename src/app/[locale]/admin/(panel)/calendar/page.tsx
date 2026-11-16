import { Suspense } from "react";
import type { Metadata } from "next";
import { Calendar } from "@/components/admin/calendar/calendar";
import { isDateKey, stripRange } from "@/components/admin/calendar/range";
import { CalendarSkeleton } from "@/components/admin/calendar/skeleton";
import { hasLocale, type Locale } from "@/i18n/config";
import { getAdminDict } from "@/i18n/dictionaries";
import { getCalendarRange, getCalendarStatics, getDayCounts } from "@/lib/admin/calendar";
import { requireAdmin } from "@/lib/auth";
import { startOfWeekKey, toDateKey } from "@/lib/time";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getAdminDict(hasLocale(locale) ? locale : "ro");
  return { title: t.cal.title };
}

export default function CalendarPage(props: Props) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarLoader {...props} />
    </Suspense>
  );
}

// Called only after requireAdmin (a request-time read), so the clock is safe to touch.
const readClock = () => Date.now();

async function CalendarLoader({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  const locale: Locale = hasLocale(raw) ? raw : "ro";
  await requireAdmin(locale);
  const { date } = await searchParams;
  const now = readClock();
  const anchor = isDateKey(date) ? date : toDateKey(new Date(now));

  // The whole week is loaded up front: it covers both the week view and any day in it,
  // whichever the browser ends up showing.
  const range = { from: startOfWeekKey(anchor), days: 7 };
  const strip = stripRange(anchor);
  const [data, statics, counts] = await Promise.all([
    getCalendarRange(range.from, range.days),
    getCalendarStatics(),
    getDayCounts(strip.from, strip.days),
  ]);

  return (
    <Calendar
      locale={locale}
      nowMs={now}
      initialRange={range}
      initialData={data}
      initialCounts={counts}
      hours={statics.hours}
      services={statics.services}
    />
  );
}
