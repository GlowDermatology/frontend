import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

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

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const HEX_GROUP = /^[0-9a-f]{1,4}$/i;

function isIpv6(value: string): boolean {
  if (value.length > 45 || !/^[0-9a-f:.]+$/i.test(value)) return false;
  const halves = value.split("::");
  if (halves.length > 2) return false;
  const groups = halves.flatMap((half) => (half === "" ? [] : half.split(":")));
  let count = 0;
  for (const [index, group] of groups.entries()) {
    if (index === groups.length - 1 && group.includes(".")) {
      // Embedded IPv4 tail (`::ffff:203.0.113.7`) counts as two groups.
      if (!IPV4.test(group)) return false;
      count += 2;
    } else {
      if (!HEX_GROUP.test(group)) return false;
      count += 1;
    }
  }
  return halves.length === 2 ? count <= 7 : count === 8;
}

/** Whether a string is a bare IPv4 or IPv6 literal (no port, brackets or zone id). */
export function isIpLiteral(value: string): boolean {
  return IPV4.test(value) || isIpv6(value);
}

/**
 * End-user IP as seen by the edge proxy, forwarded to Django as
 * `X-GD-Client-IP` (honoured there only together with the internal secret, and
 * used for the per-client-IP throttles and `AuditEntry.ip`).
 *
 * Deployment assumption (spec "Edge contract"): the Next server is reachable
 * only through a single trusted edge that appends or overwrites
 * `X-Forwarded-For`. In both cases the RIGHTMOST hop is the one that edge
 * wrote from the TCP peer; every hop to its left came from the browser and
 * can be forged, so it is ignored. The hop must be a bare IP literal,
 * otherwise `X-Real-IP` (also edge-written) is tried, then nothing is sent and
 * Django falls back to its own `TRUSTED_PROXIES` resolution.
 */
export async function clientIp(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  if (last && isIpLiteral(last)) return last;
  const real = requestHeaders.get("x-real-ip")?.trim();
  if (real && isIpLiteral(real)) return real;
  return undefined;
}

function isTimeout(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "name" in cause &&
    (cause.name === "TimeoutError" || cause.name === "AbortError")
  );
}

/**
 * Server-to-server call to the Django API (contract §1). Throws `ApiError`
 * for every non-2xx answer and for transport failures (status 0, code
 * `timeout` or `network_error`); callers map those to `ActionResult` or
 * `null` as the contract prescribes. 204 resolves with `data: undefined`.
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
    // Let fetch set the multipart boundary.
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
        code: isTimeout(cause) ? "timeout" : "network_error",
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

const cachedGetByKey = cache(
  <T>(
    path: string,
    queryString: string,
    token: string | null | undefined,
  ): Promise<ApiResponse<T>> => apiFetch<T>(`${path}${queryString}`, { token }),
);

/**
 * `GET` deduplicated per server render with React `cache()`: the same
 * request from `generateMetadata` and the page body (or from two components)
 * hits Django once. The query is serialised so equal queries share the entry
 * regardless of object identity. Reads only; mutations go through `apiFetch`.
 */
export function cachedGet<T>(
  path: string,
  query?: Record<string, QueryValue>,
  token?: string | null,
): Promise<ApiResponse<T>> {
  return cachedGetByKey<T>(path, buildQuery(query), token ?? null);
}
