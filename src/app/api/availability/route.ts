import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { BOOKING_WINDOW_DAYS, getAvailability } from "@/lib/availability";
import { addDaysKey, toDateKey } from "@/lib/time";

// GET /api/availability?service=<slug>&from=YYYY-MM-DD&days=14
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const slug = params.get("service") ?? "";
  const today = toDateKey(new Date());
  const lastDay = addDaysKey(today, BOOKING_WINDOW_DAYS);

  let from = params.get("from") ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || from < today) from = today;
  if (from > lastDay) return NextResponse.json({ days: [] });
  const requested = Math.min(Math.max(Number(params.get("days")) || 14, 1), BOOKING_WINDOW_DAYS + 1);

  const [service] = await db
    .select({ durationMin: schema.services.durationMin })
    .from(schema.services)
    .where(and(eq(schema.services.slug, slug), eq(schema.services.active, true)))
    .limit(1);
  if (!service) return NextResponse.json({ error: "unknown service" }, { status: 404 });

  const days = await getAvailability({ durationMin: service.durationMin, from, days: requested });
  return NextResponse.json(
    { days: days.filter((d) => d.date <= lastDay) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
