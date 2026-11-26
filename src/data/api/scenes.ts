import "server-only";

import { apiFetch } from "./client";
import type {
  ApiSceneAccept,
  ApiSceneAcceptResult,
  ApiSceneJob,
  ApiSceneJobCreate,
  ApiSceneStatus,
  ApiSceneTemplates,
} from "./types";

/**
 * The product scene endpoints (admin contract §2.20, backend f39170f). None is cached: the
 * status follows the ops console's switch, and the poller wants a fresh job on every call. The
 * writes take an optional Idempotency-Key; the editor sends one per dialog.
 */

const BASE = "/api/v1/admin";

export function apiSceneStatus(token: string) {
  return apiFetch<ApiSceneStatus>(`${BASE}/scenes/status/`, { token });
}

export function apiSceneTemplates(token: string) {
  return apiFetch<ApiSceneTemplates>(`${BASE}/scenes/templates/`, { token });
}

/** 202 a new job, 200 the image's queued or running job (which may be of another kind). */
export function apiStartSceneJob(
  token: string,
  productId: string,
  imageId: string,
  body: ApiSceneJobCreate,
  idempotencyKey: string,
) {
  return apiFetch<ApiSceneJob>(
    `${BASE}/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}/scenes/`,
    { method: "POST", body, token, idempotencyKey },
  );
}

export function apiGetSceneJob(token: string, id: string) {
  return apiFetch<ApiSceneJob>(`${BASE}/scenes/jobs/${encodeURIComponent(id)}/`, { token });
}

/** A scene → a new gallery image; a `fit` → the source image with its renditions. */
export function apiAcceptSceneJob(
  token: string,
  id: string,
  body: ApiSceneAccept,
  idempotencyKey: string,
) {
  return apiFetch<ApiSceneAcceptResult>(`${BASE}/scenes/jobs/${encodeURIComponent(id)}/accept/`, {
    method: "POST",
    body,
    token,
    idempotencyKey,
  });
}

export function apiDiscardSceneJob(token: string, id: string, idempotencyKey: string) {
  return apiFetch<ApiSceneJob>(`${BASE}/scenes/jobs/${encodeURIComponent(id)}/discard/`, {
    method: "POST",
    body: {},
    token,
    idempotencyKey,
  });
}
