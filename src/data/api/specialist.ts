import "server-only";

import { apiFetch } from "./client";
import type {
  ApiAppointmentCancel,
  ApiAppointmentsMeta,
  ApiBlockedPeriod,
  ApiBlockWrite,
  ApiClinicServicePatch,
  ApiClinicServiceWrite,
  ApiHoursOverride,
  ApiOverrideWrite,
  ApiOwnProfilePatch,
  ApiPendingSummary,
  ApiSpecialistAppointmentCreate,
  ApiSpecialistAppointmentDay,
  ApiSpecialistAppointmentItem,
  ApiSpecialistAppointmentRange,
  ApiSpecialistAvailability,
  ApiSpecialistConflicts,
  ApiSpecialistOwnProfile,
  ApiSpecialistReschedule,
  ApiWorkingWeekWrite,
} from "./types";

/**
 * Typed calls to the signed-in specialist's own routes (`/api/v1/admin/specialist/…`, role
 * specialist only: 403 for anyone else). The profile is always the caller's, never an id. Reads
 * are uncached (`apiFetch`): every page of the workspace shows the caller's live data, and the
 * writes re-render the route (`refresh()`). Every write sends the Idempotency-Key; the
 * appointment writes require it.
 */

const BASE = "/api/v1/admin/specialist";
const id = (value: string | number) => encodeURIComponent(String(value));

/* --- Profile and photo --- */

export function apiGetOwnProfile(token: string) {
  return apiFetch<ApiSpecialistOwnProfile>(`${BASE}/profile/`, { token });
}

/**
 * Every profile field but the clinics and the site order; texts merge leaf by leaf. Publishing
 * (`is_active: true`) answers 409 `conflict` while blockers remain, an unpublish with visits
 * ahead 409 unless `force`.
 */
export function apiPatchOwnProfile(token: string, body: ApiOwnProfilePatch, key: string) {
  return apiFetch<ApiSpecialistOwnProfile>(`${BASE}/profile/`, {
    method: "PATCH",
    body,
    token,
    idempotencyKey: key,
  });
}

/** Multipart, one part `file` (JPEG, PNG or WebP, ≤ 5 MiB). */
export function apiPutOwnProfilePhoto(token: string, form: FormData, key: string) {
  return apiFetch<ApiSpecialistOwnProfile>(`${BASE}/profile/photo/`, {
    method: "PUT",
    formData: form,
    token,
    idempotencyKey: key,
    timeoutMs: 30_000,
  });
}

export function apiDeleteOwnProfilePhoto(token: string, key: string) {
  return apiFetch<undefined>(`${BASE}/profile/photo/`, {
    method: "DELETE",
    token,
    idempotencyKey: key,
  });
}

/* --- Schedule --- */

/** Clinics (every assigned one, inactive included), weekly hours, overrides and blocks ahead. */
export function apiGetOwnAvailability(token: string) {
  return apiFetch<ApiSpecialistAvailability>(`${BASE}/availability/`, { token });
}

export function apiPutOwnWeeklyHours(token: string, body: ApiWorkingWeekWrite, key: string) {
  return apiFetch<ApiSpecialistOwnProfile>(`${BASE}/weekly-hours/`, {
    method: "PUT",
    body,
    token,
    idempotencyKey: key,
  });
}

export function apiCreateOwnOverride(token: string, body: ApiOverrideWrite, key: string) {
  return apiFetch<ApiHoursOverride>(`${BASE}/overrides/`, {
    method: "POST",
    body,
    token,
    idempotencyKey: key,
  });
}

export function apiCreateOwnBlock(token: string, body: ApiBlockWrite, key: string) {
  return apiFetch<ApiBlockedPeriod>(`${BASE}/blocks/`, {
    method: "POST",
    body,
    token,
    idempotencyKey: key,
  });
}

export function apiDeleteOwnScheduleEntry(
  token: string,
  kind: "override" | "block",
  entryId: string,
  key: string,
) {
  const section = kind === "override" ? "overrides" : "blocks";
  return apiFetch<undefined>(`${BASE}/${section}/${id(entryId)}/`, {
    method: "DELETE",
    token,
    idempotencyKey: key,
  });
}

