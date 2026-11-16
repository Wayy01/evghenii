import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { CaretRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { Empty, PageHeader } from "@/components/admin/ui";
import { Tabs } from "@/components/admin/manage/controls";
import { MediaManager } from "@/components/admin/manage/media-manager";
import { ButtonLink } from "@/components/ui/button";
import { hasLocale, tr, type Locale } from "@/i18n/config";
import { getAdminDict, type AdminDict } from "@/i18n/dictionaries";
import { getAllMedia, getAllPosts } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatInTz, toDateKey } from "@/lib/time";

// Request-time clock (the page streams per request), kept out of the render body.
const currentTime = () => Date.now();

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/content">) {
  const { locale } = await params;
  return { title: (await getAdminDict(hasLocale(locale) ? locale : "ro")).content.title };
}

export default async function ContentPage({ params, searchParams }: PageProps<"/[locale]/admin/content">) {
  const { locale: raw } = await params;
  const locale: Locale = hasLocale(raw) ? raw : "ro";
  const t = await getAdminDict(locale);

  return (
    <Suspense
      fallback={
        <>
          <PageHeader title={t.content.title} description={t.content.lead} />
          <div aria-hidden className="grid gap-7">
            <div className="skeleton h-11 w-64 rounded-full" />
            <div className="skeleton h-28 rounded-frame" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="skeleton aspect-[9/16] rounded-frame" />
              ))}
            </div>
          </div>
        </>
      }
    >
      <Content locale={locale} t={t} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({
  locale,
  t,
  searchParams,
}: {
  locale: Locale;
  t: AdminDict;
  searchParams: PageProps<"/[locale]/admin/content">["searchParams"];
}) {
  await requireAdmin(locale);
  const [query, media, posts] = await Promise.all([searchParams, getAllMedia(), getAllPosts()]);
  const tab = query.tab === "posts" ? "posts" : "media";
  const base = `/${locale}/admin/content`;
  const now = currentTime();

  return (
    <>
      <PageHeader
        title={t.content.title}
        description={t.content.lead}
        actions={
          tab === "posts" ? (
            <ButtonLink href={`${base}/posts/new`}>
              <Plus size={18} weight="bold" />
              {t.content.newPost}
            </ButtonLink>
          ) : null
        }
      />

      <Tabs
        label={t.content.title}
        value={tab}
        className="mb-7"
        options={[
          { value: "media", href: base, label: t.content.media, count: media.length },
          { value: "posts", href: `${base}?tab=posts`, label: t.content.posts, count: posts.length },
        ]}
      />

      {tab === "media" ? (
        <MediaManager
          media={media.map((m) => ({
            id: m.id,
            kind: m.kind,
            src: m.src,
            poster: m.poster,
            captionRo: m.captionRo,
            captionRu: m.captionRu,
            instagramUrl: m.instagramUrl,
            featured: m.featured,
            published: m.published,
            durationS: m.durationS,
            date: toDateKey(m.takenAt),
          }))}
        />
      ) : posts.length === 0 ? (
        <div className="rounded-frame border border-line">
          <Empty
            title={t.content.postsEmpty}
            body={t.content.postsEmptyBody}
            action={<ButtonLink href={`${base}/posts/new`}>{t.content.newPost}</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {posts.map((post) => {
            const scheduled = post.published && post.publishedAt !== null && post.publishedAt.getTime() > now;
            const status = !post.published ? t.content.draft : scheduled ? t.content.scheduled : t.content.live;
            const date = post.publishedAt ?? post.updatedAt;
            return (
              <li key={post.id}>
                <Link
                  href={`${base}/posts/${post.id}`}
                  className="group -mx-3 grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 rounded-field px-3 py-4 transition-colors duration-200 hover:bg-fg/5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:gap-5"
                >
                  <span className="relative block aspect-[4/5] overflow-hidden rounded-field bg-sunken">
                    {post.cover && (
                      <Image src={post.cover} alt="" fill sizes="72px" className="object-cover object-top" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-[1.0625rem] leading-snug font-semibold">
                      {tr(locale, post.titleRo, post.titleRu)}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span
                        className={cn(
                          "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold",
                          !post.published
                            ? "bg-warn-soft text-warn"
                            : scheduled
                              ? "bg-accent-soft text-accent-text"
                              : "bg-ok-soft text-ok",
                        )}
                      >
                        {status}
                      </span>
                      <span className="tnum text-muted">
                        {formatInTz(date, locale, { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </span>
                  </span>
                  <CaretRight
                    size={18}
                    aria-hidden
                    className="text-faint transition-[color,translate] duration-200 group-hover:translate-x-0.5 group-hover:text-fg"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
