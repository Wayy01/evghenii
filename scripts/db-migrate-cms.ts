// Adds the content-management tables and columns to an existing database, keeping all data.
import postgres from "postgres";
import { seedSite } from "./seed-site";

const sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });

await sql.unsafe(`
  ALTER TABLE services ADD COLUMN IF NOT EXISTS image text;
  ALTER TABLE media ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
  CREATE TABLE IF NOT EXISTS site_texts (
    locale     text NOT NULL,
    key        text NOT NULL,
    value      text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (locale, key)
  );
  CREATE TABLE IF NOT EXISTS site_config (
    key        text PRIMARY KEY,
    value      jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`);
await seedSite(sql);

const [state] = await sql`
  select (select count(*)::int from site_config) config_rows,
         (select count(*)::int from site_texts) text_edits,
         (select count(*)::int from services where image is not null) services_with_image,
         (select count(distinct sort_order)::int from media) distinct_media_positions`;
console.log(state);
await sql.end();
