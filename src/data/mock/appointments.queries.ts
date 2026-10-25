import type { BookingMeta } from "@/domain/appointment";
import { toLocalIsoDate } from "@/lib/format";

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

/** Requests whose start is still ahead of the demo clock (contract §2.9). */
export async function getPendingAppointments(): Promise<PendingAppointments> {
  const now = referenceNow().getTime();
  const pending = APPOINTMENTS.filter(
    (a) => a.status === "requested" && Date.parse(a.start) >= now,
  ).sort((a, b) => a.start.localeCompare(b.start));
  return { count: pending.length, nextAt: pending[0]?.start ?? null };
}

export async function getBookingMeta(): Promise<BookingMeta> {
  return BOOKING_META;
}
