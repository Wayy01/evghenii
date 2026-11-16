import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getSiteDict } from "@/i18n/dictionaries";
import { getPublishedPosts } from "@/lib/content";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { PostFeature, PostRow, toPostTeaser } from "@/components/site/blog/post-list";
import { BookPrompt } from "@/components/site/work/book-prompt";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getSiteDict(locale);
  return {
    title: t.meta.blogTitle,
    description: t.blog.lead,
    alternates: { languages: { ro: "/ro/blog", ru: "/ru/blog" } },
  };
}

export default async function BlogPage({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, posts] = await Promise.all([getSiteDict(locale), getPublishedPosts()]);
  const [feature, ...rest] = posts.map((p) => toPostTeaser(p, locale, t));

  return (
    <>
      <section className="page pt-28 pb-20 lg:pt-36 lg:pb-28">
        <SplitHeading as="h1" immediate className="display text-[clamp(5rem,25vw,15rem)] leading-[0.86]">
          {t.blog.pageTitle}
        </SplitHeading>
        <Reveal delay={0.25} className="mt-6 lg:mt-8">
          <p className="max-w-[40ch] text-lg text-pretty text-muted">{t.blog.lead}</p>
        </Reveal>

        {!feature ? (
          <div className="mt-10 grid justify-items-start gap-6 rounded-frame border border-dashed border-line-strong px-6 py-14 md:px-12 md:py-20 lg:mt-14">
            <p className="display max-w-[14ch] text-[clamp(2.5rem,8vw,4.5rem)]">{t.blog.empty}</p>
            <ButtonLink href={`/${locale}/work`} variant="ink">
              {t.work.all}
            </ButtonLink>
          </div>
        ) : (
          <>
            <Reveal delay={0.35} className="mt-10 lg:mt-16">
              <PostFeature post={feature} readLabel={t.blog.read} videoLabel={t.blog.video} />
            </Reveal>
            {rest.length > 0 && (
              <Reveal stagger={0.08} className="mt-14 border-b border-line lg:mt-24">
                {rest.map((post) => (
                  <PostRow key={post.href} post={post} videoLabel={t.blog.video} />
                ))}
              </Reveal>
            )}
          </>
        )}
      </section>

      <BookPrompt title={t.blog.ctaTitle} body={t.blog.ctaBody} cta={t.nav.book} href={`/${locale}/book`} />
    </>
  );
}
