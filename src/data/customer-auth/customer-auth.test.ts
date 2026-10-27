import { describe, expect, it, vi } from "vitest";

import { decodeJwtPayload } from "@/data/auth/jwt";

import { customerCookieNames } from "./cookie-names";
import {
  clearCustomerSession,
  customerCsrfCookie,
  deviceIdCookie,
  deviceKeyCookie,
  isValidDeviceId,
  mintDeviceId,
  sessionCookies,
} from "./cookies";
import { slugFromBody } from "./legacy-redirect";
import { safeShopNext } from "./next-param";
import { SHOP_REFRESH_PATH, decideShopProxy, type ShopProxyInput } from "./proxy-decision";
import { classifyCustomerRefresh, createRefreshCoordinator, tokenHash } from "./refresh";
import { checkCustomerAction } from "./session";

const NOW = Date.parse("2026-10-27T12:00:00+05:00");

/** An unsigned JWT whose `exp` is `seconds` after NOW (the BFF never verifies signatures). */
function jwt(seconds: number): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(NOW / 1000) + seconds, sid: "s1", sub: "7" }),
  ).toString("base64url");
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
}

function iso(offsetSeconds: number): string {
  return new Date(NOW + offsetSeconds * 1000).toISOString();
}

describe("customer cookie names", () => {
  it("are separate from the admin session and prefixed on HTTPS", () => {
    expect(customerCookieNames(false)).toMatchObject({
      access: "gd_cust_access",
      refresh: "gd_cust_refresh",
      csrf: "gd_cust_csrf",
      deviceId: "gd_dev_id",
      deviceKey: "gd_dev_key",
      signedIn: "gd_cust_in",
    });
    const secure = customerCookieNames(true);
    expect(secure.access).toBe("__Host-gd_cust_access");
    expect(secure.deviceId).toBe("__Host-gd_dev_id");
    expect(secure.deviceKey).toBe("__Host-gd_dev_key");
    expect(secure.refresh).toBe("__Host-gd_cust_refresh");
    // __Host- binds the readable csrf token to this host too; the hint stays plain.
    expect(secure.csrf).toBe("__Host-gd_cust_csrf");
    expect(secure.signedIn).toBe("gd_cust_in");
  });
});

describe("customer cookies", () => {
  it("sets access, refresh and the hint as Lax, path /, HttpOnly where secret", () => {
    const cookies = sessionCookies({
      secure: true,
      access: jwt(900),
      accessExpiresAt: iso(900),
      refresh: "r".repeat(43),
      refreshExpiresAt: iso(60 * 86_400),
      nowMs: NOW,
    });
    expect(cookies).not.toBeNull();
    const [access, refresh, hint] = cookies!;
    expect(access!.name).toBe("__Host-gd_cust_access");
    expect(access!.attributes).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });
    expect(refresh!.attributes).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    expect(refresh!.attributes.maxAge).toBe(60 * 86_400);
    expect(hint).toMatchObject({ name: "gd_cust_in", value: "1" });
    expect(hint!.attributes.httpOnly).toBe(false);
    expect(hint!.attributes.maxAge).toBe(60 * 86_400);
  });

  it("caps the access cookie at the earlier of the JWT exp and access_expires_at", () => {
    const cookies = sessionCookies({
      secure: false,
      access: jwt(600),
      accessExpiresAt: iso(900),
      refresh: "r",
      refreshExpiresAt: iso(3600),
      nowMs: NOW,
    });
    expect(cookies![0]!.attributes.maxAge).toBe(600);
  });

  it("refuses an unusable answer (expired access, past refresh expiry)", () => {
    const base = {
      secure: false,
      refresh: "r",
      nowMs: NOW,
    };
    expect(
      sessionCookies({
        ...base,
        access: jwt(-1),
        accessExpiresAt: iso(900),
        refreshExpiresAt: iso(60),
      }),
    ).toBeNull();
    expect(
      sessionCookies({
        ...base,
        access: jwt(900),
        accessExpiresAt: iso(900),
        refreshExpiresAt: iso(-5),
      }),
    ).toBeNull();
    expect(
      sessionCookies({
        ...base,
        access: "garbage",
        accessExpiresAt: iso(900),
        refreshExpiresAt: iso(60),
      }),
    ).toBeNull();
  });

  it("mints well-formed device ids that the API's pattern accepts", () => {
    const ids = new Set(Array.from({ length: 50 }, () => mintDeviceId()));
    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(id).toMatch(/^web_[A-Za-z0-9_-]{22}$/);
      expect(isValidDeviceId(id)).toBe(true);
    }
    expect(isValidDeviceId("short")).toBe(false);
    expect(isValidDeviceId("has space in it")).toBe(false);
    expect(isValidDeviceId(undefined)).toBe(false);
  });

  it("keeps the device cookies for 400 days, HttpOnly", () => {
    const device = deviceIdCookie({ secure: false, value: "web_abcdefghijklmnopqrstuv" });
    expect(device.attributes).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    expect(device.attributes.maxAge).toBe(400 * 86_400);
    expect(deviceKeyCookie({ secure: false, value: "k".repeat(43) })?.attributes.httpOnly).toBe(
      true,
    );
    expect(deviceKeyCookie({ secure: false, value: "too-short" })).toBeNull();
  });

  it("makes the csrf cookie readable by the page's scripts", () => {
    expect(customerCsrfCookie({ secure: true, value: "t" }).attributes.httpOnly).toBe(false);
  });

  it("clears the session but keeps the device id and key", () => {
    const set = vi.fn();
    clearCustomerSession({ set }, false);
    const cleared = set.mock.calls.map(([name]) => name);
    expect(cleared).toEqual(
      expect.arrayContaining(["gd_cust_access", "gd_cust_refresh", "gd_cust_in"]),
    );
    expect(cleared).not.toContain("gd_dev_id");
    expect(cleared).not.toContain("gd_dev_key");
    for (const [, value, options] of set.mock.calls) {
      expect(value).toBe("");
      expect(options).toMatchObject({ maxAge: 0, path: "/", sameSite: "lax" });
    }
  });
});

