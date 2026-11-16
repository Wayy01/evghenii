// Removes every client and booking (the demo data) while keeping services, hours and content.
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
await sql`truncate bookings, clients restart identity cascade`;
console.log("bookings and clients cleared");
await sql.end();
