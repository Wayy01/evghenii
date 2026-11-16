import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { fmt, type Locale } from "@/i18n/config";
import type { SiteDict } from "@/i18n/dictionaries";
import { getAvailability } from "@/lib/availability";
import { getActiveServices } from "@/lib/content";
import { addDaysKey, formatDateKey, toDateKey } from "@/lib/time";

const bar = "flex items-center justify-between gap-4 border-t border-line py-4 lg:py-5";

/** Live: the soonest free start time for a standard haircut, fetched per request. */
export async function NextSlot({ locale, t }: { locale: Locale; t: SiteDict }) {
  await connection();
  const services = await getActiveServices();
  const service = services.find((s) => s.slug === "tunsoare") ?? services[0];
  if (!service) return null;

  const today = toDateKey(new Date());
  const days = await getAvailability({ durationMin: service.durationMin, from: today, days: 21 });
  const first = days.find((d) => d.slots.length > 0);

  let when = t.next.none;
  let href = `/${locale}/book`;
  if (first) {
    const day =
      first.date === today
        ? t.next.today
        : first.date === addDaysKey(today, 1)
          ? t.next.tomorrow
          : formatDateKey(first.date, locale, { weekday: "long", day: "numeric", month: "long" });
    when = fmt(t.next.at, { day, time: first.slots[0] });
    href = `/${locale}/book?service=${service.slug}&date=${first.date}&time=${first.slots[0]}`;
  }

  return (
    <Link href={href} className={`group ${bar}`}>
      <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-5">
        <span className="flex items-center gap-2.5 text-sm text-muted">
          {first ? (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full bg-accent motion-safe:animate-[pulse-live_2.4s_ease-in-out_infinite]"
            />
          ) : null}
          {t.next.title}
        </span>
        <span className="text-lg font-semibold first-letter:uppercase lg:text-xl">{when}</span>
      </span>
      <span className="flex shrink-0 items-center gap-3 text-[0.9375rem] font-semibold text-accent-text">
        <span className="hidden sm:inline">{first ? t.next.cta : t.nav.book}</span>
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-accent text-on-accent transition-transform duration-300 ease-out-expo group-hover:translate-x-1 group-active:scale-95">
          <ArrowRight size={20} weight="bold" />
        </span>
      </span>
    </Link>
  );
}

export function NextSlotSkeleton({ label }: { label: string }) {
  return (
    <div className={bar} aria-busy="true" aria-label={label}>
      <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
        <span className="skeleton h-4 w-40" />
        <span className="skeleton h-6 w-52" />
      </span>
      <span className="skeleton size-11 rounded-full!" />
    </div>
  );
}
