import "server-only";

import type { Specialist } from "@/domain/appointment";
import { toLocalIsoDate } from "@/lib/format";

import { APPOINTMENTS, DESIGN_DAY, SPECIALISTS, type MockAppointment } from "./mock/appointments";

export type DayAppointment = MockAppointment;

export interface AppointmentDay {
  date: string;
  specialists: ReadonlyArray<Specialist>;
  appointments: DayAppointment[];
}

/** The day the demo schedule opens on (Monday, 26 October 2026). */
export const DEFAULT_APPOINTMENT_DAY = DESIGN_DAY;

/** `GET /api/v1/admin/appointments/?date=YYYY-MM-DD` */
export async function getAppointmentDay(date: string): Promise<AppointmentDay> {
  return {
    date,
    specialists: SPECIALISTS,
    appointments: APPOINTMENTS.filter((a) => toLocalIsoDate(a.start) === date),
  };
}

export async function getPendingAppointments(): Promise<{ count: number; nextAt: string | null }> {
  const pending = APPOINTMENTS.filter((a) => a.status === "requested").sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  return { count: pending.length, nextAt: pending[0]?.start ?? null };
}
