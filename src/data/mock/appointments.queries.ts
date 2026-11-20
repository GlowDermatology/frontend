import type { AppointmentStatus, BookingMeta, Specialist } from "@/domain/appointment";
import { addDays, diffDays } from "@/lib/datetime";
import { startOfLocalDay, toLocalIsoDate } from "@/lib/format";

import type {
  AppointmentDay,
  AppointmentRange,
  AppointmentRangeDay,
  AppointmentRangeQuery,
  PendingAppointments,
} from "../appointments";
import { FALLBACK_BLOCK_LABEL } from "../api/mappers/appointments";
import { referenceNow } from "../config";
import {
  APPOINTMENTS,
  BOOKING_META,
  SPECIALISTS,
  appointmentsOn,
  isClosedDay,
} from "./appointments";

/**
 * Mock implementation of `src/data/appointments.ts`. The fixture week is
 * anchored on `DESIGN_DAY` (Monday, 26 October 2026); every other day gets
 * deterministic synthetic visits (`syntheticDay`), and Sundays are closed.
 */

const OPEN_HOURS = { start: "09:00", end: "18:00" } as const;

/** The specialists of a day: on a closed day nobody works (drawn like the API's `working_hours: null`). */
function specialistsOn(date: string): ReadonlyArray<Specialist> {
  if (!isClosedDay(date)) return SPECIALISTS;
  return SPECIALISTS.map((specialist) => ({
    ...specialist,
    location: null,
    workingHours: { ...OPEN_HOURS },
    blocks: [{ ...OPEN_HOURS, kind: "off", label: FALLBACK_BLOCK_LABEL.dayOff }],
    working: false,
  }));
}

export async function getAppointmentDay(date: string): Promise<AppointmentDay> {
  return { date, specialists: specialistsOn(date), appointments: appointmentsOn(date) };
}

const STATUSES: ReadonlyArray<AppointmentStatus> = [
  "requested",
  "confirmed",
  "attended",
  "rejected",
  "cancelled",
];

/**
 * `appointments/range/` from the same days the day board shows: counts per
 * status, `working` / `hours` from the (fixed) opening hours, the full detail
 * as one day schedule per date. `specialistId` narrows everything to one
 * specialist, like the backend; an unknown id lists nobody.
 */
export async function getAppointmentRange(query: AppointmentRangeQuery): Promise<AppointmentRange> {
  const span = diffDays(query.from, query.to) + 1;
  const keep = (id: string) => !query.specialistId || id === query.specialistId;
  const specialists = SPECIALISTS.filter((s) => keep(s.id));
  const days: AppointmentRangeDay[] = [];
  const schedules: AppointmentDay[] = [];
  for (let offset = 0; offset < span; offset += 1) {
    const date = addDays(query.from, offset);
    const appointments = appointmentsOn(date).filter((a) => keep(a.specialistId));
    const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<
      AppointmentStatus,
      number
    >;
    for (const appointment of appointments) counts[appointment.status] += 1;
    const working = specialists.length > 0 && !isClosedDay(date);
    days.push({
      date,
      counts,
      total: appointments.length,
      working,
      hours: working ? { ...OPEN_HOURS } : null,
    });
    if (query.detail === "full") {
      schedules.push({
        date,
        specialists: specialistsOn(date).filter((s) => keep(s.id)),
        appointments,
      });
    }
  }
  return {
    from: query.from,
    to: query.to,
    specialists: specialists.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      isActive: s.isActive !== false,
    })),
    days,
    schedules: query.detail === "full" ? schedules : null,
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
