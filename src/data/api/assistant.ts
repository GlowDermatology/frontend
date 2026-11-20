import "server-only";

import { apiFetch } from "./client";
import type {
  ApiAssistantAccept,
  ApiAssistantAcceptResult,
  ApiAssistantJob,
  ApiAssistantJobCreate,
  ApiAssistantStart,
  ApiAssistantStatus,
} from "./types";

/**
 * The AI assistant endpoints (admin contract §2.19). None is cached: the status follows the ops
 * console's switch, and the poller wants a fresh job on every call.
 */

const BASE = "/api/v1/admin";

export function apiAssistantStatus(token: string) {
  return apiFetch<ApiAssistantStatus>(`${BASE}/assistant/status/`, { token });
}

/** 202 a new job, 200 the active one (or `nothing_to_fill`). Keyed (contract §1.7). */
export function apiStartAssistantJob(
  token: string,
  productId: string,
  body: ApiAssistantJobCreate,
  idempotencyKey: string,
) {
  return apiFetch<ApiAssistantStart>(
    `${BASE}/products/${encodeURIComponent(productId)}/assistant/jobs/`,
    { method: "POST", body, token, idempotencyKey },
  );
}

export function apiGetAssistantJob(token: string, id: string) {
  return apiFetch<ApiAssistantJob>(`${BASE}/assistant/jobs/${encodeURIComponent(id)}/`, { token });
}

/**
 * Records which suggestions the editor put into its form (nothing is written to the product). Not
 * keyed: a repeat is refused with 409, which the editor ignores.
 */
export function apiAcceptAssistantJob(token: string, id: string, body: ApiAssistantAccept) {
  return apiFetch<ApiAssistantAcceptResult>(
    `${BASE}/assistant/jobs/${encodeURIComponent(id)}/accept/`,
    { method: "POST", body, token },
  );
}
