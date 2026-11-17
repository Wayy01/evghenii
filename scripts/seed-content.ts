// The real services, opening hours, videos and articles from db/content.ts,
// written into an empty database.
import type postgres from "postgres";
import { posts, reels, services } from "../db/content";

export async function seedContent(sql: postgres.ISql) {
  await sql`insert into services ${sql(services.map((s) => ({ ...s })))}`;

  await sql`insert into working_hours ${sql(
    [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      weekday,
      is_open: weekday !== 7,
      open_time: "10:00",
      close_time: "19:00",
    })),
  )}`;

  const mediaRows = await sql<{ id: number; src: string }[]>`insert into media ${sql(
    reels.map((r) => ({
      kind: "video",
      src: `/media/reels/${r.code}.mp4`,
      poster: `/media/reels/${r.code}.jpg`,
      caption_ro: r.ro,
      caption_ru: r.ru,
      instagram_url: `https://www.instagram.com/reel/${r.code}/`,
      featured: r.featured,
      published: true,
      width: r.width,
      height: r.height,
      duration_s: r.duration,
      taken_at: new Date(r.takenAt * 1000),
    })),
  )} returning id, src`;

  const mediaIdByCode = new Map(
    mediaRows.map((m) => [m.src.split("/").pop()!.replace(".mp4", ""), m.id]),
  );

  const takenAtByCode = new Map(reels.map((r) => [r.code, new Date(r.takenAt * 1000)]));
  await sql`insert into posts ${sql(
    posts.map((p) => ({
      slug: p.slug,
      title_ro: p.title_ro,
      title_ru: p.title_ru,
      excerpt_ro: p.excerpt_ro,
      excerpt_ru: p.excerpt_ru,
      body_ro: p.body_ro,
      body_ru: p.body_ru,
      cover: `/media/reels/${p.reel}.jpg`,
      video_id: mediaIdByCode.get(p.reel) ?? null,
      published: true,
      published_at: takenAtByCode.get(p.reel) ?? new Date(),
    })),
  )}`;
}
