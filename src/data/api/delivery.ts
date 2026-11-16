import "server-only";

import { apiFetch, cachedGet, type QueryValue } from "./client";
import type {
  ApiDeliveryIssue,
  ApiNavCounts,
  ApiOpenIssue,
  ApiPaginatedDeliveryIssues,
  ApiResolveIssue,
  ApiSuspension,
  ApiSuspensionBody,
} from "./types";

/**
 * Typed calls to the Yandex Delivery admin endpoints of phase 2 (plan §3.9,
 * INTERFACES-ops): the exception queue, the staff incident, the
 * courier-dispatch switch, and the uncached reads of the 30 s shell poll.
 * Reads of a page render go through `cachedGet`; the poll and every write go
 * through `apiFetch`. Every function throws `ApiError` for a non-2xx answer.
 */

const BASE = "/api/v1/admin";
const id = (value: number) => encodeURIComponent(String(value));

/** `GET delivery/issues/?state=&urgent=&kind=&order=&page=&page_size=20|50` */
export function apiListDeliveryIssues(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedDeliveryIssues>(`${BASE}/delivery/issues/`, params, token);
}

/** Uncached: the shell's 30 s poll of the open urgent issues. */
export function apiListDeliveryIssuesFresh(token: string, params: Record<string, QueryValue>) {
  return apiFetch<ApiPaginatedDeliveryIssues>(`${BASE}/delivery/issues/`, {
    query: params,
    token,
  });
}

/** Uncached `nav-counts/` for the poll (the sidebar's `cachedGet` read is per render). */
export function apiNavCountsFresh(token: string) {
  return apiFetch<ApiNavCounts>(`${BASE}/nav-counts/`, { token });
}

/** **I** — 200 `DeliveryIssue`; 404 unknown, 409 `conflict` already resolved, 400 on `note`. */
export function apiResolveIssue(
  token: string,
  issueId: number,
  body: ApiResolveIssue,
  idempotencyKey: string,
) {
  return apiFetch<ApiDeliveryIssue>(`${BASE}/delivery/issues/${id(issueId)}/resolve/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}

/**
 * **I** — 201 a new incident, 200 the open one refreshed (note, urgency);
 * 404 unknown order, 409 `conflict` for a pickup order, 400 on `note` /
 * `kind`. The Order row is locked first, so a busy order may take a moment.
 */
export function apiOpenIncident(
  token: string,
  orderId: number,
  body: ApiOpenIssue,
  idempotencyKey: string,
) {
  return apiFetch<ApiDeliveryIssue>(`${BASE}/orders/${id(orderId)}/issues/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
    timeoutMs: 20_000,
  });
}

/** `GET delivery/suspension/` (cached per render). */
export function apiGetSuspension(token: string) {
  return cachedGet<ApiSuspension>(`${BASE}/delivery/suspension/`, undefined, token);
}

/** **I** — `{suspended, until?, note}`; 400 `in_past` on `until`, `max_length` on `note`. */
export function apiSetSuspension(token: string, body: ApiSuspensionBody, idempotencyKey: string) {
  return apiFetch<ApiSuspension>(`${BASE}/delivery/suspension/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}
