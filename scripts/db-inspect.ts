// Lists every non-system schema, table and row count in the configured database.
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });

const tables = await sql<{ table_schema: string; table_name: string }[]>`
  select table_schema, table_name from information_schema.tables
  where table_schema not in ('pg_catalog', 'information_schema') and table_type = 'BASE TABLE'
  order by 1, 2`;

for (const t of tables) {
  const [{ n }] = await sql.unsafe(`select count(*)::int n from "${t.table_schema}"."${t.table_name}"`);
  console.log(`${t.table_schema}.${t.table_name}: ${n}`);
}
if (tables.length === 0) console.log("no tables");
const [v] = await sql`select version(), current_database() db, current_user usr`;
console.log(v.version, "|", v.db, "|", v.usr);
await sql.end();
