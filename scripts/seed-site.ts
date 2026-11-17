// Fills in the starting state of everything the owner can later edit in the admin:
// video order, service pictures and the home page layout. Only blanks are filled,
// so running it again never overwrites his changes.
import type postgres from "postgres";
import { initialSlots } from "../db/content";
import { defaultHome, type HomeConfig } from "../src/lib/site-config";

const poster = (code: string) => `/media/reels/${code}.jpg`;

export async function seedSite(sql: postgres.ISql) {
  const media = await sql<{ id: number; src: string; sort_order: number }[]>`
    select id, src, sort_order from media order by taken_at desc`;
  const idByCode = new Map(media.map((m) => [m.src.split("/").pop()!.replace(/\.\w+$/, ""), m.id]));

  // Newest first, until he arranges them himself.
  if (media.every((m) => m.sort_order === 0)) {
    for (const [position, m] of media.entries()) {
      await sql`update media set sort_order = ${position} where id = ${m.id}`;
    }
  }

  for (const [slug, code] of Object.entries(initialSlots.services)) {
    await sql`update services set image = ${poster(code)} where slug = ${slug} and image is null`;
  }

  const home: HomeConfig = {
    ...defaultHome,
    hero: { mediaId: idByCode.get(initialSlots.hero) ?? null, inset: poster(initialSlots.heroInset) },
    about: {
      portrait: poster(initialSlots.portrait),
      points: defaultHome.about.points.map((point, i) => ({
        ...point,
        mediaId: idByCode.get(initialSlots.points[i]) ?? null,
      })),
    },
    feature: { ...defaultHome.feature, mediaId: idByCode.get(initialSlots.feature) ?? null },
  };
  await sql`
    insert into site_config (key, value) values ('home', ${sql.json(home)})
    on conflict (key) do nothing`;
}
