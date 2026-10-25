import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestHeaders = new Headers();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => requestHeaders),
}));

import { apiFetch, buildQuery, cachedGet, isIpLiteral } from "./client";
import { ApiError, parseRetryAfter } from "./errors";

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function lastRequest(fetchMock: FetchMock): { url: string; init: RequestInit; headers: Headers } {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");
  const [url, init] = call;
  return { url: String(url), init: init ?? {}, headers: new Headers(init?.headers) };
}

describe("apiFetch", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    process.env.GLOWDERMA_API_URL = "http://api.test:8000/";
    process.env.GLOWDERMA_INTERNAL_SECRET = "s3cret";
    requestHeaders.delete("x-forwarded-for");
    requestHeaders.delete("x-real-ip");
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends exactly the contract headers on a bare GET", async () => {
    requestHeaders.set("x-forwarded-for", "1.2.3.4, 203.0.113.7");
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    const result = await apiFetch<{ ok: boolean }>("/api/v1/admin/auth/me/");

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ ok: true });
    const { url, init, headers } = lastRequest(fetchMock);
    expect(url).toBe("http://api.test:8000/api/v1/admin/auth/me/");
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect(init.body).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("accept-language")).toBe("uz");
    expect(headers.get("x-gd-internal-secret")).toBe("s3cret");
    expect(headers.get("x-gd-client-ip")).toBe("203.0.113.7");
    expect(headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers.has("authorization")).toBe(false);
    expect(headers.has("idempotency-key")).toBe(false);
    expect(headers.has("content-type")).toBe(false);
    expect([...headers.keys()].sort()).toEqual([
      "accept",
      "accept-language",
      "x-gd-client-ip",
      "x-gd-internal-secret",
      "x-request-id",
    ]);
  });

  it("falls back to x-real-ip and omits the IP header when neither is present", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({}));
    await apiFetch("/x/");
    expect(lastRequest(fetchMock).headers.has("x-gd-client-ip")).toBe(false);

    requestHeaders.set("x-real-ip", "198.51.100.2");
    await apiFetch("/x/");
    expect(lastRequest(fetchMock).headers.get("x-gd-client-ip")).toBe("198.51.100.2");
  });

  it("ignores forged left-hand X-Forwarded-For hops and keeps the edge-written one", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({}));

    requestHeaders.set("x-forwarded-for", "1.2.3.4, 203.0.113.7");
    await apiFetch("/x/");
    expect(lastRequest(fetchMock).headers.get("x-gd-client-ip")).toBe("203.0.113.7");

    requestHeaders.set("x-forwarded-for", "9.9.9.9,8.8.8.8 , 2001:db8::1 ");
    await apiFetch("/x/");
    expect(lastRequest(fetchMock).headers.get("x-gd-client-ip")).toBe("2001:db8::1");

    requestHeaders.set("x-forwarded-for", "203.0.113.7");
    await apiFetch("/x/");
    expect(lastRequest(fetchMock).headers.get("x-gd-client-ip")).toBe("203.0.113.7");
  });

  it("drops a rightmost hop that is not an IP literal and falls back to x-real-ip", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({}));

    requestHeaders.set("x-forwarded-for", "203.0.113.7, unknown");
    await apiFetch("/x/");
    expect(lastRequest(fetchMock).headers.has("x-gd-client-ip")).toBe(false);

    requestHeaders.set("x-forwarded-for", "203.0.113.7:8443");
    requestHeaders.set("x-real-ip", "198.51.100.2");
    await apiFetch("/x/");
    expect(lastRequest(fetchMock).headers.get("x-gd-client-ip")).toBe("198.51.100.2");

    requestHeaders.set("x-real-ip", "not-an-ip; drop table");
    await apiFetch("/x/");
    expect(lastRequest(fetchMock).headers.has("x-gd-client-ip")).toBe(false);
  });

  it("adds bearer, idempotency key, JSON content type and the query string", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await apiFetch("/api/v1/admin/orders/10248/cancel/", {
      method: "POST",
      token: "jwt-token",
      idempotencyKey: "6f1c2a0e-9b8d-4c37-8a5e-000000000001",
      body: { reason: "admin" },
      query: { page: 2, promo: true, q: "", skip: undefined, none: null, status: "paid" },
    });

    const { url, init, headers } = lastRequest(fetchMock);
    expect(url).toBe(
      "http://api.test:8000/api/v1/admin/orders/10248/cancel/?page=2&promo=true&status=paid",
    );
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"reason":"admin"}');
    expect(headers.get("authorization")).toBe("Bearer jwt-token");
    expect(headers.get("idempotency-key")).toBe("6f1c2a0e-9b8d-4c37-8a5e-000000000001");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("sends FormData as-is without a Content-Type (fetch sets the boundary)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 201 }));
    const formData = new FormData();
    formData.set("title", "Aksiya");

    await apiFetch("/api/v1/admin/notifications/", { method: "POST", formData });

    const { init, headers } = lastRequest(fetchMock);
    expect(init.body).toBe(formData);
    expect(headers.has("content-type")).toBe(false);
  });

  it("resolves 204 with undefined data", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const result = await apiFetch<undefined>("/api/v1/admin/auth/logout/", { method: "POST" });
    expect(result.status).toBe(204);
    expect(result.data).toBeUndefined();
  });

  it("maps a timeout to ApiError status 0 / code timeout", async () => {
    fetchMock.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"));
    const error = await apiFetch("/x/").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(0);
    expect(apiError.code).toBe("timeout");
    expect(apiError.body.message).toBe("API bilan bog‘lanib bo‘lmadi.");
    expect(apiError.cause).toBeInstanceOf(DOMException);
  });

  it("maps a connection failure to ApiError status 0 / code network_error", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const error = await apiFetch("/x/").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).code).toBe("network_error");
  });

  it("keeps the Django envelope and Retry-After on an error response", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          code: "throttled",
          message: "Juda ko‘p urinish. 30 soniyadan so‘ng qayta urinib ko‘ring.",
          errors: [],
          request_id: "req-1",
        },
        { status: 429, headers: { "retry-after": "30", "x-request-id": "req-1" } },
      ),
    );
    const error = (await apiFetch("/x/").catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(429);
    expect(error.code).toBe("throttled");
    expect(error.retryAfter).toBe(30);
    expect(error.body.request_id).toBe("req-1");
    expect(error.message).toBe(
      "429 throttled: Juda ko‘p urinish. 30 soniyadan so‘ng qayta urinib ko‘ring.",
    );
  });

  it("synthesises an http_<status> envelope for a non-JSON error page", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>502 Bad Gateway</html>", {
        status: 502,
        headers: { "content-type": "text/html", "x-request-id": "edge-77" },
      }),
    );
    const error = (await apiFetch("/x/").catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(502);
    expect(error.body).toEqual({
      code: "http_502",
      message: "Kutilmagan xato.",
      errors: [],
      request_id: "edge-77",
    });
    expect(error.retryAfter).toBeUndefined();
  });

  it("synthesises the envelope when the JSON body has no code", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "nope" }, { status: 404 }));
    const error = (await apiFetch("/x/").catch((e: unknown) => e)) as ApiError;
    expect(error.code).toBe("http_404");
  });
});

