import { NextResponse, type NextRequest } from "next/server";
import { isDateKey } from "@/components/admin/calendar/range";
import { getCalendarRange, getDayCounts } from "@/lib/admin/calendar";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/session";

// GET ?from=YYYY-MM-DD&days=N[&counts=1]: range data for the calendar's client-side paging.
export async function GET(request: NextRequest) {
  if (!verifySessionValue(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const from = params.get("from");
  const days = Number(params.get("days"));
  if (!isDateKey(from) || !Number.isInteger(days) || days < 1 || days > 62) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const body = params.get("counts") ? { counts: await getDayCounts(from, days) } : await getCalendarRange(from, days);
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