/** Open visits ahead that the current schedule no longer covers. */
export function apiOwnConflicts(token: string) {
  return apiFetch<ApiSpecialistConflicts>(`${BASE}/conflicts/`, { token });
}

/* --- Own services (create and update answer the whole profile; delete answers 204) --- */

export function apiCreateOwnService(token: string, body: ApiClinicServiceWrite, key: string) {
  return apiFetch<ApiSpecialistOwnProfile>(`${BASE}/services/`, {
    method: "POST",
    body,
    token,
    idempotencyKey: key,
  });
}

export function apiPatchOwnService(
  token: string,
  serviceId: string,
  body: ApiClinicServicePatch,
  key: string,
) {
  return apiFetch<ApiSpecialistOwnProfile>(`${BASE}/services/${id(serviceId)}/`, {
    method: "PATCH",
    body,
    token,
    idempotencyKey: key,
  });
}

/** 409 `conflict` once the service has appointments (deactivate it instead). */
export function apiDeleteOwnService(token: string, serviceId: string, key: string) {
  return apiFetch<undefined>(`${BASE}/services/${id(serviceId)}/`, {
    method: "DELETE",
    token,
    idempotencyKey: key,
  });
}

/* --- Own appointments board --- */

export function apiOwnAppointmentDay(token: string, date: string) {
  return apiFetch<ApiSpecialistAppointmentDay>(`${BASE}/appointments/`, {
    query: { date },
    token,
  });
}

/** `counts` ≤ 42 days, `full` ≤ 7 days; the own profile is always listed, even as a draft. */
export function apiOwnAppointmentRange(
  token: string,
  query: { from: string; to: string; detail: "counts" | "full" },
) {
  return apiFetch<ApiSpecialistAppointmentRange>(`${BASE}/appointments/range/`, {
    query,
    token,
  });
}

/** The caller with their active clinics and services; no specialist while unpublished. */
export function apiOwnAppointmentsMeta(token: string) {
  return apiFetch<ApiAppointmentsMeta>(`${BASE}/appointments/meta/`, { token });
}

export function apiOwnPendingSummary(token: string) {
  return apiFetch<ApiPendingSummary>(`${BASE}/appointments/pending-summary/`, { token });
}

/** A confirmed visit by phone; `name` creates the customer of an unknown phone. */
export function apiCreateOwnAppointment(
  token: string,
  body: ApiSpecialistAppointmentCreate,
  key: string,
) {
  return apiFetch<ApiSpecialistAppointmentItem>(`${BASE}/appointments/`, {
    method: "POST",
    body,
    token,
    idempotencyKey: key,
  });
}

export function apiOwnAppointmentAction(
  token: string,
  appointmentId: string,
  action: "confirm" | "reject" | "attend",
  key: string,
) {
  return apiFetch<ApiSpecialistAppointmentItem>(
    `${BASE}/appointments/${id(appointmentId)}/${action}/`,
    { method: "POST", body: {}, token, idempotencyKey: key },
  );
}

/** A clinic move needs `customer_agreed`; the specialist never changes. */
export function apiRescheduleOwnAppointment(
  token: string,
  appointmentId: string,
  body: ApiSpecialistReschedule,
  key: string,
) {
  return apiFetch<ApiSpecialistAppointmentItem>(
    `${BASE}/appointments/${id(appointmentId)}/reschedule/`,
    { method: "POST", body, token, idempotencyKey: key },
  );
}

/** The optional reason is kept for staff only (the specialist never reads it back). */
export function apiCancelOwnAppointment(
  token: string,
  appointmentId: string,
  body: ApiAppointmentCancel,
  key: string,
) {
  return apiFetch<ApiSpecialistAppointmentItem>(
    `${BASE}/appointments/${id(appointmentId)}/cancel/`,
    { method: "POST", body, token, idempotencyKey: key },
  );
}
