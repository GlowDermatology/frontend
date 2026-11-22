import "server-only";

import { cache } from "react";

import type { BookingMeta } from "@/domain/appointment";
import type {
  BlockedPeriod,
  ClinicLocation,
  ClinicSpecialist,
  HoursOverride,
} from "@/domain/clinic";
import { diffDays, isIsoDate } from "@/lib/datetime";

import {
  apiGetOwnAvailability,
  apiGetOwnProfile,
  apiOwnAppointmentDay,
  apiOwnAppointmentRange,
  apiOwnAppointmentsMeta,
  apiOwnConflicts,
  apiOwnPendingSummary,
} from "./api/specialist";
import { isApiError } from "./api/errors";
import {
  mapAppointmentDay,
  mapAppointmentRange,
  mapBookingMeta,
  mapDayAppointment,
  mapPendingSummary,
} from "./api/mappers/appointments";
import { mapBlock, mapClinicSpecialist, mapLocation, mapOverride } from "./api/mappers/clinic";
import type { ApiSpecialistOwnProfile } from "./api/types";
import {
  RANGE_MAX_DAYS,
  type AppointmentDay,
  type AppointmentRange,
  type DayAppointment,
  type PendingAppointments,
  type RangeDetail,
} from "./appointments";
import { getMe, verifyStaff } from "./auth";

/**
 * The signed-in specialist's own read seam (`/api/v1/admin/specialist/…`). API only: mock mode is
 * always an administrator, and the workspace pages redirect there (`requireSpecialist()`). Each
 * loader takes the token `requireSpecialist()` returned.
 */

/** The own profile with the clinics staff assigned (primary first, inactive ones included). */
export interface OwnProfile {
  profile: ClinicSpecialist;
  clinics: ClinicLocation[];
}

export function mapOwnProfile(api: ApiSpecialistOwnProfile): OwnProfile {
  return { profile: mapClinicSpecialist(api), clinics: api.clinics.map(mapLocation) };
}

/** `GET specialist/profile/`: the own profile, draft or published. */
export async function getMyProfile(token: string): Promise<OwnProfile> {
  return mapOwnProfile((await apiGetOwnProfile(token)).data);
}

export interface OwnAvailability {
  clinics: ClinicLocation[];
  overrides: HoursOverride[];
  blocks: BlockedPeriod[];
}

/** `GET specialist/availability/`: the clinics, and the overrides and blocks from today on. */
export async function getMyAvailability(token: string): Promise<OwnAvailability> {
  const { data } = await apiGetOwnAvailability(token);
  return {
    clinics: data.clinics.map(mapLocation),
    overrides: data.overrides.map(mapOverride),
    blocks: data.blocks.map(mapBlock),
  };
}

/** `GET specialist/conflicts/`: open visits ahead the schedule no longer covers. */
export async function getMyConflicts(token: string): Promise<DayAppointment[]> {
  return (await apiOwnConflicts(token)).data.results.map(mapDayAppointment);
}

/** `GET specialist/appointments/?date=`: the day board (the caller only). */
export async function getMyAppointmentDay(token: string, date: string): Promise<AppointmentDay> {
  return mapAppointmentDay((await apiOwnAppointmentDay(token, date)).data);
}

/**
 * `GET specialist/appointments/range/`: the week (`full`, 7 days) and month (`counts`, 42 days)
 * boards. A malformed or oversized range is a programming error and throws before the call.
 */
export async function getMyAppointmentRange(
  token: string,
  query: { from: string; to: string; detail: RangeDetail },
): Promise<AppointmentRange> {
  if (!isIsoDate(query.from) || !isIsoDate(query.to)) {
    throw new RangeError(`Invalid appointment range ${query.from}…${query.to}`);
  }
  const span = diffDays(query.from, query.to) + 1;
  if (span < 1 || span > RANGE_MAX_DAYS[query.detail]) {
    throw new RangeError(`Appointment range of ${span} days (${query.detail})`);
  }
  return mapAppointmentRange((await apiOwnAppointmentRange(token, query)).data);
}

/** `GET specialist/appointments/meta/`: what the booking dialog offers (empty while unpublished). */
export async function getMyBookingMeta(token: string): Promise<BookingMeta> {
  return mapBookingMeta((await apiOwnAppointmentsMeta(token)).data);
}

/** `GET specialist/appointments/pending-summary/`: own requests waiting for an answer. */
export async function getMyPendingSummary(token: string): Promise<PendingAppointments> {
  return mapPendingSummary((await apiOwnPendingSummary(token)).data);
}

/** The signed-in specialist's own visits waiting for confirmation (the sidebar badge). */
export type MyPendingAppointments = PendingAppointments;

/**
 * The sidebar badge of the specialist workspace, cached per request: `null` (no badge) without a
 * specialist api session or when the read fails, so the shell never breaks on it.
 */
export const getMyPendingAppointments = cache(async (): Promise<MyPendingAppointments | null> => {
  const session = await verifyStaff();
  if (!session.ok || session.mode !== "api") return null;
  if ((await getMe())?.role !== "specialist") return null;
  try {
    return await getMyPendingSummary(session.token);
  } catch (error) {
    if (isApiError(error)) return null;
    throw error;
  }
});
