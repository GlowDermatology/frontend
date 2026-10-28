import "server-only";

import { cookies, headers } from "next/headers";

import { customerCookieNames } from "@/data/customer-auth/cookie-names";
import { isValidDeviceId, isValidDeviceKey } from "@/data/customer-auth/cookies";
import type { Locale } from "@/lib/i18n/locales";
import { serverEnv } from "@/lib/env.server";

import { buildQuery, clientIpFrom, type QueryValue } from "../client";
import { ApiError } from "../errors";

/**
 * The storefront's server-to-server client for the customer API (customer
 * contract §1). The customer API has no CORS and no cookies: only this
 * server calls it, as a BFF, exactly like the admin client
 * (`src/data/api/client.ts`) but with the customer audience's headers.
 *
 * Two entry points:
 *
 * - `publicGet` — anonymous reads of the **O** routes (catalog, banners,
 *   categories, specialists, services, `settings/public/`). It touches no
 *   request API (`headers()`, `cookies()`), so it runs inside `"use cache"`
 *   scopes and one answer serves every visitor of that language. No device
 *   headers, no bearer: the API answers them `public, max-age` (§1.3).
 * - `customerFetch` — request-bound calls: forwards the visitor's IP
 *   (`X-GD-Client-IP`) and browser user agent (`X-GD-Client-UA`, for the
 *   session list's "Chrome (Windows)" label), and — when asked — the device
 *   headers (`X-GD-Platform: web`, `X-GD-Device-Id` from the HttpOnly
 *   `gd_dev_id` cookie, `X-GD-Device-Key` on sign-in) and the customer's
 *   bearer from `gd_cust_access`. Used for searches (so the API throttles
 *   per visitor, not per this server) and by W3b for every signed-in call.
 *
 * Both send `X-GD-Internal-Secret`, which is what makes Django trust
 * `X-GD-Client-IP` (and the client UA) from this server.
 */

/** `X-GD-Platform` of the website (backend B-W1 adds `web` to `OrderChannel`). */
export const WEB_PLATFORM = "web";
/** Bound on the forwarded user agent (the API stores a label, not the raw string). */
const MAX_UA_LENGTH = 512;
const DEFAULT_TIMEOUT_MS = 8_000;

export interface CustomerDevice {
  id: string;
  /** `X-GD-Device-Key`: only on `auth/login/` (§1.2). */
  key?: string;
}

export interface CustomerHeaderInput {
  secret: string;
  locale: Locale;
  clientIp?: string;
  userAgent?: string | null;
  device?: CustomerDevice;
  accessToken?: string | null;
  idempotencyKey?: string;
  json?: boolean;
}

/** Strips control characters and bounds the length of a forwarded user agent. */
export function sanitizeUserAgent(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/[^\x20-\x7e]/g, "")
    .trim()
    .slice(0, MAX_UA_LENGTH);
  return cleaned.length > 0 ? cleaned : undefined;
}

/** The request headers of one customer API call (pure; unit-tested). */
export function buildCustomerHeaders(input: CustomerHeaderInput): Headers {
  const result = new Headers();
  result.set("Accept", "application/json");
  result.set("Accept-Language", input.locale);
  result.set("X-GD-Internal-Secret", input.secret);
  if (input.clientIp) result.set("X-GD-Client-IP", input.clientIp);
  const ua = sanitizeUserAgent(input.userAgent);
  if (ua) result.set("X-GD-Client-UA", ua);
  if (input.device && isValidDeviceId(input.device.id)) {
    result.set("X-GD-Platform", WEB_PLATFORM);
    result.set("X-GD-Device-Id", input.device.id);
    if (input.device.key && isValidDeviceKey(input.device.key)) {
      result.set("X-GD-Device-Key", input.device.key);
    }
  }
  if (input.accessToken) result.set("Authorization", `Bearer ${input.accessToken}`);
  if (input.idempotencyKey) result.set("Idempotency-Key", input.idempotencyKey);
  if (input.json) result.set("Content-Type", "application/json");
  return result;
}

function isTimeout(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "name" in cause &&
    (cause.name === "TimeoutError" || cause.name === "AbortError")
  );
}

