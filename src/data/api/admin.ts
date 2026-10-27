import "server-only";

import { apiFetch, apiFetchRaw, cachedGet, type QueryValue } from "./client";
import type {
  ApiAppointmentCancel,
  ApiAppointmentCreate,
  ApiAppointmentItem,
  ApiAppointmentReschedule,
  ApiAppointmentsMeta,
  ApiDaySchedule,
  ApiNavCounts,
  ApiNotificationMeta,
  ApiNotificationRecord,
  ApiPaginatedAuditLog,
  ApiPaginatedCustomers,
  ApiPaginatedNotifications,
  ApiPaginatedSegments,
  ApiPendingSummary,
  ApiSegment,
  ApiSegmentMembersInput,
  ApiSegmentPatch,
  ApiSegmentWrite,
  ApiSettings,
  ApiSettingsPatch,
  ApiStatusTemplate,
  ApiTemplateStatus,
  ApiTemplateUpdate,
  ChangePasswordRequest,
} from "./types";

/**
 * Typed calls to the M1d shell endpoints (contract §2.8–§2.11, §2.13):
 * appointments, notifications and their templates, segments, settings, the
 * audit log, the nav counts and the password change. Reads go through
 * `cachedGet` (deduplicated per render), writes and the reads a client
 * re-fetches through a Server Action through `apiFetch`. Every function
 * throws `ApiError` for a non-2xx answer.
 */

const BASE = "/api/v1/admin";
const id = (value: string | number) => encodeURIComponent(String(value));

/* --- Appointments --- */

export function apiAppointmentDay(token: string, date: string) {
  return cachedGet<ApiDaySchedule>(`${BASE}/appointments/`, { date }, token);
}

/** Uncached: the booking dialog re-reads another day through a Server Action. */
export function apiAppointmentDayFresh(token: string, date: string) {
  return apiFetch<ApiDaySchedule>(`${BASE}/appointments/`, { query: { date }, token });
}

export function apiPendingSummary(token: string) {
  return cachedGet<ApiPendingSummary>(`${BASE}/appointments/pending-summary/`, undefined, token);
}

export function apiAppointmentsMeta(token: string) {
  return cachedGet<ApiAppointmentsMeta>(`${BASE}/appointments/meta/`, undefined, token);
}

/** `confirm | reject | attend` — `Idempotency-Key` required (§1.7). */
export function apiAppointmentAction(
  token: string,
  appointmentId: string,
  action: "confirm" | "reject" | "attend",
  idempotencyKey: string,
) {
  return apiFetch<ApiAppointmentItem>(`${BASE}/appointments/${id(appointmentId)}/${action}/`, {
    method: "POST",
    body: {},
    token,
    idempotencyKey,
  });
}

