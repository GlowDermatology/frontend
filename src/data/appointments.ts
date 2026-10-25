import "server-only";

import type { Appointment, BookingMeta, Specialist } from "@/domain/appointment";
import { toLocalIsoDate } from "@/lib/format";

import { apiAppointmentDay, apiAppointmentsMeta, apiPendingSummary } from "./api/admin";
import { mapAppointmentDay, mapBookingMeta, mapPendingSummary } from "./api/mappers/appointments";
import { requireApiToken } from "./auth";
import { DESIGN_DAY } from "./mock/appointments";
import * as mock from "./mock/appointments.queries";
import { requestNow } from "./now";
import { dataSource } from "./source";

/**
 * Appointments read seam (contract §2.9). Dispatches on `dataSource()`: mock
 * bodies live in `./mock/appointments.queries.ts`; the api branch calls
 * `appointments/?date=`, `appointments/pending-summary/` and
 * `appointments/meta/` and maps them with `./api/mappers/appointments.ts`.
 */

/** A visit on the day board: the domain appointment plus the service's short name. */
export type DayAppointment = Appointment & { serviceShort: string };

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
 * Tashkent from the server clock in api mode (`requestNow()` reads it after
 * `connection()`), the design's Monday (26 October 2026) in mock mode.
 */
export async function defaultAppointmentDay(): Promise<string> {
  if ((await dataSource()) === "api") return toLocalIsoDate(await requestNow());
  return DESIGN_DAY;
}

/** `GET /api/v1/admin/appointments/?date=YYYY-MM-DD` */
export async function getAppointmentDay(date: string): Promise<AppointmentDay> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    return mapAppointmentDay((await apiAppointmentDay(token, date)).data);
  }
  return mock.getAppointmentDay(date);
}

/** `GET /api/v1/admin/appointments/pending-summary/` (requests with start ≥ now). */
export async function getPendingAppointments(): Promise<PendingAppointments> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    return mapPendingSummary((await apiPendingSummary(token)).data);
  }
  return mock.getPendingAppointments();
}

/** `GET /api/v1/admin/appointments/meta/`: what the booking dialogs offer. */
export async function getBookingMeta(): Promise<BookingMeta> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    return mapBookingMeta((await apiAppointmentsMeta(token)).data);
  }
  return mock.getBookingMeta();
}
