import { toLocalIsoDate } from "@/lib/format";

import type { AppointmentDay, PendingAppointments } from "../appointments";
import { APPOINTMENTS, SPECIALISTS } from "./appointments";

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

export async function getPendingAppointments(): Promise<PendingAppointments> {
  const pending = APPOINTMENTS.filter((a) => a.status === "requested").sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  return { count: pending.length, nextAt: pending[0]?.start ?? null };
}
