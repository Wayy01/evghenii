import { Fragment, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getSiteDict } from "@/i18n/dictionaries";
import {
  getActiveServices,
  getPublishedMedia,
  getPublishedPosts,
  getSite,
  getSiteConfig,
  getWorkingHours,
} from "@/lib/content";
import { toPostView } from "@/lib/posts";
import { toReel } from "@/lib/reels";
import { toServiceView } from "@/lib/services-view";
import { pick, type HomeSectionId } from "@/lib/site-config";
import { ReelViewerProvider } from "@/components/site/reel-viewer";
import { About } from "@/components/site/home/about";
import { BlogTeaser } from "@/components/site/home/blog-teaser";
import { ClosingCta } from "@/components/site/home/closing-cta";
import { Hero } from "@/components/site/home/hero";
import { ReelsRail } from "@/components/site/home/reels-rail";
import { Scalp } from "@/components/site/home/scalp";
import { Services } from "@/components/site/home/services";
import { StickyBook } from "@/components/site/home/sticky-book";
import { Studio } from "@/components/site/home/studio";

// Which blocks appear, in what order, and the videos and images inside them all
// come from the "home" settings the owner edits in the admin.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const [t, media, services, posts, hours, home, site] = await Promise.all([
    getSiteDict(locale),
    getPublishedMedia(),
    getActiveServices(),
    getPublishedPosts(),
    getWorkingHours(),
    getSiteConfig("home"),
    getSite(),
  ]);

  const byId = new Map(media.map((m) => [m.id, m]));
  const video = (id: number | null) => {
    const found = id == null ? undefined : byId.get(id);
    return found?.kind === "video" ? found : undefined;
  };
  const videos = media.filter((m) => m.kind === "video");
  const featured = media.filter((m) => m.featured);
  const rail = (featured.length ? featured : media).map((m) => toReel(m, locale));

  const points = home.about.points.map((p) => ({
    title: pick(p.title, locale),
    body: pick(p.body, locale),
    reelId: video(p.mediaId)?.id ?? null,
  }));
  // The viewer also has to hold any video a point links to, even when it is not in the rail.
  const linked = [...new Set(points.map((p) => p.reelId))].filter(
    (id): id is number => id != null && !rail.some((r) => r.id === id),
  );
  const reels = [...rail, ...linked.map((id) => toReel(byId.get(id)!, locale))];

  const heroMedia = video(home.hero.mediaId) ?? videos.find((m) => m.featured) ?? videos[0];
  const featureMedia = video(home.feature.mediaId);

  const blocks: Record<HomeSectionId, ReactNode> = {
    hero: heroMedia ? (
      <Hero
        locale={locale}
        t={t}
        video={heroMedia.src}
        poster={heroMedia.poster ?? undefined}
        inset={home.hero.inset ?? undefined}
      />
    ) : null,
    reels: rail.length > 0 ? <ReelsRail reels={rail} /> : null,
    about: <About t={t} portrait={home.about.portrait} points={points} />,
    services: <Services locale={locale} t={t} services={services.map((s) => toServiceView(s, locale))} />,
    feature: featureMedia ? (
      <Scalp
        t={t}
        video={featureMedia.src}
        poster={featureMedia.poster ?? undefined}
        steps={home.feature.steps.map((s) => pick(s, locale))}
      />
    ) : null,
    blog: <BlogTeaser locale={locale} t={t} posts={posts.map((p) => toPostView(p, locale))} />,
    studio: <Studio locale={locale} t={t} hours={hours} site={site} />,
    cta: <ClosingCta locale={locale} t={t} />,
  };

  return (
    <ReelViewerProvider reels={reels}>
      {home.sections
        .filter((s) => s.enabled)
        .map((s) => (
          <Fragment key={s.id}>{blocks[s.id]}</Fragment>
        ))}
      <StickyBook href={`/${locale}/book`} label={t.nav.book} />
    </ReelViewerProvider>
  );
}
