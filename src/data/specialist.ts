import "server-only";

import { apiFetch } from "./api/client";
import type { components } from "./api/schema";

export type SpecialistCalendar = components["schemas"]["SpecialistCalendar"];
export type SpecialistAvailability = components["schemas"]["SpecialistAvailability"];
export type SpecialistBooking = components["schemas"]["SpecialistBooking"];

export async function getMySchedule(token: string, from: string, to: string) {
  const root = "/api/v1/admin/specialist";
  const [calendar, availability, conflicts] = await Promise.all([
    apiFetch<SpecialistCalendar>(root + "/calendar/", { token, query: { from, to } }),
    apiFetch<SpecialistAvailability>(root + "/availability/", { token }),
    apiFetch<components["schemas"]["SpecialistConflicts"]>(root + "/conflicts/", { token }),
  ]);
  return { ...calendar.data, availability: availability.data, conflicts: conflicts.data.results };
}
