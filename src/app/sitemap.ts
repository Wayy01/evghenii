import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { getPublishedPosts } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const posts = await getPublishedPosts();
  const paths = ["", "/work", "/blog", "/book", ...posts.map((p) => `/blog/${p.slug}`)];
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])) },
    })),
  );
}
