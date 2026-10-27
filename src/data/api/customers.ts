import "server-only";

import { apiFetch, cachedGet, type QueryValue } from "./client";
import type {
  ApiCashbackAdjustmentRequest,
  ApiCashbackAdjustmentResult,
  ApiCashbackPolicy,
  ApiCustomerCard,
  ApiPaginatedCustomers,
  ApiPaginatedStaff,
  ApiPolicyVersionCreate,
  ApiPolicyVersionCreated,
} from "./types";

/**
 * Typed calls to the customers, cashback policy and staff directory
 * endpoints (contract §2.6, §2.7, §2.16). Reads go through `cachedGet`
 * (deduplicated per render, so `generateMetadata` and the page share one
 * request), writes through `apiFetch` with the dialog's `Idempotency-Key`
 * (required on both writes, §1.7). Every function throws `ApiError` for a
 * non-2xx answer.
 */

const BASE = "/api/v1/admin";
const id = (value: string | number) => encodeURIComponent(String(value));

export function apiListCustomers(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedCustomers>(`${BASE}/customers/`, params, token);
}

export function apiGetCustomer(token: string, customerId: string) {
  return cachedGet<ApiCustomerCard>(`${BASE}/customers/${id(customerId)}/`, undefined, token);
}

/** → 201 `{entry, balance, available}`; 400 `insufficient_balance` on `amount`. */
export function apiAdjustCashback(
  token: string,
  customerId: string,
  body: ApiCashbackAdjustmentRequest,
  idempotencyKey: string,
) {
  return apiFetch<ApiCashbackAdjustmentResult>(
    `${BASE}/customers/${id(customerId)}/cashback-adjustments/`,
    { method: "POST", body, token, idempotencyKey },
  );
}

export function apiCashbackPolicy(token: string) {
  return cachedGet<ApiCashbackPolicy>(`${BASE}/cashback/policy/`, undefined, token);
}

/** Uncached: the save action re-reads the versions after a write (a render's cache would be stale). */
export function apiCashbackPolicyFresh(token: string) {
  return apiFetch<ApiCashbackPolicy>(`${BASE}/cashback/policy/`, { token });
}

/** → 201 `{version, superseded_version, warnings}`. */
export function apiCreatePolicyVersion(
  token: string,
  body: ApiPolicyVersionCreate,
  idempotencyKey: string,
) {
  return apiFetch<ApiPolicyVersionCreated>(`${BASE}/cashback/policy-versions/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}

/** The audit-log actor options (`is_active` defaults to `true` on the server). */
export function apiListStaff(token: string, params: Record<string, QueryValue>) {
  return cachedGet<ApiPaginatedStaff>(`${BASE}/staff/`, params, token);
}