function transportError(cause: unknown): ApiError {
  return new ApiError(
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

export interface CustomerResponse<T> {
  status: number;
  data: T;
  headers: Headers;
}

async function send<T>(
  url: string,
  init: { method: string; headers: Headers; body?: string; timeoutMs?: number },
): Promise<CustomerResponse<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(init.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (cause) {
    throw transportError(cause);
  }
  if (!response.ok) throw await ApiError.fromResponse(response);
  if (response.status === 204) {
    return { status: 204, data: undefined as T, headers: response.headers };
  }
  try {
    return {
      status: response.status,
      data: (await response.json()) as T,
      headers: response.headers,
    };
  } catch (cause) {
    throw new ApiError(
      response.status,
      {
        code: "invalid_json",
        message: "Kutilmagan xato.",
        errors: [],
        request_id: response.headers.get("x-request-id") ?? "",
      },
      { cause },
    );
  }
}

/**
 * Anonymous `GET` of a public (**O**) route in one language. Safe inside
 * `"use cache"`: it reads no request data, so callers cache the answer per
 * argument (path, language, query). Throws `ApiError` like `apiFetch`.
 */
export function publicGet<T>(
  path: string,
  locale: Locale,
  query?: Record<string, QueryValue>,
): Promise<CustomerResponse<T>> {
  const url = `${serverEnv.apiUrl()}${path}${buildQuery(query)}`;
  return send<T>(url, {
    method: "GET",
    headers: buildCustomerHeaders({ secret: serverEnv.internalSecret(), locale }),
  });
}

export interface CustomerRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  locale: Locale;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /**
   * `none`: anonymous, no device headers (public reads made per request);
   * `device`: device headers, no bearer (`auth/*`);
   * `session`: device headers and the bearer from `gd_cust_access` (**C** routes).
   */
  auth?: "none" | "device" | "session";
  /** Send `X-GD-Device-Key` from `gd_dev_key` (only `auth/login/`, §1.2). */
  withDeviceKey?: boolean;
  /** Overrides the access cookie (the refresh route retries with the new token). */
  accessToken?: string;
  idempotencyKey?: string;
  timeoutMs?: number;
}

/**
 * Request-bound customer API call (route handlers, Server Actions, dynamic
 * Server Components). Reads the incoming request's headers and cookies, so
 * it must never run inside `"use cache"`. Throws `ApiError`.
 */
export async function customerFetch<T>(
  path: string,
  request: CustomerRequest,
): Promise<CustomerResponse<T>> {
  const incoming = await headers();
  const auth = request.auth ?? "none";
  let device: CustomerDevice | undefined;
  let accessToken: string | undefined;
  if (auth !== "none") {
    const jar = await cookies();
    const names = customerCookieNames(serverEnv.cookieSecure());
    const id = jar.get(names.deviceId)?.value;
    if (id) {
      device = { id, key: request.withDeviceKey ? jar.get(names.deviceKey)?.value : undefined };
    }
    if (auth === "session") accessToken = request.accessToken ?? jar.get(names.access)?.value;
  }
  const url = `${serverEnv.apiUrl()}${path}${buildQuery(request.query)}`;
  return send<T>(url, {
    method: request.method ?? "GET",
    headers: buildCustomerHeaders({
      secret: serverEnv.internalSecret(),
      locale: request.locale,
      clientIp: clientIpFrom(incoming),
      userAgent: incoming.get("user-agent"),
      device,
      accessToken,
      idempotencyKey: request.idempotencyKey,
      json: request.body !== undefined,
    }),
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
    timeoutMs: request.timeoutMs,
  });
}

/**
 * The same call from a route handler, where the request object is at hand
 * (no `headers()`/`cookies()`; the refresh and logout routes).
 */
export function customerFetchFrom<T>(
  path: string,
  input: {
    method?: "GET" | "POST";
    locale: Locale;
    requestHeaders: Pick<Headers, "get">;
    device?: CustomerDevice;
    accessToken?: string;
    body?: unknown;
    timeoutMs?: number;
  },
): Promise<CustomerResponse<T>> {
  return send<T>(`${serverEnv.apiUrl()}${path}`, {
    method: input.method ?? "GET",
    headers: buildCustomerHeaders({
      secret: serverEnv.internalSecret(),
      locale: input.locale,
      clientIp: clientIpFrom(input.requestHeaders),
      userAgent: input.requestHeaders.get("user-agent"),
      device: input.device,
      accessToken: input.accessToken,
      json: input.body !== undefined,
    }),
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    timeoutMs: input.timeoutMs,
  });
}
