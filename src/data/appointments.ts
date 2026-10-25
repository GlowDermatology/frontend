import "server-only";

import type { Specialist } from "@/domain/appointment";
import { toLocalIsoDate } from "@/lib/format";

import { DESIGN_DAY, type MockAppointment } from "./mock/appointments";
import * as mock from "./mock/appointments.queries";
import { requestNow } from "./now";
import { dataSource, notWiredYet } from "./source";

/**
 * Appointments read seam. Dispatches on `dataSource()`: mock bodies live in
 * `./mock/appointments.queries.ts`; the api branch is not wired yet (F2) and
 * returns an empty day (no specialists, no bookings) via `notWiredYet`.
 */

export type DayAppointment = MockAppointment;

export interface AppointmentDay {
  date: string;
  specialists: ReadonlyArray<Specialist>;
  appointments: DayAppointment[];
}

export interface PendingAppointments {
  count: number;
  nextAt: string | null;
}

/**
 * The day the schedule opens on without `?date=` (contract §7.13): today in
 * Tashkent in api mode, the design's Monday (26 October 2026) in mock mode.
 */
export async function defaultAppointmentDay(): Promise<string> {
  if ((await dataSource()) === "api") return toLocalIsoDate(await requestNow());
  return DESIGN_DAY;
}

const RESOURCE = "appointments";

/** `GET /api/v1/admin/appointments/?date=YYYY-MM-DD` */
export async function getAppointmentDay(date: string): Promise<AppointmentDay> {
  if ((await dataSource()) === "api") {
    return notWiredYet(RESOURCE, { date, specialists: [], appointments: [] });
  }
  return mock.getAppointmentDay(date);
}

/** `GET /api/v1/admin/appointments/pending-summary/` */
export async function getPendingAppointments(): Promise<PendingAppointments> {
  if ((await dataSource()) === "api") return notWiredYet(RESOURCE, { count: 0, nextAt: null });
  return mock.getPendingAppointments();
}
