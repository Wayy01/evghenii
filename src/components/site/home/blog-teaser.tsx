import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { fmt, type Locale } from "@/i18n/config";
import type { SiteDict } from "@/i18n/dictionaries";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import type { PostView } from "@/lib/posts";
import { formatInTz } from "@/lib/time";

export function BlogTeaser({ locale, t, posts }: { locale: Locale; t: SiteDict; posts: PostView[] }) {
  const [lead, ...rest] = posts;
  if (!lead) return null;

  const meta = (post: PostView) => (
    <span className="flex flex-wrap gap-x-4 text-sm text-muted">
      {post.publishedAt ? (
        <time dateTime={post.publishedAt.toISOString()}>
          {formatInTz(post.publishedAt, locale, { day: "numeric", month: "long", year: "numeric" })}
        </time>
      ) : null}
      <span>{fmt(t.blog.minRead, { n: post.minutes })}</span>
    </span>
  );

  return (
    <section aria-labelledby="blog-title" className="py-20 lg:py-36">
      <div className="page">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <SplitHeading id="blog-title" className="display text-[clamp(3.25rem,13vw,6.5rem)]">
            {t.blog.title}
          </SplitHeading>
          <Link href={`/${locale}/blog`} className="group inline-flex h-11 items-center gap-2 text-[0.9375rem] font-semibold">
            <span className="border-b border-fg pb-0.5">{t.blog.all}</span>
            <ArrowRight
              size={18}
              weight="bold"
              className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
            />
          </Link>
        </div>

        <div className="mt-10 grid gap-x-16 gap-y-12 lg:mt-16 lg:grid-cols-12">
          <Reveal y={36} className="lg:col-span-7">
            <Link href={`/${locale}/blog/${lead.slug}`} className="group grid gap-6 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:items-end sm:gap-8">
              {lead.cover ? (
                <span className="relative block aspect-[4/5] overflow-hidden rounded-frame bg-sunken">
                  <Image
                    src={lead.cover}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 26vw, (min-width: 640px) 45vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
                  />
                </span>
              ) : null}
              <span className="block sm:pb-2">
                {meta(lead)}
                <span className="display mt-4 block text-[clamp(2.25rem,8.5vw,3.75rem)]">{lead.title}</span>
                <span className="mt-4 block max-w-[42ch] text-[1.0625rem] leading-relaxed text-muted">{lead.excerpt}</span>
                <span className="mt-6 inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-accent-text">
                  {t.blog.read}
                  <ArrowRight
                    size={18}
                    weight="bold"
                    className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
                  />
                </span>
              </span>
            </Link>
          </Reveal>

          {rest.length > 0 ? (
            <Reveal stagger={0.08} y={24} className="grid content-start lg:col-span-5">
              {rest.slice(0, 3).map((post) => (
                <Link
                  key={post.slug}
                  href={`/${locale}/blog/${post.slug}`}
                  className="group grid grid-cols-[1fr_auto] items-start gap-5 border-t border-line py-6 first:pt-0 first:border-t-0 lg:first:border-t lg:first:pt-6"
                >
                  <span>
                    <span className="block text-xl leading-snug font-semibold text-pretty transition-colors duration-200 group-hover:text-accent-text">
                      {post.title}
                    </span>
                    <span className="mt-2.5 block">{meta(post)}</span>
                  </span>
                  {post.cover ? (
                    <span className="relative block aspect-[4/5] w-[4.5rem] overflow-hidden rounded-field bg-sunken">
                      <Image src={post.cover} alt="" fill sizes="72px" className="object-cover" />
                    </span>
                  ) : null}
                </Link>
              ))}
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
