import type { Post } from "@/db/schema";
import { tr, type Locale } from "@/i18n/config";

export type PostView = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover: string | null;
  publishedAt: Date | null;
  minutes: number;
};

export function toPostView(p: Post, locale: Locale): PostView {
  const body = tr(locale, p.bodyRo, p.bodyRu);
  return {
    slug: p.slug,
    title: tr(locale, p.titleRo, p.titleRu),
    excerpt: tr(locale, p.excerptRo, p.excerptRu),
    body,
    cover: p.cover,
    publishedAt: p.publishedAt,
    minutes: Math.max(1, Math.round(body.split(/\s+/).length / 200)),
  };
}
