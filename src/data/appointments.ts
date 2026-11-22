import "server-only";

import type {
  Appointment,
  AppointmentClinic,
  AppointmentStatus,
  BookingMeta,
  Specialist,
  VisitAction,
} from "@/domain/appointment";
import { diffDays, isIsoDate } from "@/lib/datetime";
import { toLocalIsoDate } from "@/lib/format";

import {
  apiAppointmentDay,
  apiAppointmentRange,
  apiAppointmentsMeta,
  apiPendingSummary,
} from "./api/admin";
import {
  mapAppointmentDay,
  mapAppointmentRange,
  mapBookingMeta,
  mapPendingSummary,
} from "./api/mappers/appointments";
import { requireApiToken } from "./auth";
import { DESIGN_DAY } from "./mock/appointments";
import * as mock from "./mock/appointments.queries";
import { requestNow } from "./now";
import { dataSource } from "./source";

/**
 * Appointments read seam (contract §2.9). Dispatches on `dataSource()`: mock
 * bodies live in `./mock/appointments.queries.ts`; the api branch calls
 * `appointments/?date=`, `appointments/range/`, `appointments/pending-summary/`
 * and `appointments/meta/` and maps them with `./api/mappers/appointments.ts`.
 */

/**
 * A visit on the day board: the domain appointment plus the service's short name. The
 * specialist's own board also carries the customer's note and the actions the server allows.
 */
export type DayAppointment = Appointment & {
  serviceShort: string;
  location: AppointmentClinic;
  customerNote?: string;
  allowedActions?: ReadonlyArray<VisitAction>;
};

export interface AppointmentDay {
  date: string;
  specialists: ReadonlyArray<Specialist>;
  appointments: DayAppointment[];
}

export type StatusCounts = Record<AppointmentStatus, number>;

/** One day of `appointments/range/`: what the month board draws in a cell. */
export interface AppointmentRangeDay {
  /** `YYYY-MM-DD` (Tashkent). */
  date: string;
  /** Appointments starting that day, by status (every status). */
  counts: StatusCounts;
  total: number;
  /** At least one listed specialist works that day. */
  working: boolean;
  /** Earliest start and latest end of the specialists working that day; `null` when nobody works. */
  hours: { start: string; end: string } | null;
}

export interface RangeSpecialist {
  id: string;
  name: string;
  role: Specialist["role"];
  isActive: boolean;
}

export type RangeDetail = "counts" | "full";

export interface AppointmentRangeQuery {
  /** First day, `YYYY-MM-DD`. */
  from: string;
  /** Last day (inclusive). */
  to: string;
  /** One specialist only (counts, schedules and appointments narrowed to them). */
  specialistId?: string;
  /** `counts` (default, ≤ 42 days) or `full` (≤ 7 days: schedules and appointments too). */
  detail?: RangeDetail;
}

export interface AppointmentRange {
  from: string;
  to: string;
  /** Active specialists plus inactive ones with an appointment in the range (narrowed by the filter). */
  specialists: RangeSpecialist[];
  /** One entry per date of `from`…`to`. */
  days: AppointmentRangeDay[];
  /** `detail: "full"` only: every date's schedule and appointments (the day board's shape). */
  schedules: AppointmentDay[] | null;
}

/** Longest range per detail level (the backend's `out_of_range` limits). */
export const RANGE_MAX_DAYS: Readonly<Record<RangeDetail, number>> = { counts: 42, full: 7 };

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

/**
 * `GET /api/v1/admin/appointments/range/?from=&to=&specialist_id=&detail=`:
 * the week board (`full`, 7 days) and the month board (`counts`, the 42 days
 * of its six-week page). A malformed or oversized range is a programming
 * error and throws before anything is fetched.
 */
export async function getAppointmentRange(query: AppointmentRangeQuery): Promise<AppointmentRange> {
  const detail = query.detail ?? "counts";
  if (!isIsoDate(query.from) || !isIsoDate(query.to)) {
    throw new RangeError(`Invalid appointment range ${query.from}…${query.to}`);
  }
  const span = diffDays(query.from, query.to) + 1;
  if (span < 1 || span > RANGE_MAX_DAYS[detail]) {
    throw new RangeError(`Appointment range of ${span} days (${detail})`);
  }
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const specialistId = query.specialistId && /^\d{1,12}$/.test(query.specialistId);
    const { data } = await apiAppointmentRange(token, {
      from: query.from,
      to: query.to,
      detail,
      ...(specialistId ? { specialist_id: Number(query.specialistId) } : {}),
    });
    return mapAppointmentRange(data);
  }
  return mock.getAppointmentRange({ ...query, detail });
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
