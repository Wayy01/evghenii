import type { BookingStatus } from "@/db/schema";

/** Serializable booking as the calendar sees it; instants are epoch milliseconds. */
export type CalBooking = {
  id: number;
  start: number;
  end: number;
  status: BookingStatus;
  price: number;
  comment: string;
  source: "online" | "manual";
  createdAt: number;
  clientId: number;
  clientName: string;
  clientPhone: string;
  serviceId: number;
  serviceRo: string;
  serviceRu: string;
};

export type CalTimeOff = { id: number; start: number; end: number; reason: string };

export type CalHours = { weekday: number; isOpen: boolean; openTime: string; closeTime: string };

export type CalService = { id: number; nameRo: string; nameRu: string; durationMin: number; price: number };

export type CalRangeData = { bookings: CalBooking[]; timeOff: CalTimeOff[] };

export type CalView = "day" | "week";

export const CAL_VIEWS: CalView[] = ["day", "week"];

export type CalActionError = "conflict" | "invalid" | "notFound";
export type CalActionResult<T = CalBooking> = { ok: true; booking: T } | { ok: false; error: CalActionError };
