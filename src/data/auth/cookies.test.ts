import { describe, expect, it } from "vitest";

import {
  accessCookie,
  accessCookieMaxAge,
  clearSessionCookies,
  csrfCookie,
  refreshBackoffCookie,
  refreshCookie,
  setCookie,
  type CookieAttributes,
} from "./cookies";
import { fakeJwt } from "./jwt.fixture";

const now = Date.parse("2026-10-24T12:00:00+05:00");
const nowSeconds = Math.floor(now / 1000);

function sink() {
  const calls: Array<{ name: string; value: string; options: Partial<CookieAttributes> }> = [];
  return {
    calls,
    set(name: string, value: string, options: Partial<CookieAttributes>) {
      calls.push({ name, value, options });
    },
  };
}

describe("access cookie", () => {
  const token = fakeJwt({ exp: nowSeconds + 900, sid: "s1" });

  it("is HttpOnly, SameSite=Strict, Path=/admin and lives until min(exp, access_expires_at)", () => {
    const cookie = accessCookie({
      secure: false,
      token,
      accessExpiresAt: "2026-10-24T12:15:00+05:00",
      nowMs: now,
    });
    expect(cookie).toEqual({
      name: "gd_admin_access",
      value: token,
      attributes: {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        path: "/admin",
        maxAge: 900,
      },
    });
  });

  it("takes the earlier of the JWT exp and access_expires_at", () => {
    expect(accessCookieMaxAge(token, "2026-10-24T12:05:00+05:00", now)).toBe(300);
    expect(accessCookieMaxAge(token, "2026-10-24T13:00:00+05:00", now)).toBe(900);
  });

  it("uses the __Secure- prefix and Secure when secure", () => {
    const cookie = accessCookie({
      secure: true,
      token,
      accessExpiresAt: "2026-10-24T12:15:00+05:00",
      nowMs: now,
    });
    expect(cookie?.name).toBe("__Secure-gd_admin_access");
    expect(cookie?.attributes.secure).toBe(true);
  });

  it("refuses unusable tokens", () => {
    const expired = fakeJwt({ exp: nowSeconds - 1 });
    expect(
      accessCookie({
        secure: false,
        token: expired,
        accessExpiresAt: "2026-10-24T12:15:00+05:00",
        nowMs: now,
      }),
    ).toBeNull();
    expect(
      accessCookie({
        secure: false,
        token: "garbage",
        accessExpiresAt: "2026-10-24T12:15:00+05:00",
        nowMs: now,
      }),
    ).toBeNull();
    expect(
      accessCookie({ secure: false, token, accessExpiresAt: "yesterday", nowMs: now }),
    ).toBeNull();
    expect(
      accessCookie({
        secure: false,
        token,
        accessExpiresAt: "2026-10-24T11:59:59+05:00",
        nowMs: now,
      }),
    ).toBeNull();
  });
});

describe("refresh cookie", () => {
  it("is HttpOnly, SameSite=Strict, Path=/admin/auth and lives until refresh_expires_at", () => {
    const cookie = refreshCookie({
      secure: true,
      token: "opaque",
      refreshExpiresAt: "2026-10-25T00:00:00+05:00",
      nowMs: now,
    });
    expect(cookie).toEqual({
      name: "__Secure-gd_admin_refresh",
      value: "opaque",
      attributes: {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/admin/auth",
        maxAge: 12 * 60 * 60,
      },
    });
    expect(
      refreshCookie({ secure: false, token: "x", refreshExpiresAt: "bad", nowMs: now }),
    ).toBeNull();
    expect(
      refreshCookie({
        secure: false,
        token: "x",
        refreshExpiresAt: "2026-10-24T12:00:00+05:00",
        nowMs: now,
      }),
    ).toBeNull();
  });
});

describe("csrf and backoff cookies", () => {
  it("csrf is readable (not HttpOnly), SameSite=Strict, Path=/admin, never prefixed", () => {
    expect(csrfCookie({ secure: true, value: "tok" })).toEqual({
      name: "gd_csrf",
      value: "tok",
      attributes: {
        httpOnly: false,
        secure: true,
        sameSite: "strict",
        path: "/admin",
        maxAge: 43_200,
      },
    });
    expect(csrfCookie({ secure: false, value: "tok" }).attributes.secure).toBe(false);
  });

  it("backoff lives 30 s on Path=/admin", () => {
    expect(refreshBackoffCookie({ secure: false })).toEqual({
      name: "gd_refresh_backoff",
      value: "1",
      attributes: { httpOnly: true, secure: false, sameSite: "strict", path: "/admin", maxAge: 30 },
    });
  });
});

describe("setCookie / clearSessionCookies", () => {
  it("applies the attributes to a cookie store", () => {
    const store = sink();
    setCookie(store, csrfCookie({ secure: false, value: "tok" }));
    expect(store.calls).toEqual([
      {
        name: "gd_csrf",
        value: "tok",
        options: {
          httpOnly: false,
          secure: false,
          sameSite: "strict",
          path: "/admin",
          maxAge: 43_200,
        },
      },
    ]);
  });

  it("expires all four cookies on their own paths", () => {
    const store = sink();
    clearSessionCookies(store, true);
    expect(store.calls.map((c) => [c.name, c.value, c.options.path, c.options.maxAge])).toEqual([
      ["__Secure-gd_admin_access", "", "/admin", 0],
      ["__Secure-gd_admin_refresh", "", "/admin/auth", 0],
      ["gd_csrf", "", "/admin", 0],
      ["gd_refresh_backoff", "", "/admin", 0],
    ]);
    expect(store.calls.every((c) => c.options.secure === true)).toBe(true);
  });
});
