import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/admin/ui";
import { PostEditor } from "@/components/admin/manage/post-editor";
import { hasLocale, tr, type Locale } from "@/i18n/config";
import { getAdminDict } from "@/i18n/dictionaries";
import { getAllMedia, getPost } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { toDateKey, toTimeKey } from "@/lib/time";

type Props = PageProps<"/[locale]/admin/content/posts/[id]">;

export default function PostPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden>
          <div className="skeleton mb-4 h-5 w-36" />
          <div className="skeleton mb-8 h-12 w-72" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid content-start gap-5">
              <div className="skeleton h-11 w-56 rounded-full" />
              <div className="skeleton h-14" />
              <div className="skeleton h-24" />
              <div className="skeleton h-[26rem]" />
            </div>
            <div className="grid content-start gap-5">
              <div className="skeleton h-72 rounded-frame" />
              <div className="skeleton h-80 rounded-frame" />
            </div>
          </div>
        </div>
      }
    >
      <Post params={params} />
    </Suspense>
  );
}

async function Post({ params }: Pick<Props, "params">) {
  const { locale: raw, id } = await params;
  const locale: Locale = hasLocale(raw) ? raw : "ro";
  await requireAdmin(locale);

  const isNew = id === "new";
  const postId = Number(id);
  if (!isNew && (!Number.isInteger(postId) || postId <= 0)) notFound();

  const [post, media, t] = await Promise.all([isNew ? null : getPost(postId), getAllMedia(), getAdminDict(locale)]);
  if (!isNew && !post) notFound();

  return (
    <>
      <Link
        href={`/${locale}/admin/content?tab=posts`}
        className="mb-3 inline-flex h-9 items-center gap-2 text-sm font-semibold text-muted transition-colors duration-200 hover:text-fg"
      >
        <ArrowLeft size={16} weight="bold" />
        {t.post.back}
      </Link>
      <PageHeader title={isNew ? t.post.newTitle : t.post.editTitle} />
      <PostEditor
        // Remount after the first save so the form picks up the stored values.
        key={post?.id ?? "new"}
        post={
          post && {
            id: post.id,
            slug: post.slug,
            titleRo: post.titleRo,
            titleRu: post.titleRu,
            excerptRo: post.excerptRo,
            excerptRu: post.excerptRu,
            bodyRo: post.bodyRo,
            bodyRu: post.bodyRu,
            cover: post.cover ?? "",
            videoId: post.videoId,
            published: post.published,
            publishedDate: post.publishedAt ? toDateKey(post.publishedAt) : "",
            publishedTime: post.publishedAt ? toTimeKey(post.publishedAt) : "",
          }
        }
        media={media.map((m) => ({
          id: m.id,
          kind: m.kind,
          still: m.kind === "photo" ? m.src : m.poster,
          caption: tr(locale, m.captionRo, m.captionRu),
        }))}
      />
    </>
  );
}
