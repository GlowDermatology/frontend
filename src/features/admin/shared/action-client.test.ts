import { describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/data/types";

import { runAction, type ActionClientEnv } from "./action-client";
import { readCsrfCookie } from "./csrf";

const EXPIRED: ActionResult<never> = {
  ok: false,
  error: "Sessiya tugadi. Qayta kiring.",
  code: "session_expired",
};

function env(overrides: Partial<ActionClientEnv> = {}) {
  // What `redirect: "manual"` yields for the route's 303: an opaque redirect.
  const opaqueRedirect = { type: "opaqueredirect", status: 0 } as Response;
  const fetchMock = vi.fn<typeof fetch>(async () => opaqueRedirect);
  const assign = vi.fn();
  const e: ActionClientEnv = {
    fetch: fetchMock,
    location: { pathname: "/admin/orders/10248", search: "?tab=history", assign },
    csrf: () => "tok",
    ...overrides,
  };
  return { env: e, fetchMock, assign };
}

describe("readCsrfCookie", () => {
  it("picks gd_csrf out of the cookie string and decodes it", () => {
    expect(readCsrfCookie("a=1; gd_csrf=abc%2Fdef; b=2")).toBe("abc/def");
    expect(readCsrfCookie("gd_csrf=plain")).toBe("plain");
    expect(readCsrfCookie("gd_csrf_other=x; a=1")).toBe("");
    expect(readCsrfCookie("")).toBe("");
    expect(readCsrfCookie(undefined)).toBe("");
  });
});

describe("runAction", () => {
  it("passes the csrf cookie and returns a success without touching the refresh route", async () => {
    const { env: e, fetchMock } = env();
    const invoke = vi.fn(async (csrf: string) => ({ ok: true as const, data: csrf }));
    expect(await runAction(invoke, e)).toEqual({ ok: true, data: "tok" });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns other failures unchanged (validation, csrf, not wired)", async () => {
    const { env: e, fetchMock, assign } = env();
    const failure: ActionResult<never> = { ok: false, error: "Sahifani yangilang.", code: "csrf" };
    expect(await runAction(async () => failure, e)).toBe(failure);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("refreshes once with a same-origin manual-redirect GET and retries the action with the same key", async () => {
    const { env: e, fetchMock, assign } = env();
    const invoke = vi
      .fn<(csrf: string) => Promise<ActionResult<string>>>()
      .mockResolvedValueOnce(EXPIRED)
      .mockResolvedValueOnce({ ok: true, data: "saved" });
    expect(await runAction(invoke, e)).toEqual({ ok: true, data: "saved" });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenNthCalledWith(2, "tok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/admin/auth/refresh?next=%2Fadmin%2Forders%2F10248%3Ftab%3Dhistory");
    expect(init).toMatchObject({ method: "GET", credentials: "same-origin", redirect: "manual" });
    // `Sec-Fetch-Site` is a forbidden header name: the browser sets it itself.
    expect(Object.keys(init?.headers ?? {}).map((h) => h.toLowerCase())).not.toContain(
      "sec-fetch-site",
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it("goes to the login page with the current location when the retry is still expired", async () => {
    const { env: e, fetchMock, assign } = env();
    const invoke = vi.fn(async () => EXPIRED);
    expect(await runAction(invoke, e)).toBe(EXPIRED);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(
      "/admin/login?next=%2Fadmin%2Forders%2F10248%3Ftab%3Dhistory",
    );
  });

  it("does not retry when the refresh route answered with its 5xx retry page or threw", async () => {
    const { env: e, assign, fetchMock } = env();
    fetchMock.mockResolvedValueOnce(new Response("retry", { status: 503 }));
    const invoke = vi.fn(async () => EXPIRED);
    expect(await runAction(invoke, e)).toBe(EXPIRED);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledTimes(1);

    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    invoke.mockClear();
    await runAction(invoke, e);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
