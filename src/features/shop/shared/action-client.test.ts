import { describe, expect, it, vi } from "vitest";

import type { ActionClientEnv } from "@/lib/actions/action-client";

import { hasSignedInHint, readShopCsrf, runShopAction } from "./action-client";

function env(pathname = "/ru/products/serum") {
  const fetchMock = vi.fn<typeof fetch>(
    async () => ({ type: "opaqueredirect", status: 0 }) as Response,
  );
  const assign = vi.fn();
  const e: ActionClientEnv = {
    fetch: fetchMock,
    location: { pathname, search: "?a=1", assign },
    csrf: () => "tok",
  };
  return { e, fetchMock, assign };
}

describe("runShopAction", () => {
  it("refreshes through the customer route and retries once", async () => {
    const { e, fetchMock } = env();
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "x", code: "session_expired" })
      .mockResolvedValueOnce({ ok: true, data: 1 });
    expect(await runShopAction("ru", invoke, e)).toEqual({ ok: true, data: 1 });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `/api/shop/auth/refresh?next=${encodeURIComponent("/ru/products/serum?a=1")}`,
    );
  });

  it("sends an ended session to the sign-in page of the page's language", async () => {
    const { e, assign } = env();
    const expired = { ok: false as const, error: "x", code: "session_expired" };
    await runShopAction("uz", async () => expired, e);
    expect(assign).toHaveBeenCalledWith(
      `/ru/sign-in?next=${encodeURIComponent("/ru/products/serum?a=1")}`,
    );
  });

  it("turns a rejected call into a localized network error", async () => {
    const { e } = env("/");
    const result = await runShopAction("en", async () => Promise.reject(new Error("x")), e);
    expect(result).toEqual({
      ok: false,
      error: "Could not reach the server. Please try again.",
      code: "network_error",
    });
  });
});

describe("cookie readers", () => {
  it("read the customer csrf and the signed-in hint only", () => {
    expect(readShopCsrf("gd_csrf=admin; gd_cust_csrf=shop")).toBe("shop");
    expect(hasSignedInHint("gd_cust_in=1")).toBe(true);
    expect(hasSignedInHint("gd_cust_in=0")).toBe(false);
    expect(hasSignedInHint(undefined)).toBe(false);
  });
});