describe("classifyCustomerRefresh", () => {
  const tokens = {
    access: jwt(900),
    access_expires_at: iso(900),
    refresh: "n".repeat(43),
    refresh_expires_at: iso(60 * 86_400),
  };

  it("accepts a rotation with all four fields", () => {
    expect(classifyCustomerRefresh({ status: 200, body: tokens }, NOW)).toEqual({
      kind: "ok",
      tokens: {
        access: tokens.access,
        accessExpiresAt: tokens.access_expires_at,
        refresh: tokens.refresh,
        refreshExpiresAt: tokens.refresh_expires_at,
      },
    });
  });

  it("treats an unusable 200 as transient (the old token is still in grace)", () => {
    expect(
      classifyCustomerRefresh({ status: 200, body: { ...tokens, refresh: undefined } }, NOW).kind,
    ).toBe("transient");
    expect(
      classifyCustomerRefresh({ status: 200, body: { ...tokens, access: jwt(-10) } }, NOW).kind,
    ).toBe("transient");
  });

  it("ends the session on 401 and 400 with the API's code", () => {
    expect(
      classifyCustomerRefresh({ status: 401, body: { code: "SESSION_EXPIRED" } }, NOW),
    ).toEqual({ kind: "ended", code: "SESSION_EXPIRED" });
    expect(
      classifyCustomerRefresh({ status: 401, body: { code: "password_changed" } }, NOW),
    ).toEqual({ kind: "ended", code: "password_changed" });
    expect(
      classifyCustomerRefresh({ status: 400, body: { code: "device_required" } }, NOW),
    ).toEqual({ kind: "ended", code: "device_required" });
    expect(classifyCustomerRefresh({ status: 401 }, NOW)).toEqual({
      kind: "ended",
      code: "not_authenticated",
    });
  });

  it("keeps the session on 429, 5xx and transport failures", () => {
    expect(classifyCustomerRefresh({ status: 429, retryAfter: 12 }, NOW)).toEqual({
      kind: "transient",
      retryAfter: 12,
    });
    expect(classifyCustomerRefresh({ status: 503 }, NOW).kind).toBe("transient");
    expect(classifyCustomerRefresh({ status: 0 }, NOW).kind).toBe("transient");
  });
});

