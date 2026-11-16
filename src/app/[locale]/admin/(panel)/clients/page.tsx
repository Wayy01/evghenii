import { Suspense } from "react";
import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { ClientSearch } from "@/components/admin/clients/client-search";
import { Empty, PageHeader, Panel } from "@/components/admin/ui";
import { fmt, hasLocale, type Locale } from "@/i18n/config";
import { getAdminDict } from "@/i18n/dictionaries";
import { getClientsList } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { formatInTz, formatPrice } from "@/lib/time";

type Props = PageProps<"/[locale]/admin/clients">;
type Row = Awaited<ReturnType<typeof getClientsList>>[number];

const sorts = ["last", "spent", "visits", "name"] as const;
type Sort = (typeof sorts)[number];

const time = (d: Date | null) => d?.getTime() ?? 0;
const comparators: Record<Sort, (a: Row, b: Row) => number> = {
  last: (a, b) => time(b.lastVisit) - time(a.lastVisit),
  spent: (a, b) => b.spent - a.spent,
  visits: (a, b) => b.visits - a.visits,
  name: (a, b) => a.name.localeCompare(b.name, "ro"),
};

const columns = "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_5.5rem_8.5rem_9rem]";

export default function ClientsPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<ClientsSkeleton />}>
      <Clients params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Clients({ params, searchParams }: Props) {
  const [{ locale: raw }, sp] = await Promise.all([params, searchParams]);
  const locale: Locale = hasLocale(raw) ? raw : "ro";
  await requireAdmin(locale);

  const query = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const sort: Sort = sorts.includes(sp.sort as Sort) ? (sp.sort as Sort) : "last";
  const [rows, t] = await Promise.all([getClientsList(query), getAdminDict(locale)]);
  const clients = [...rows].sort(comparators[sort]);
  const basePath = `/${locale}/admin/clients`;

  const sortHref = (key: Sort) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (key !== "last") params.set("sort", key);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const date = (d: Date) => formatInTz(d, locale, { day: "numeric", month: "short", year: "numeric" });

  const head = (key: Sort, label: string, align?: "right") => (
    <Link
      href={sortHref(key)}
      scroll={false}
      aria-current={sort === key ? "true" : undefined}
      className={cn(
        "label inline-flex h-11 items-center gap-1 transition-colors duration-200 hover:text-fg",
        align === "right" && "justify-self-end",
        sort === key ? "text-fg" : "text-muted",
      )}
    >
      {label}
      <CaretDown size={12} weight="bold" className={sort === key ? "opacity-100" : "opacity-0"} />
    </Link>
  );

  return (
    <>
      <PageHeader title={t.clients.title} description={t.clients.lead} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <ClientSearch basePath={basePath} query={query} sort={sort} />
        <p className="tnum text-sm text-muted">{fmt(t.clients.count, { n: clients.length })}</p>
      </div>

      {/* Phones get the sort as pills; from md up the column heads do the same job. */}
      <nav aria-label={t.clients.sort} className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 md:hidden">
        {sorts.map((key) => (
          <Link
            key={key}
            href={sortHref(key)}
            scroll={false}
            aria-current={sort === key ? "true" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors duration-200",
              sort === key ? "bg-fg text-bg" : "bg-fg/7 text-fg",
            )}
          >
            {t.clients.sorts[key]}
          </Link>
        ))}
      </nav>

      <Panel flush className="overflow-hidden">
        {clients.length === 0 ? (
          query ? (
            <Empty title={t.clients.empty} body={t.clients.emptyHint} />
          ) : (
            <Empty title={t.clients.title} body={t.clients.emptyAll} />
          )
        ) : (
          <>
            <div className={cn("hidden items-center gap-4 border-b border-line px-5 md:grid", columns)}>
              {head("name", t.clients.client)}
              <span className="label text-muted">{t.clients.phone}</span>
              {head("visits", t.clients.visits, "right")}
              {head("spent", t.clients.spent, "right")}
              {head("last", t.clients.lastVisit, "right")}
            </div>
            <ul>
              {clients.map((c) => (
                <li key={c.id} className="border-b border-line last:border-b-0">
                  <Link
                    href={`${basePath}/${c.id}`}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors duration-200 hover:bg-fg/4 md:min-h-[60px] md:py-2.5",
                      columns,
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.9375rem] font-semibold">{c.name}</span>
                      {c.nextVisit ? (
                        <span className="block truncate text-sm text-accent-text">
                          {t.clients.upcoming}: {formatInTz(c.nextVisit, locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : c.noShows > 0 ? (
                        <span className="tnum block text-sm text-danger">
                          {t.clients.noShows}: {c.noShows}
                        </span>
                      ) : null}
                    </span>
                    <span className="tnum row-start-2 text-sm text-muted md:row-start-auto md:text-[0.9375rem]">
                      {formatPhone(c.phone)}
                    </span>
                    <span className="tnum hidden text-right text-[0.9375rem] md:block">{c.visits}</span>
                    <span className="tnum row-start-1 col-start-2 text-right text-[0.9375rem] font-semibold md:row-start-auto md:col-start-auto">
                      {formatPrice(c.spent, locale)}
                    </span>
                    <span className="tnum row-start-2 col-start-2 text-right text-sm text-muted md:row-start-auto md:col-start-auto md:text-[0.9375rem]">
                      <span className="md:hidden">
                        {t.clients.visits}: {c.visits}
                      </span>
                      <span className="hidden md:inline">{c.lastVisit ? date(c.lastVisit) : t.clients.never}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </>
  );
}

function ClientsSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-6 lg:mb-8">
        <div className="skeleton h-12 w-56 lg:h-14" />
        <div className="skeleton mt-3 h-5 w-80 max-w-full" />
      </div>
      <div className="skeleton mb-4 h-12 w-full max-w-md" />
      <div className="grid gap-px overflow-hidden rounded-frame border border-line">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="skeleton h-[60px] rounded-none" />
        ))}
      </div>
    </div>
  );
}
