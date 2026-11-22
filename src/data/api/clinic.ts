import "server-only";

import { apiFetch, cachedGet, type QueryValue } from "./client";
import type {
  ApiBlockedPeriod,
  ApiBlockWrite,
  ApiClinicLocation,
  ApiClinicLocations,
  ApiClinicServicePatch,
  ApiClinicServiceWrite,
  ApiClinicSpecialist,
  ApiConflicts,
  ApiHoursOverride,
  ApiLocationPatch,
  ApiOverrideWrite,
  ApiPaginatedBlocks,
  ApiPaginatedOverrides,
  ApiPaginatedSpecialists,
  ApiSpecialistPatch,
  ApiWorkingWeekWrite,
} from "./types";

/**
 * Typed calls to the staff specialists, their services, schedules and clinic endpoints
 * (contract §2.17). Every write honours an optional `Idempotency-Key`, which
 * the Server Actions always send. Reads go through `cachedGet`; the lists a
 * dialog re-reads after a write use `apiFetch`.
 */

const BASE = "/api/v1/admin";
const id = (value: string | number) => encodeURIComponent(String(value));

/* --- Specialists --- */

export function apiListSpecialists(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedSpecialists>(`${BASE}/specialists/`, params, token);
}

export function apiGetSpecialist(token: string, specialistId: string) {
  return cachedGet<ApiClinicSpecialist>(
    `${BASE}/specialists/${id(specialistId)}/`,
    undefined,
    token,
  );
}

export function apiPatchSpecialist(
  token: string,
  specialistId: string,
  body: ApiSpecialistPatch,
  key: string,
) {
  return apiFetch<ApiClinicSpecialist>(`${BASE}/specialists/${id(specialistId)}/`, {
    method: "PATCH",
    body,
    token,
    idempotencyKey: key,
  });
}

/** Multipart, one part `file` (product-image rules). */
export function apiPutSpecialistPhoto(
  token: string,
  specialistId: string,
  form: FormData,
  key: string,
) {
  return apiFetch<ApiClinicSpecialist>(`${BASE}/specialists/${id(specialistId)}/photo/`, {
    method: "PUT",
    formData: form,
    token,
    idempotencyKey: key,
    timeoutMs: 30_000,
  });
}

export function apiDeleteSpecialistPhoto(token: string, specialistId: string) {
  return apiFetch<undefined>(`${BASE}/specialists/${id(specialistId)}/photo/`, {
    method: "DELETE",
    token,
  });
}

/* --- One specialist's own services (each answers the whole profile; delete answers 204) --- */

export function apiCreateSpecialistService(
  token: string,
  specialistId: string,
  body: ApiClinicServiceWrite,
  key: string,
) {
  return apiFetch<ApiClinicSpecialist>(`${BASE}/specialists/${id(specialistId)}/services/`, {
    method: "POST",
    body,
    token,
    idempotencyKey: key,
  });
}

export function apiPatchSpecialistService(
  token: string,
  specialistId: string,
  serviceId: string,
  body: ApiClinicServicePatch,
  key: string,
) {
  return apiFetch<ApiClinicSpecialist>(
    `${BASE}/specialists/${id(specialistId)}/services/${id(serviceId)}/`,
    { method: "PATCH", body, token, idempotencyKey: key },
  );
}

/** 409 `conflict` once the service has appointments (deactivate it instead). */
export function apiDeleteSpecialistService(
  token: string,
  specialistId: string,
  serviceId: string,
  key: string,
) {
  return apiFetch<undefined>(`${BASE}/specialists/${id(specialistId)}/services/${id(serviceId)}/`, {
    method: "DELETE",
    token,
    idempotencyKey: key,
  });
}

export function apiPutWorkingHours(
  token: string,
  specialistId: string,
  body: ApiWorkingWeekWrite,
  key: string,
) {
  return apiFetch<ApiClinicSpecialist>(`${BASE}/specialists/${id(specialistId)}/working-hours/`, {
    method: "PUT",
    body,
    token,
    idempotencyKey: key,
  });
}

export function apiListOverrides(
  token: string,
  specialistId: string,
  params: Record<string, QueryValue>,
) {
  return cachedGet<ApiPaginatedOverrides>(
    `${BASE}/specialists/${id(specialistId)}/overrides/`,
    params,
    token,
  );
}

export function apiCreateOverride(
  token: string,
  specialistId: string,
  body: ApiOverrideWrite,
  key: string,
) {
  return apiFetch<ApiHoursOverride>(`${BASE}/specialists/${id(specialistId)}/overrides/`, {
    method: "POST",
    body,
    token,
    idempotencyKey: key,
  });
}

export function apiDeleteOverride(
  token: string,
  specialistId: string,
  overrideId: string,
  key: string,
) {
  return apiFetch<undefined>(
    `${BASE}/specialists/${id(specialistId)}/overrides/${id(overrideId)}/`,
    { method: "DELETE", token, idempotencyKey: key },
  );
}

export function apiListBlocks(
  token: string,
  specialistId: string,
  params: Record<string, QueryValue>,
) {
  return cachedGet<ApiPaginatedBlocks>(
    `${BASE}/specialists/${id(specialistId)}/blocks/`,
    params,
    token,
  );
}

export function apiCreateBlock(
  token: string,
  specialistId: string,
  body: ApiBlockWrite,
  key: string,
) {
  return apiFetch<ApiBlockedPeriod>(`${BASE}/specialists/${id(specialistId)}/blocks/`, {
    method: "POST",
    body,
    token,
    idempotencyKey: key,
  });
}

export function apiDeleteBlock(token: string, specialistId: string, blockId: string, key: string) {
  return apiFetch<undefined>(`${BASE}/specialists/${id(specialistId)}/blocks/${id(blockId)}/`, {
    method: "DELETE",
    token,
    idempotencyKey: key,
  });
}

export function apiSpecialistConflicts(token: string, specialistId: string) {
  return cachedGet<ApiConflicts>(
    `${BASE}/specialists/${id(specialistId)}/conflicts/`,
    undefined,
    token,
  );
}

/* --- Clinics --- */

export function apiListClinics(token: string) {
  return cachedGet<ApiClinicLocations>(`${BASE}/clinics/`, undefined, token);
}

export function apiSaveClinic(
  token: string,
  clinicId: string | null,
  body: ApiLocationPatch,
  key: string,
) {
  const path = clinicId === null ? `${BASE}/clinics/` : `${BASE}/clinics/${id(clinicId)}/`;
  return apiFetch<ApiClinicLocation>(path, {
    method: clinicId === null ? "POST" : "PATCH",
    body,
    token,
    idempotencyKey: key,
  });
}