describe("cachedGet", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_API_URL = "http://api.test:8000";
    process.env.GLOWDERMA_INTERNAL_SECRET = "s3cret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("issues a GET with the serialised query and the bearer", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ count: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await cachedGet<{ count: number }>(
      "/api/v1/admin/orders/",
      { page: 1, page_size: 10 },
      "jwt",
    );

    expect(result.data).toEqual({ count: 0 });
    const { url, init, headers } = lastRequest(fetchMock);
    expect(url).toBe("http://api.test:8000/api/v1/admin/orders/?page=1&page_size=10");
    expect(init.method).toBe("GET");
    expect(headers.get("authorization")).toBe("Bearer jwt");
  });
});

describe("buildQuery", () => {
  it("skips empty values and stringifies the rest", () => {
    expect(buildQuery(undefined)).toBe("");
    expect(buildQuery({ a: "", b: null, c: undefined })).toBe("");
    expect(buildQuery({ out_of_stock: false, page: 3, search: "№10248" })).toBe(
      "?out_of_stock=false&page=3&search=%E2%84%9610248",
    );
  });
});

describe("parseRetryAfter", () => {
  it("reads delta-seconds and HTTP-dates", () => {
    const now = new Date("2026-10-24T07:00:00Z");
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter("1")).toBe(1);
    expect(parseRetryAfter(" 30 ")).toBe(30);
    expect(parseRetryAfter("Sat, 24 Oct 2026 07:00:45 GMT", now)).toBe(45);
    expect(parseRetryAfter("Sat, 24 Oct 2026 06:00:00 GMT", now)).toBe(0);
    expect(parseRetryAfter("soon")).toBeUndefined();
  });
});

describe("isIpLiteral", () => {
  it("accepts bare IPv4 and IPv6 literals", () => {
    for (const ip of [
      "203.0.113.7",
      "0.0.0.0",
      "255.255.255.255",
      "::1",
      "::",
      "2001:db8::1",
      "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
      "fe80::1:2:3:4:5:6",
      "::ffff:203.0.113.7",
    ]) {
      expect(isIpLiteral(ip), ip).toBe(true);
    }
  });

  it("rejects ports, brackets, zones, names and malformed addresses", () => {
    for (const value of [
      "",
      "unknown",
      "256.0.0.1",
      "1.2.3",
      "1.2.3.4.5",
      "203.0.113.7:8443",
      "[2001:db8::1]",
      "[2001:db8::1]:443",
      "fe80::1%eth0",
      "2001:db8:::1",
      "1::2::3",
      "1:2:3:4:5:6:7:8:9",
      "1:2:3:4:5:6:7",
      "gggg::1",
      "203.0.113.7 ",
      "evil.example",
    ]) {
      expect(isIpLiteral(value), value).toBe(false);
    }
  });
});
