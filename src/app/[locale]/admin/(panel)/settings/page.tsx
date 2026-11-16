import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { AccountPanel, HoursForm, TimeOffPanel } from "@/components/admin/manage/settings-forms";
import { hasLocale, type Locale } from "@/i18n/config";
import { getAdminDict } from "@/i18n/dictionaries";
import { getSettings } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";

const columns = "grid items-start gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/settings">) {
  const { locale } = await params;
  return { title: (await getAdminDict(hasLocale(locale) ? locale : "ro")).settings.title };
}

export default async function SettingsPage({ params }: PageProps<"/[locale]/admin/settings">) {
  const { locale: raw } = await params;
  const locale: Locale = hasLocale(raw) ? raw : "ro";
  const t = await getAdminDict(locale);

  return (
    <>
      <PageHeader title={t.settings.title} description={t.settings.lead} />
      <Suspense
        fallback={
          <div aria-hidden className={columns}>
            <div className="skeleton h-[34rem] rounded-frame" />
            <div className="grid gap-6">
              <div className="skeleton h-[26rem] rounded-frame" />
              <div className="skeleton h-28 rounded-frame" />
            </div>
          </div>
        }
      >
        <Settings locale={locale} />
      </Suspense>
    </>
  );
}

async function Settings({ locale }: { locale: Locale }) {
  await requireAdmin(locale);
  const now = new Date();
  const data = await getSettings(now);

  return (
    <div className={columns}>
      <HoursForm
        hours={data.hours.map((h) => ({
          weekday: h.weekday,
          isOpen: h.isOpen,
          openTime: h.openTime,
          closeTime: h.closeTime,
        }))}
      />
      <div className="grid gap-6">
        <TimeOffPanel
          now={now.getTime()}
          timeOff={data.timeOff.map((row) => ({
            id: row.id,
            startsAt: row.startsAt.getTime(),
            endsAt: row.endsAt.getTime(),
            reason: row.reason,
          }))}
        />
        <AccountPanel />
      </div>
    </div>
  );
}
