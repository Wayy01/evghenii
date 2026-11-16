// Wipes the whole database, recreates the schema and seeds real content.
// Pass --demo to also generate sample clients and bookings for the dashboard.
//   bun run db:reset          (content only)
//   bun run db:reset --demo   (content + demo bookings)
import postgres from "postgres";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { TZDate } from "@date-fns/tz";
import { addDays, format, getISODay } from "date-fns";
import { posts, reels, services } from "../db/content";
import { seedSite } from "./seed-site";

const TZ = "Europe/Chisinau";
const withDemo = process.argv.includes("--demo");
const sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });

async function wipe() {
  await sql.unsafe(`
    DROP SCHEMA IF EXISTS drizzle CASCADE;
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
  `);
}

async function applySchema() {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await sql.unsafe(schema);
}

async function seedContent() {
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

// Deterministic PRNG so the demo data is identical between runs.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const demoNames = [
  "Andrei Rusu", "Ion Ceban", "Vladimir Popa", "Maxim Țurcan", "Dumitru Lungu",
  "Alexandru Munteanu", "Serghei Moraru", "Nicolae Botnari", "Artiom Guțu", "Denis Cojocaru",
  "Mihai Rotaru", "Dmitrii Volkov", "Pavel Sârbu", "Victor Croitoru", "Eugen Bivol",
  "Igor Melnic", "Cristian Ursu", "Radu Țurcanu", "Vadim Golub", "Oleg Grosu",
  "Daniel Plămădeală", "Stanislav Iordan", "Marcel Josanu", "Gheorghe Cebotari", "Ruslan Bodrug",
  "Valeriu Chiriac", "Constantin Gaină", "Anton Lozovan", "Iulian Sandu", "Nichita Rusnac",
  "Roman Ababii", "Sergiu Bejan", "Vitalie Ciobanu", "Kirill Novac", "Ilie Spînu",
  "Timur Gîrlea", "Octavian Toma", "Petru Vrabie", "Evgheni Racu", "Bogdan Covalciuc",
  "Arsenii Bulat", "Corneliu Leahu", "Gleb Sîrbu", "Liviu Onu", "Mark Dobrovolschi", "Viorel Frunze",
];

const demoComments = [
  "Fade mai jos pe laterale, ca data trecută",
  "Prima dată la voi",
  "Aș vrea să ne uităm și la scalp",
  "Как в прошлый раз, только короче сверху",
  "Борода покороче",
  "Vin cu o poză de referință",
];

async function seedDemo() {
  const rand = mulberry32(20261115);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

  const svc = await sql<{ id: number; slug: string; price: number; duration_min: number }[]>`
    select id, slug, price, duration_min from services`;
  const bySlug = Object.fromEntries(svc.map((s) => [s.slug, s]));
  const weights: [string, number][] = [
    ["complex", 0.3], ["tunsoare", 0.36], ["barba", 0.12],
    ["aranjare", 0.07], ["tonare-barba", 0.08], ["tonare-par", 0.07],
  ];
  const pickService = () => {
    let r = rand();
    for (const [slug, w] of weights) if ((r -= w) <= 0) return bySlug[slug];
    return bySlug.tunsoare;
  };

  const clientRows = await sql<{ id: number }[]>`insert into clients ${sql(
    demoNames.map((name, i) => ({
      name,
      phone: `+373${i % 3 === 0 ? "79" : i % 3 === 1 ? "69" : "68"}${String(100000 + Math.floor(rand() * 899999)).padStart(6, "0")}`,
      notes: i === 0 ? "Preferă fade jos, fără produse." : i === 4 ? "Piele sensibilă, fără aftershave cu alcool." : "",
    })),
  )} returning id`;
  // A third of the clients are regulars and get most of the visits.
  const regulars = clientRows.slice(0, 16).map((c) => c.id);
  const others = clientRows.slice(16).map((c) => c.id);
  const pickClient = () => (rand() < 0.62 ? pick(regulars) : pick(others));

  const now = new Date();
  const todayLocal = new TZDate(now, TZ);
  const start = addDays(todayLocal, -182);
  const rows: Record<string, unknown>[] = [];

  for (let d = 0; d <= 182 + 14; d++) {
    const day = addDays(start, d);
    if (getISODay(day) === 7) continue;
    const dayOffset = d - 182;
    const density =
      dayOffset <= 0 ? 0.38 + 0.34 * (d / 182) : Math.max(0.12, 0.62 - dayOffset * 0.04);

    let minute = 10 * 60;
    while (minute < 19 * 60) {
      if (rand() > density) {
        minute += 30;
        continue;
      }
      const s = pickService();
      if (minute + s.duration_min > 19 * 60) break;
      const startsAt = new TZDate(
        day.getFullYear(), day.getMonth(), day.getDate(),
        Math.floor(minute / 60), minute % 60, TZ,
      );
      const endsAt = new Date(startsAt.getTime() + s.duration_min * 60_000);
      const isPast = endsAt.getTime() < now.getTime();
      const roll = rand();
      const status = isPast
        ? roll < 0.06 ? "cancelled" : roll < 0.095 ? "no_show" : "completed"
        : roll < 0.05 ? "cancelled" : "confirmed";
      rows.push({
        client_id: pickClient(),
        service_id: s.id,
        starts_at: new Date(startsAt.getTime()),
        ends_at: endsAt,
        status,
        price: s.price,
        comment: rand() < 0.08 ? pick(demoComments) : "",
        source: rand() < 0.68 ? "online" : "manual",
        locale: rand() < 0.58 ? "ro" : "ru",
        manage_token: randomBytes(16).toString("base64url"),
        created_at: new Date(startsAt.getTime() - Math.floor(rand() * 7 * 86_400_000)),
      });
      minute += s.duration_min + (rand() < 0.5 ? 0 : 30);
    }
  }

  for (let i = 0; i < rows.length; i += 500) {
    await sql`insert into bookings ${sql(rows.slice(i, i + 500))}`;
  }
  // Clients "joined" on their first visit.
  await sql`
    update clients c set created_at = b.first
    from (select client_id, min(created_at) as first from bookings group by client_id) b
    where b.client_id = c.id`;
  console.log(`demo: ${clientRows.length} clients, ${rows.length} bookings (through ${format(addDays(todayLocal, 14), "yyyy-MM-dd")})`);
}

await wipe();
await applySchema();
await seedContent();
await seedSite(sql);
if (withDemo) await seedDemo();
const counts = await sql`
  select (select count(*) from services) services, (select count(*) from media) media,
         (select count(*) from posts) posts, (select count(*) from clients) clients,
         (select count(*) from bookings) bookings`;
console.log(counts[0]);
await sql.end();