export function apiCreateAppointment(
  token: string,
  body: ApiAppointmentCreate,
  idempotencyKey: string,
) {
  return apiFetch<ApiAppointmentItem>(`${BASE}/appointments/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}

export function apiRescheduleAppointment(
  token: string,
  appointmentId: string,
  body: ApiAppointmentReschedule,
  idempotencyKey: string,
) {
  return apiFetch<ApiAppointmentItem>(`${BASE}/appointments/${id(appointmentId)}/reschedule/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}

export function apiCancelAppointment(
  token: string,
  appointmentId: string,
  body: ApiAppointmentCancel,
  idempotencyKey: string,
) {
  return apiFetch<ApiAppointmentItem>(`${BASE}/appointments/${id(appointmentId)}/cancel/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}

/* --- Notifications and templates --- */

export function apiListNotifications(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedNotifications>(`${BASE}/notifications/`, params, token);
}

export function apiNotificationMeta(token: string) {
  return cachedGet<ApiNotificationMeta>(`${BASE}/notifications/meta/`, undefined, token);
}

/** Multipart with dotted keys; `Idempotency-Key` required (§2.8). */
export function apiCreateNotification(token: string, formData: FormData, idempotencyKey: string) {
  return apiFetch<ApiNotificationRecord>(`${BASE}/notifications/`, {
    method: "POST",
    formData,
    token,
    idempotencyKey,
    // A send without `scheduled_at` runs the (fake) FCM batch inside the request.
    timeoutMs: 30_000,
  });
}

/**
 * Cancels a `scheduled` campaign (M3, §2.8): empty body, `Idempotency-Key`
 * optional (always sent). 200 with the cancelled record (also when it was
 * cancelled already); 409 `conflict` once the send started; 404 unknown id.
 */
export function apiCancelNotification(
  token: string,
  notificationId: string,
  idempotencyKey: string,
) {
  return apiFetch<ApiNotificationRecord>(`${BASE}/notifications/${id(notificationId)}/cancel/`, {
    method: "POST",
    body: {},
    token,
    idempotencyKey,
  });
}

export function apiUpdateTemplate(
  token: string,
  status: ApiTemplateStatus,
  body: ApiTemplateUpdate,
  idempotencyKey: string,
) {
  return apiFetch<ApiStatusTemplate>(`${BASE}/notification-templates/${id(status)}/`, {
    method: "PUT",
    body,
    token,
    idempotencyKey,
  });
}

/* --- Segments --- */

export function apiListSegments(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedSegments>(`${BASE}/segments/`, params, token);
}

export function apiGetSegment(token: string, segmentId: string) {
  return cachedGet<ApiSegment>(`${BASE}/segments/${id(segmentId)}/`, undefined, token);
}

export function apiSegmentMembers(
  token: string,
  segmentId: string,
  params: Record<string, QueryValue>,
) {
  return cachedGet<ApiPaginatedCustomers>(
    `${BASE}/segments/${id(segmentId)}/members/`,
    params,
    token,
  );
}

export function apiCreateSegment(token: string, body: ApiSegmentWrite, idempotencyKey: string) {
  return apiFetch<ApiSegment>(`${BASE}/segments/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}

export function apiPatchSegment(
  token: string,
  segmentId: string,
  body: ApiSegmentPatch,
  idempotencyKey: string,
) {
  return apiFetch<ApiSegment>(`${BASE}/segments/${id(segmentId)}/`, {
    method: "PATCH",
    body,
    token,
    idempotencyKey,
  });
}

export function apiDeleteSegment(token: string, segmentId: string) {
  return apiFetch<undefined>(`${BASE}/segments/${id(segmentId)}/`, { method: "DELETE", token });
}

/** `customer_ids` and/or E.164 `phones` (each ≤ 500); the members added are their union (§2.8). */
export function apiAddSegmentMembers(
  token: string,
  segmentId: string,
  body: ApiSegmentMembersInput,
  idempotencyKey: string,
) {
  return apiFetch<ApiSegment>(`${BASE}/segments/${id(segmentId)}/members/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}

export function apiRemoveSegmentMember(token: string, segmentId: string, customerId: string) {
  return apiFetch<undefined>(`${BASE}/segments/${id(segmentId)}/members/${id(customerId)}/`, {
    method: "DELETE",
    token,
  });
}

/* --- Settings, audit log, nav counts, password --- */

export function apiGetSettings(token: string) {
  return cachedGet<ApiSettings>(`${BASE}/settings/`, undefined, token);
}

export function apiPatchSettings(token: string, body: ApiSettingsPatch, idempotencyKey: string) {
  return apiFetch<ApiSettings>(`${BASE}/settings/`, {
    method: "PATCH",
    body,
    token,
    idempotencyKey,
  });
}

/** Publishes the terms / privacy drafts as a new version (§2.11): empty body, key required. */
export function apiPublishTerms(token: string, idempotencyKey: string) {
  return apiFetch<ApiSettings>(`${BASE}/settings/terms/publish/`, {
    method: "POST",
    body: {},
    token,
    idempotencyKey,
  });
}

export function apiListAuditLog(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedAuditLog>(`${BASE}/audit-log/`, params, token);
}

export function apiNavCounts(token: string) {
  return cachedGet<ApiNavCounts>(`${BASE}/nav-counts/`, undefined, token);
}

/** → 204; revokes the staff member's other sessions (§2.1). `auth/*` ignores idempotency keys. */
export function apiChangePassword(token: string, body: ChangePasswordRequest) {
  return apiFetch<undefined>(`${BASE}/auth/change-password/`, { method: "POST", body, token });
}

/**
 * Streams `GET <list>/?export=csv|xlsx` for any exportable list path
 * (`products/`, `segments/{id}/members/`, `audit-log/`, …). The 60 s deadline
 * covers the answer's headers only, so a large file is never cut off mid-transfer;
 * `signal` (the browser request's) cancels the upstream transfer when the
 * download is abandoned.
 */
export function apiExportPath(
  token: string,
  path: string,
  params: Record<string, QueryValue>,
  signal?: AbortSignal,
): Promise<Response> {
  return apiFetchRaw(`${BASE}/${path}`, {
    query: params,
    token,
    headers: { Accept: "*/*" },
    timeoutMs: 60_000,
    streamBody: true,
    signal,
  });
}
