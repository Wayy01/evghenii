import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { seedContent } from "../../scripts/seed-content";
import { seedSite } from "../../scripts/seed-site";

// The hosted database is reachable only from the running app, not from a laptop or the
// build, so a fresh one gets its tables and starting content here on first start.
export async function setUpEmptyDatabase() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      // Instances starting side by side wait here, then find the tables already made.
      await tx`select pg_advisory_xact_lock(hashtext('evghenii:setup'))`;
      const [{ exists }] = await tx`select to_regclass('public.services') is not null as exists`;
      if (exists) return;
      await tx.unsafe(await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8"));
      await seedContent(tx);
      await seedSite(tx);
      console.log("Empty database: created the tables and the starting content.");
    });
  } finally {
    await sql.end();
  }
}
