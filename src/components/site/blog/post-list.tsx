import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "@phosphor-icons/react/dist/ssr";
import type { Post } from "@/db/schema";
import { fmt, type Locale } from "@/i18n/config";
import type { SiteDict } from "@/i18n/dictionaries";
import { toPostView } from "@/lib/posts";
import { formatInTz } from "@/lib/time";
import { cn } from "@/lib/cn";

/** Everything a post teaser shows, already localized. */
export type PostTeaser = {
  href: string;
  title: string;
  excerpt: string;
  cover: string | null;
  dateTime: string | null;
  date: string | null;
  readTime: string;
  hasVideo: boolean;
};

export function toPostTeaser(post: Post, locale: Locale, t: SiteDict): PostTeaser {
  const view = toPostView(post, locale);
  return {
    href: `/${locale}/blog/${view.slug}`,
    title: view.title,
    excerpt: view.excerpt,
    cover: view.cover,
    dateTime: view.publishedAt?.toISOString() ?? null,
    date: view.publishedAt
      ? formatInTz(view.publishedAt, locale, { day: "numeric", month: "long", year: "numeric" })
      : null,
    readTime: fmt(t.blog.minRead, { n: view.minutes }),
    hasVideo: post.videoId != null,
  };
}

export function PostMeta({
  post,
  videoLabel,
  className,
}: {
  post: Pick<PostTeaser, "date" | "dateTime" | "readTime" | "hasVideo">;
  videoLabel: string;
  className?: string;
}) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted", className)}>
      {post.date && <time dateTime={post.dateTime ?? undefined}>{post.date}</time>}
      <span>{post.readTime}</span>
      {post.hasVideo && (
        <span className="inline-flex items-center gap-1.5 font-medium text-fg">
          <PlayCircle size={18} weight="fill" className="text-accent-text" />
          {videoLabel}
        </span>
      )}
    </p>
  );
}

/** The newest post, set large: cover on one side, headline on the other. */
export function PostFeature({ post, readLabel, videoLabel }: { post: PostTeaser; readLabel: string; videoLabel: string }) {
  return (
    <Link href={post.href} className="group grid gap-6 md:grid-cols-12 md:items-end md:gap-10 lg:gap-16">
      {post.cover && (
        <span className="relative block aspect-[4/5] overflow-hidden rounded-frame bg-sunken md:col-span-5">
          <Image
            src={post.cover}
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover object-top transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
          />
        </span>
      )}
      <span className={cn("block md:pb-2", post.cover ? "md:col-span-7" : "md:col-span-10")}>
        <PostMeta post={post} videoLabel={videoLabel} />
        <span className="display mt-4 block text-[clamp(2.75rem,8.4vw,6.25rem)] text-balance">{post.title}</span>
        <span className="mt-5 block max-w-[46ch] text-lg text-pretty text-muted">{post.excerpt}</span>
        <span className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-fg px-6 text-[0.9375rem] font-semibold text-bg transition-colors duration-200 group-hover:bg-accent group-hover:text-on-accent">
          {readLabel}
          <ArrowRight size={18} weight="bold" className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
        </span>
      </span>
    </Link>
  );
}

/** One line of the archive: thumbnail, headline, and an arrow that wakes on hover. */
export function PostRow({ post, videoLabel }: { post: PostTeaser; videoLabel: string }) {
  return (
    <Link
      href={post.href}
      className="group grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-x-4 border-t border-line py-6 md:grid-cols-[8.5rem_minmax(0,1fr)_auto] md:items-center md:gap-x-10 md:py-8"
    >
      <span className="relative block aspect-[4/5] overflow-hidden rounded-field bg-sunken md:rounded-frame">
        {post.cover && (
          <Image
            src={post.cover}
            alt=""
            fill
            sizes="(min-width: 768px) 136px, 80px"
            className="object-cover object-top transition-transform duration-700 ease-out-expo group-hover:scale-[1.06]"
          />
        )}
      </span>
      <span className="block min-w-0">
        <span className="display block text-[clamp(1.75rem,4.6vw,3.25rem)] text-balance transition-colors duration-200 group-hover:text-accent-text">
          {post.title}
        </span>
        <span className="mt-2.5 hidden max-w-[58ch] text-pretty text-muted md:block">{post.excerpt}</span>
        <PostMeta post={post} videoLabel={videoLabel} className="mt-3" />
      </span>
      <span
        aria-hidden
        className="hidden size-14 items-center justify-center rounded-full border border-line-strong transition-colors duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent md:inline-flex"
      >
        <ArrowRight size={22} className="transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
