import type { BookingMeta } from "@/domain/appointment";
import { startOfLocalDay, toLocalIsoDate } from "@/lib/format";

import type { AppointmentDay, PendingAppointments } from "../appointments";
import { referenceNow } from "../config";
import { APPOINTMENTS, BOOKING_META, SPECIALISTS } from "./appointments";

/**
 * Mock implementation of `src/data/appointments.ts`. The fixture week is
 * anchored on `DESIGN_DAY` (Monday, 26 October 2026).
 */

export async function getAppointmentDay(date: string): Promise<AppointmentDay> {
  return {
    date,
    specialists: SPECIALISTS,
    appointments: APPOINTMENTS.filter((a) => toLocalIsoDate(a.start) === date),
  };
}

/**
 * Requests that still await an answer (contract §2.9, M3): every `requested`
 * visit from the start of the demo clock's day in Tashkent, so one of today's
 * whose time already passed still counts; `nextAt` is the earliest of them.
 */
export async function getPendingAppointments(): Promise<PendingAppointments> {
  const since = startOfLocalDay(toLocalIsoDate(referenceNow())).getTime();
  const pending = APPOINTMENTS.filter(
    (a) => a.status === "requested" && Date.parse(a.start) >= since,
  ).sort((a, b) => a.start.localeCompare(b.start));
  return { count: pending.length, nextAt: pending[0]?.start ?? null };
}

export async function getBookingMeta(): Promise<BookingMeta> {
  return BOOKING_META;
}
