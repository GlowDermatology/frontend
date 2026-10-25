import "server-only";

import { headers } from "next/headers";

import { serverEnv } from "@/lib/env.server";

import { ApiError } from "./errors";

export type QueryValue = string | number | boolean | undefined | null;

export interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Query parameters; `undefined`, `null` and `""` are skipped, booleans become `true`/`false`. */
  query?: Record<string, QueryValue>;
  /** JSON body; mutually exclusive with `formData`. */
  body?: unknown;
  formData?: FormData;
  /** Staff access JWT. Omit on the public auth routes. */
  token?: string | null;
  /** Sent as `Idempotency-Key` (contract §1.7). */
  idempotencyKey?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface ApiResponse<T> {
  status: number;
  data: T;
  headers: Headers;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

/**
 * End-user IP as seen by the edge proxy, forwarded to Django as
 * `X-GD-Client-IP` (honoured there only together with the internal secret).
 * The edge overwrites `X-Forwarded-For`, so its first hop is the client.
 */
export async function clientIp(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return requestHeaders.get("x-real-ip") ?? undefined;
}

/**
 * Server-to-server call to the Django API. Throws `ApiError` for every non-2xx
 * answer and for transport failures (status 0); callers map those to
 * `ActionResult` or `null` as the contract prescribes.
 */
export async function apiFetch<T>(path: string, request: ApiRequest = {}): Promise<ApiResponse<T>> {
  const url = `${serverEnv.apiUrl()}${path}${buildQuery(request.query)}`;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Accept", "application/json");
  requestHeaders.set("Accept-Language", "uz");
  requestHeaders.set("X-GD-Internal-Secret", serverEnv.internalSecret());
  requestHeaders.set("X-Request-ID", crypto.randomUUID());
  const ip = await clientIp();
  if (ip) requestHeaders.set("X-GD-Client-IP", ip);
  if (request.token) requestHeaders.set("Authorization", `Bearer ${request.token}`);
  if (request.idempotencyKey) requestHeaders.set("Idempotency-Key", request.idempotencyKey);

  let body: BodyInit | undefined;
  if (request.formData) {
    body = request.formData;
  } else if (request.body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
    body = JSON.stringify(request.body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: request.method ?? "GET",
      headers: requestHeaders,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(request.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new ApiError(
      0,
      {
        code: "network_error",
        message: "API bilan bog‘lanib bo‘lmadi.",
        errors: [],
        request_id: "",
      },
      { cause },
    );
  }
  if (!response.ok) throw await ApiError.fromResponse(response);
  const data = response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  return { status: response.status, data, headers: response.headers };
}