describe("createRefreshCoordinator (single flight, rotation-safe)", () => {
  function rotation(newRefresh: string) {
    return {
      status: 200,
      body: {
        access: jwt(900),
        access_expires_at: iso(900),
        refresh: newRefresh,
        refresh_expires_at: iso(86_400),
      },
    };
  }

  it("shares one API call between concurrent refreshes of the same token", async () => {
    let resolve!: (value: ReturnType<typeof rotation>) => void;
    const call = vi.fn(() => new Promise<ReturnType<typeof rotation>>((r) => (resolve = r)));
    const coordinator = createRefreshCoordinator({ now: () => NOW });
    const first = coordinator.refresh("old", call);
    const second = coordinator.refresh("old", call);
    const third = coordinator.refresh("old", call);
    resolve(rotation("new-1"));
    const outcomes = await Promise.all([first, second, third]);
    expect(call).toHaveBeenCalledTimes(1);
    for (const outcome of outcomes) {
      expect(outcome).toMatchObject({ kind: "ok", tokens: { refresh: "new-1" } });
    }
  });

  it("answers a late request that still carries the old token with the same new tokens", async () => {
    let now = NOW;
    const call = vi.fn(async () => rotation("new-1"));
    const coordinator = createRefreshCoordinator({ now: () => now, memoMs: 60_000 });
    await coordinator.refresh("old", call);
    now += 30_000;
    const late = await coordinator.refresh("old", call);
    expect(call).toHaveBeenCalledTimes(1);
    expect(late).toMatchObject({ kind: "ok", tokens: { refresh: "new-1" } });

    // After the memo window the old token goes to the API again (its grace
    // replay or a reuse verdict is the server's call).
    now += 31_000;
    await coordinator.refresh("old", call);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("does not remember failures, so the next request retries", async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce(rotation("new-2"));
    const coordinator = createRefreshCoordinator({ now: () => NOW });
    expect((await coordinator.refresh("old", call)).kind).toBe("transient");
    expect((await coordinator.refresh("old", call)).kind).toBe("ok");
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("treats a thrown call as transient and keeps different tokens apart", async () => {
    const coordinator = createRefreshCoordinator({ now: () => NOW });
    const boom = vi.fn(async () => {
      throw new Error("socket hang up");
    });
    expect((await coordinator.refresh("a", boom)).kind).toBe("transient");
    const ok = vi.fn(async () => rotation("b-new"));
    expect((await coordinator.refresh("b", ok)).kind).toBe("ok");
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it("forgets a token after logout", async () => {
    const call = vi.fn(async () => rotation("n"));
    const coordinator = createRefreshCoordinator({ now: () => NOW });
    await coordinator.refresh("old", call);
    coordinator.forget("old");
    await coordinator.refresh("old", call);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("bounds the memo", async () => {
    const coordinator = createRefreshCoordinator({ now: () => NOW, maxEntries: 2 });
    const call = vi.fn(async (token: string) => rotation(`${token}-new`));
    await coordinator.refresh("a", call);
    await coordinator.refresh("b", call);
    await coordinator.refresh("c", call);
    await coordinator.refresh("a", call); // evicted: calls again
    expect(call).toHaveBeenCalledTimes(4);
  });

  it("keys the memo by the device id too (a replay from another device goes to the API)", async () => {
    const call = vi.fn(async () => rotation("new-1"));
    const coordinator = createRefreshCoordinator({ now: () => NOW });
    await coordinator.refresh("old", call, "web_device_a");
    await coordinator.refresh("old", call, "web_device_a");
    expect(call).toHaveBeenCalledTimes(1);
    await coordinator.refresh("old", call, "web_device_b");
    expect(call).toHaveBeenCalledTimes(2);
    coordinator.forget("old");
    await coordinator.refresh("old", call, "web_device_a");
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("hashes tokens (never keys the memo by the raw token)", () => {
    expect(tokenHash("secret")).not.toContain("secret");
    expect(tokenHash("secret")).toBe(tokenHash("secret"));
  });
});

describe("decideShopProxy", () => {
  const base: ShopProxyInput = {
    method: "GET",
    pathname: "/",
    search: "",
    mode: "api",
    accessToken: undefined,
    hasRefresh: false,
    hasBackoff: false,
    hasCsrf: false,
    hasDeviceId: false,
    nowMs: NOW,
  };

  it("leaves anonymous public pages untouched (no cookies)", () => {
    for (const pathname of ["/", "/katalog", "/ru/products/serum", "/en/specialists"]) {
      expect(decideShopProxy({ ...base, pathname })).toEqual({
        kind: "pass",
        mintDeviceId: false,
        mintCsrf: false,
      });
    }
  });

  it("mints the csrf token on a public page for a signed-in customer", () => {
    expect(decideShopProxy({ ...base, pathname: "/katalog", hasRefresh: true })).toEqual({
      kind: "pass",
      mintDeviceId: false,
      mintCsrf: true,
    });
  });

  it("turns a legacy numeric product or specialist URL into a slug lookup (api mode)", () => {
    expect(decideShopProxy({ ...base, pathname: "/mahsulotlar/12" })).toEqual({
      kind: "legacy-id",
      entity: "product",
      id: "12",
      locale: "uz",
    });
    expect(decideShopProxy({ ...base, pathname: "/ru/specialists/3" })).toEqual({
      kind: "legacy-id",
      entity: "specialist",
      id: "3",
      locale: "ru",
    });
    expect(decideShopProxy({ ...base, pathname: "/mahsulotlar/12", mode: "mock" }).kind).toBe(
      "pass",
    );
    expect(decideShopProxy({ ...base, pathname: "/kategoriyalar/12" }).kind).toBe("pass");
  });

  it("mints the device id and csrf on private pages", () => {
    expect(decideShopProxy({ ...base, pathname: "/kirish" })).toEqual({
      kind: "pass",
      mintDeviceId: true,
      mintCsrf: true,
    });
    expect(
      decideShopProxy({ ...base, pathname: "/ru/cart", hasDeviceId: true, hasCsrf: true }),
    ).toEqual({ kind: "pass", mintDeviceId: false, mintCsrf: false });
  });

  it("bounces a private GET with a lapsing access cookie to the refresh route", () => {
    const decision = decideShopProxy({
      ...base,
      pathname: "/savat",
      search: "?x=1",
      hasRefresh: true,
      accessToken: jwt(30),
      hasDeviceId: true,
      hasCsrf: true,
    });
    expect(decision).toEqual({
      kind: "refresh",
      location: `${SHOP_REFRESH_PATH}?next=${encodeURIComponent("/savat?x=1")}`,
      mintDeviceId: false,
      mintCsrf: false,
    });
  });

  it("does not bounce with a live token, without a refresh cookie, in backoff, in mock mode or for POSTs", () => {
    const signedIn = { ...base, pathname: "/savat", hasRefresh: true };
    expect(decideShopProxy({ ...signedIn, accessToken: jwt(600) }).kind).toBe("pass");
    expect(decideShopProxy({ ...signedIn, hasRefresh: false }).kind).toBe("pass");
    expect(decideShopProxy({ ...signedIn, hasBackoff: true }).kind).toBe("pass");
    expect(decideShopProxy({ ...signedIn, mode: "mock" }).kind).toBe("pass");
    expect(decideShopProxy({ ...signedIn, method: "POST" })).toEqual({
      kind: "pass",
      mintDeviceId: false,
      mintCsrf: false,
    });
  });
});

describe("safeShopNext", () => {
  it("accepts storefront paths with their query", () => {
    expect(safeShopNext("/savat")).toBe("/savat");
    expect(safeShopNext("/ru/products/serum?x=1#top")).toBe("/ru/products/serum?x=1");
    expect(safeShopNext("/")).toBe("/");
  });

  it("refuses off-site, admin, API, dot-segment and sign-in targets", () => {
    for (const value of [
      "https://evil.example/",
      "//evil.example",
      "/\\evil",
      "/admin",
      "/api/shop/auth/refresh",
      "/mahsulotlar/../admin",
      "/kirish",
      "",
      42,
      undefined,
    ]) {
      expect(safeShopNext(value)).toBe("/");
    }
    expect(safeShopNext("/admin", "ru")).toBe("/ru");
  });

  it("percent-encodes non-ASCII so the value is a valid Location header", () => {
    expect(safeShopNext("/katalog?q=ko‘pik")).toBe("/katalog?q=ko%E2%80%98pik");
  });
});

describe("checkCustomerAction", () => {
  const live = jwt(600);

  it("refuses a missing, empty or wrong csrf token before looking at the session", () => {
    for (const presented of [undefined, "", 5, "other"]) {
      expect(
        checkCustomerAction({ csrfCookie: "tok", presented, accessToken: live, nowMs: NOW }),
      ).toMatchObject({ ok: false, code: "csrf" });
    }
  });

  it("asks for a refresh when the access token is missing or expired", () => {
    expect(
      checkCustomerAction({
        csrfCookie: "tok",
        presented: "tok",
        accessToken: undefined,
        nowMs: NOW,
      }),
    ).toMatchObject({ ok: false, code: "session_expired" });
    expect(
      checkCustomerAction({
        csrfCookie: "tok",
        presented: "tok",
        accessToken: jwt(-1),
        nowMs: NOW,
      }),
    ).toMatchObject({ ok: false, code: "session_expired" });
  });

  it("passes the bearer through when both checks pass", () => {
    expect(
      checkCustomerAction({ csrfCookie: "tok", presented: "tok", accessToken: live, nowMs: NOW }),
    ).toEqual({ ok: true, accessToken: live });
    expect(decodeJwtPayload(live)?.sid).toBe("s1");
  });
});

describe("slugFromBody (legacy id redirect)", () => {
  it("reads a usable slug only", () => {
    expect(slugFromBody({ id: 1, slug: "gialuron-serum" })).toBe("gialuron-serum");
    expect(slugFromBody({ id: 1 })).toBeNull();
    expect(slugFromBody({ slug: "12" })).toBeNull();
    expect(slugFromBody({ slug: "../x" })).toBeNull();
    expect(slugFromBody(null)).toBeNull();
  });
});
