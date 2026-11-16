import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowUpRight, InstagramLogo, TiktokLogo } from "@phosphor-icons/react/dist/ssr";
import type { WorkingHours } from "@/db/schema";
import { fmt, type Locale } from "@/i18n/config";
import type { SiteDict } from "@/i18n/dictionaries";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import type { Site } from "@/lib/site-config";
import { addDaysKey, isoWeekday, toDateKey, toTimeKey } from "@/lib/time";
import { cn } from "@/lib/cn";

type LiveState = { today: number; open: boolean; detail: string };

/** Whether the chair is open right now, in salon time, and when that changes. */
function liveState(hours: WorkingHours[], t: SiteDict): LiveState {
  const now = new Date();
  const todayKey = toDateKey(now);
  const today = isoWeekday(todayKey);
  const time = toTimeKey(now);
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  const current = byDay.get(today);

  if (current?.isOpen && time >= current.openTime && time < current.closeTime) {
    return { today, open: true, detail: fmt(t.studio.closesAt, { time: current.closeTime }) };
  }
  for (let offset = 0; offset <= 7; offset++) {
    const weekday = isoWeekday(addDaysKey(todayKey, offset));
    const day = byDay.get(weekday);
    if (!day?.isOpen || (offset === 0 && time >= day.openTime)) continue;
    const label =
      offset === 0
        ? t.studio.today
        : offset === 1
          ? t.studio.tomorrow
          : t.studio.weekdays[weekday - 1].toLocaleLowerCase();
    return { today, open: false, detail: fmt(t.studio.opensAt, { day: label, time: day.openTime }) };
  }
  return { today, open: false, detail: "" };
}

function HoursPanel({ hours, t, live }: { hours: WorkingHours[]; t: SiteDict; live?: LiveState }) {
  return (
    <div className="rounded-frame border border-line bg-surface p-6 sm:p-9">
      <div className="min-h-[4.25rem]">
        {live ? (
          <>
            <p className="flex items-center gap-3 text-2xl font-semibold">
              <span
                aria-hidden
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  live.open ? "bg-accent motion-safe:animate-[pulse-live_2.4s_ease-in-out_infinite]" : "bg-faint",
                )}
              />
              {live.open ? t.studio.openNow : t.studio.closedNow}
            </p>
            {live.detail ? <p className="mt-1.5 pl-[1.4rem] text-[0.9375rem] text-muted">{live.detail}</p> : null}
          </>
        ) : (
          <>
            <span className="skeleton block h-7 w-48" />
            <span className="skeleton mt-3 block h-4 w-36" />
          </>
        )}
      </div>

      <h3 className="label mt-7 text-muted">{t.studio.hours}</h3>
      <dl className="mt-3 grid gap-0.5">
        {hours.map((day) => {
          const isToday = live?.today === day.weekday;
          return (
            <div
              key={day.weekday}
              className={cn(
                "-mx-3 flex items-center justify-between gap-4 rounded-field px-3 py-2.5 text-[1.0625rem]",
                isToday ? "bg-fg/7 font-semibold" : "text-muted",
              )}
            >
              <dt>{t.studio.weekdays[day.weekday - 1]}</dt>
              <dd className="tnum">{day.isOpen ? `${day.openTime} - ${day.closeTime}` : t.studio.closed}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

async function LiveHours({ hours, t }: { hours: WorkingHours[]; t: SiteDict }) {
  await connection();
  return <HoursPanel hours={hours} t={t} live={liveState(hours, t)} />;
}

const term = "label text-muted";
const value = "mt-2 block text-xl leading-snug font-semibold lg:text-2xl";

export function Studio({
  locale,
  t,
  hours,
  site,
}: {
  locale: Locale;
  t: SiteDict;
  hours: WorkingHours[];
  site: Site;
}) {
  return (
    <section id="studio" aria-labelledby="studio-title" className="border-t border-line py-20 lg:py-36">
      <div className="page grid gap-x-16 gap-y-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <SplitHeading id="studio-title" className="display text-[clamp(3.25rem,13vw,6.5rem)]">
            {t.studio.title}
          </SplitHeading>
          <Reveal y={16} delay={0.1}>
            <p className="mt-4 max-w-[40ch] text-[1.0625rem] leading-relaxed text-muted">{t.studio.body}</p>
          </Reveal>

          <Reveal stagger={0.08} y={20} className="mt-10 grid gap-8 lg:mt-14">
            <div>
              <p className={term}>{t.studio.address}</p>
              <address className={cn(value, "not-italic")}>{site.address[locale]}</address>
              <a
                href={site.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="group mt-2 inline-flex h-11 items-center gap-1.5 text-[0.9375rem] font-semibold text-accent-text"
              >
                {t.studio.maps}
                <ArrowUpRight
                  size={18}
                  weight="bold"
                  className="transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </a>
            </div>
            <div>
              <p className={term}>{t.studio.phone}</p>
              <a href={site.phoneHref} className={cn(value, "tnum w-fit hover:text-accent-text")}>
                {site.phoneDisplay}
              </a>
            </div>
            <div>
              <p className={term}>{t.studio.social}</p>
              <div className="mt-3 flex flex-wrap gap-2.5">
{site.instagram ? (
                <a
                  href={site.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center gap-2.5 rounded-full border border-line-strong px-5 text-[0.9375rem] font-semibold transition-colors duration-200 hover:border-fg"
                >
                  <InstagramLogo size={20} />
                  Instagram
                </a>
) : null}
{site.tiktok ? (
                <a
                  href={site.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center gap-2.5 rounded-full border border-line-strong px-5 text-[0.9375rem] font-semibold transition-colors duration-200 hover:border-fg"
                >
                  <TiktokLogo size={20} />
                  TikTok
                </a>
) : null}
              </div>
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-5 lg:col-start-8 lg:pt-4">
          <Suspense fallback={<HoursPanel hours={hours} t={t} />}>
            <LiveHours hours={hours} t={t} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
