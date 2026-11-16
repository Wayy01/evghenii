// Applies db/content.ts (video titles, featured flags, articles) to an existing database
// without touching clients, bookings, services or hours.
import postgres from "postgres";
import { posts, reels } from "../db/content";

const sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });

await sql.begin(async (tx) => {
  for (const r of reels) {
    await tx`
      update media set caption_ro = ${r.ro}, caption_ru = ${r.ru}, featured = ${r.featured}
      where src = ${`/media/reels/${r.code}.mp4`}`;
  }
  const media = await tx<{ id: number; src: string; taken_at: Date }[]>`select id, src, taken_at from media`;
  const byCode = new Map(media.map((m) => [m.src.split("/").pop()!.replace(".mp4", ""), m]));

  await tx`delete from posts`;
  await tx`insert into posts ${tx(
    posts.map((p) => ({
      slug: p.slug,
      title_ro: p.title_ro,
      title_ru: p.title_ru,
      excerpt_ro: p.excerpt_ro,
      excerpt_ru: p.excerpt_ru,
      body_ro: p.body_ro,
      body_ru: p.body_ru,
      cover: `/media/reels/${p.reel}.jpg`,
      video_id: byCode.get(p.reel)?.id ?? null,
      published: true,
      published_at: byCode.get(p.reel)?.taken_at ?? new Date(),
    })),
  )}`;
});

const rows = await sql`select slug, published_at::date as day from posts order by published_at desc`;
console.log(rows.map((r) => `${r.day.toISOString().slice(0, 10)}  ${r.slug}`).join("\n"));
await sql.end();
