import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { tr, hasLocale } from "@/i18n/config";
import { getSite } from "@/lib/content";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

// An .ics file so the client can drop the appointment into any calendar app.
export async function GET(_request: Request, ctx: RouteContext<"/api/booking/[token]/ics">) {
  const { token } = await ctx.params;
  const [row] = await db
    .select({ booking: schema.bookings, service: schema.services })
    .from(schema.bookings)
    .innerJoin(schema.services, eq(schema.services.id, schema.bookings.serviceId))
    .where(eq(schema.bookings.manageToken, token))
    .limit(1);
  if (!row) return new Response("Not found", { status: 404 });

  const { booking, service } = row;
  const locale = hasLocale(booking.locale) ? booking.locale : "ro";
  const site = await getSite();
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Evghenii//Booking//RO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:booking-${booking.id}@evghenii`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(booking.startsAt)}`,
    `DTEND:${stamp(booking.endsAt)}`,
    `SUMMARY:${escape(`${tr(locale, service.nameRo, service.nameRu)} · Evghenii`)}`,
    `LOCATION:${escape(site.address[locale])}`,
    `DESCRIPTION:${escape(site.phoneDisplay)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Evghenii",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="evghenii-${booking.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
