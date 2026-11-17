import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { hasLocale, tr } from "@/i18n/config";
import { getSiteDict } from "@/i18n/dictionaries";
import { getPublishedPost, getPublishedPosts } from "@/lib/content";
import { toPostView } from "@/lib/posts";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { PostMeta, PostRow, toPostTeaser } from "@/components/site/blog/post-list";
import { PostVideo } from "@/components/site/blog/post-video";
import { Prose } from "@/components/site/blog/prose";
import { BookPrompt } from "@/components/site/work/book-prompt";
import { cn } from "@/lib/cn";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  const row = await getPublishedPost(slug);
  if (!row) return {};
  const post = toPostView(row.post, locale);
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { languages: { ro: `/ro/blog/${slug}`, ru: `/ru/blog/${slug}` } },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt?.toISOString(),
      images: post.cover ? [post.cover] : [],
    },
  };
}

export default async function PostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, row, all] = await Promise.all([getSiteDict(locale), getPublishedPost(slug), getPublishedPosts()]);
  if (!row) notFound();

  const post = toPostView(row.post, locale);
  const teaser = toPostTeaser(row.post, locale, t);
  const video = row.video?.published && row.video.kind === "video" ? row.video : null;
  const others = all
    .filter((p) => p.slug !== slug)
    .slice(0, 3)
    .map((p) => toPostTeaser(p, locale, t));
  const hasAside = Boolean(video || post.cover);

  return (
    <>
      <article className="page pt-24 pb-20 lg:pt-32 lg:pb-28">
        <Link
          href={`/${locale}/blog`}
          className="group -ml-1 inline-flex h-11 items-center gap-2 text-[0.9375rem] font-medium text-muted transition-colors duration-200 hover:text-fg"
        >
          <ArrowLeft size={18} className="transition-transform duration-300 ease-out-expo group-hover:-translate-x-1" />
          {t.blog.back}
        </Link>

        <header className="mt-6 lg:mt-10">
          <Reveal>
            {/* The video sits right below, so the marker would only repeat it. */}
            <PostMeta post={{ ...teaser, hasVideo: false }} videoLabel={t.blog.video} />
          </Reveal>
          <SplitHeading
            as="h1"
            immediate
            delay={0.1}
            className={cn(
              "display mt-4",
              // Long headlines step down a size so they never run past three lines on desktop.
              post.title.length > 40
                ? "max-w-[24ch] text-[clamp(2.5rem,7.4vw,5.25rem)]"
                : "max-w-[18ch] text-[clamp(2.9rem,9.6vw,7rem)]",
            )}
          >
            {post.title}
          </SplitHeading>
          {post.excerpt && (
            <Reveal delay={0.3}>
              <p className="mt-6 max-w-[50ch] text-xl leading-relaxed text-pretty text-muted lg:mt-8">{post.excerpt}</p>
            </Reveal>
          )}
        </header>

        <div className="mt-10 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-x-16">
          {hasAside && (
            <aside className="lg:col-span-4 lg:col-start-9 lg:row-start-1">
              <Reveal delay={0.35} className="lg:sticky lg:top-24">
                <figure className="w-[68%] max-w-[19rem] lg:w-full lg:max-w-[21rem]">
                  {video ? (
                    <PostVideo src={video.src} poster={video.poster} label={t.blog.watch} />
                  ) : (
                    <div className="relative aspect-[4/5] overflow-hidden rounded-frame bg-sunken">
                      <Image
                        src={post.cover!}
                        alt=""
                        fill
                        priority
                        sizes="(min-width: 1024px) 336px, 68vw"
                        className="object-cover object-top"
                      />
                    </div>
                  )}
                  {video && (
                    <figcaption className="mt-3 text-sm text-pretty text-muted">
                      {tr(locale, video.captionRo, video.captionRu)}
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            </aside>
          )}
          <Reveal delay={0.4} className={cn("lg:row-start-1", hasAside ? "lg:col-span-7" : "lg:col-span-8")}>
            <Prose body={post.body} />
          </Reveal>
        </div>
      </article>

      {others.length > 0 && (
        <section aria-labelledby="more-posts" className="page pb-20 lg:pb-28">
          <h2 id="more-posts" className="display text-[clamp(2.5rem,7vw,4.5rem)]">
            {t.blog.more}
          </h2>
          <Reveal stagger={0.08} className="mt-8 border-b border-line lg:mt-12">
            {others.map((other) => (
              <PostRow key={other.href} post={other} videoLabel={t.blog.video} />
            ))}
          </Reveal>
        </section>
      )}

      <BookPrompt title={t.blog.ctaTitle} body={t.blog.ctaBody} cta={t.nav.book} href={`/${locale}/book`} />
    </>
  );
}
