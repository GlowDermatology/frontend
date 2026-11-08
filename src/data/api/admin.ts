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
  ApiApproveRequest,
  ApiCampaignTestRequest,
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
  ApiPaginatedStaff,
  ApiStaffCreate,
  ApiStaffCredentials,
  ApiStaffMember,
  ApiStaffPatch,
  ApiStatusTemplate,
  ApiTemplateStatus,
  ApiTemplateUpdate,
  ApiTestDevice,
  ApiTestDeviceCreate,
  ChangePasswordRequest,
} from "./types";

/**
 * Typed calls to the M1d shell endpoints (contract §2.8–§2.10, §2.13):
 * appointments, notifications and their templates, segments, the audit log,
 * the nav counts and the password change (the store settings moved to the
 * ops console, so there is no admin `settings/` endpoint). Reads go through
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

/**
 * `POST notifications/`: multipart with dotted keys, `Idempotency-Key`
 * required (§2.8). The campaign is saved as a `draft`; nothing is sent until
 * a superuser tests and approves it.
 */
export function apiCreateNotification(token: string, formData: FormData, idempotencyKey: string) {
  return apiFetch<ApiNotificationRecord>(`${BASE}/notifications/`, {
    method: "POST",
    formData,
    token,
    idempotencyKey,
  });
}

/** `GET notifications/{id}/`: the record with its tests (uncached: the panel re-reads it). */
export function apiGetNotification(token: string, notificationId: string) {
  return apiFetch<ApiNotificationRecord>(`${BASE}/notifications/${id(notificationId)}/`, {
    token,
  });
}

/**
 * `PATCH notifications/{id}/`: multipart, every field optional plus
 * `expected_revision` (409 `conflict` when stale) and `remove_image`; the
 * author or a superuser, on a `draft` or `tested` campaign (409
 * `invalid_transition` otherwise).
 */
export function apiUpdateNotification(
  token: string,
  notificationId: string,
  formData: FormData,
  idempotencyKey: string,
) {
  return apiFetch<ApiNotificationRecord>(`${BASE}/notifications/${id(notificationId)}/`, {
    method: "PATCH",
    formData,
    token,
    idempotencyKey,
  });
}

/** `DELETE notifications/{id}/` → 204; `draft` or `tested` only. */
export function apiDeleteNotification(token: string, notificationId: string) {
  return apiFetch<undefined>(`${BASE}/notifications/${id(notificationId)}/`, {
    method: "DELETE",
    token,
  });
}

/** One of the superuser transitions of a campaign; empty or small JSON body, `Idempotency-Key` always sent. */
function campaignOperation(
  token: string,
  notificationId: string,
  operation: string,
  idempotencyKey: string,
  body: unknown = {},
  timeoutMs?: number,
) {
  return apiFetch<ApiNotificationRecord>(
    `${BASE}/notifications/${id(notificationId)}/${operation}/`,
    { method: "POST", body, token, idempotencyKey, timeoutMs },
  );
}

/** `POST notifications/{id}/test/` `{device_ids}` (1–10): FCM is called inside the request. */
export function apiSendCampaignTest(
  token: string,
  notificationId: string,
  body: ApiCampaignTestRequest,
  idempotencyKey: string,
) {
  return campaignOperation(token, notificationId, "test", idempotencyKey, body, 30_000);
}

/** `POST notifications/{id}/tests/{test_id}/confirm/` → the record (`tested`). */
export function apiConfirmCampaignTest(
  token: string,
  notificationId: string,
  testId: string,
  idempotencyKey: string,
) {
  return campaignOperation(token, notificationId, `tests/${id(testId)}/confirm`, idempotencyKey);
}

/** `POST notifications/{id}/approve/` `{expected_revision}` → the record (`scheduled`, `dispatch_after`). */
export function apiApproveNotification(
  token: string,
  notificationId: string,
  body: ApiApproveRequest,
  idempotencyKey: string,
) {
  return campaignOperation(token, notificationId, "approve", idempotencyKey, body);
}

/** `POST notifications/{id}/return-to-draft/` → the record (`draft`). */
export function apiReturnNotificationToDraft(
  token: string,
  notificationId: string,
  idempotencyKey: string,
) {
  return campaignOperation(token, notificationId, "return-to-draft", idempotencyKey);
}

/**
 * Cancels a `scheduled` campaign (M3, §2.8; superusers since the approval
 * workflow): empty body, `Idempotency-Key` optional (always sent). 200 with
 * the cancelled record (also when it was cancelled already); 409 `conflict`
 * once the send started; 404 unknown id.
 */
export function apiCancelNotification(
  token: string,
  notificationId: string,
  idempotencyKey: string,
) {
  return campaignOperation(token, notificationId, "cancel", idempotencyKey);
}

/** `POST notifications/{id}/stop/` → the record (`stopping`); the next batch finalises it. */
export function apiStopNotification(token: string, notificationId: string, idempotencyKey: string) {
  return campaignOperation(token, notificationId, "stop", idempotencyKey);
}

/* --- Test devices (superusers) --- */

export function apiListTestDevices(token: string) {
  return cachedGet<ApiTestDevice[]>(`${BASE}/notifications/test-devices/`, undefined, token);
}

/** `POST notifications/test-devices/` `{phone, label}` → the device (400 on the phone: `customer_not_found`, `device_not_pushable`, `unique`). */
export function apiRegisterTestDevice(
  token: string,
  body: ApiTestDeviceCreate,
  idempotencyKey: string,
) {
  return apiFetch<ApiTestDevice>(`${BASE}/notifications/test-devices/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}

/** `DELETE notifications/test-devices/{id}/` → 204 (soft, idempotent). */
export function apiRemoveTestDevice(token: string, deviceId: string) {
  return apiFetch<undefined>(`${BASE}/notifications/test-devices/${id(deviceId)}/`, {
    method: "DELETE",
    token,
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

/* --- Audit log, nav counts, password --- */

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

/* --- Staff management (contract §2.16; every route but the list is manager-only) --- */

/** The staff screen's page: uncached-by-key reads share `cachedGet` like the other lists. */
export function apiStaffPage(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedStaff>(`${BASE}/staff/`, params, token);
}

/** `Idempotency-Key` required; 201 with the temporary password, shown once. */
export function apiCreateStaff(token: string, body: ApiStaffCreate, idempotencyKey: string) {
  return apiFetch<ApiStaffCredentials>(`${BASE}/staff/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}

export function apiPatchStaff(
  token: string,
  staffId: string,
  body: ApiStaffPatch,
  idempotencyKey: string,
) {
  return apiFetch<ApiStaffMember>(`${BASE}/staff/${id(staffId)}/`, {
    method: "PATCH",
    body,
    token,
    idempotencyKey,
  });
}

/** `deactivate` and `reset-password` require the key; `reactivate` honours it. */
export function apiStaffAction(
  token: string,
  staffId: string,
  action: "deactivate" | "reactivate",
  idempotencyKey: string,
) {
  return apiFetch<ApiStaffMember>(`${BASE}/staff/${id(staffId)}/${action}/`, {
    method: "POST",
    body: {},
    token,
    idempotencyKey,
  });
}

export function apiResetStaffPassword(token: string, staffId: string, idempotencyKey: string) {
  return apiFetch<ApiStaffCredentials>(`${BASE}/staff/${id(staffId)}/reset-password/`, {
    method: "POST",
    body: {},
    token,
    idempotencyKey,
  });
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
