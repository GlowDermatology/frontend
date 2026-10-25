import { describe, expect, it } from "vitest";

import { fakeJwt } from "./jwt.fixture";
import { decideProxy, type ProxyInput } from "./proxy-decision";

const now = Date.parse("2026-10-24T12:00:00+05:00");
const nowSeconds = Math.floor(now / 1000);
const live = fakeJwt({ exp: nowSeconds + 600 });
const nearExpiry = fakeJwt({ exp: nowSeconds + 30 });
const expired = fakeJwt({ exp: nowSeconds - 30 });

const base: ProxyInput = {
  method: "GET",
  pathname: "/admin/orders",
  search: "?status=processing",
  mode: "api",
  accessToken: live,
  hasBackoff: false,
  hasCsrf: true,
  nowMs: now,
};

describe("decideProxy", () => {
  it("passes non-GET requests through untouched", () => {
    expect(
      decideProxy({ ...base, method: "POST", accessToken: undefined, hasCsrf: false }),
    ).toEqual({ kind: "pass", mintCsrf: false });
  });

  it("treats HEAD like GET", () => {
    expect(decideProxy({ ...base, method: "HEAD", accessToken: undefined })).toMatchObject({
      kind: "refresh",
    });
  });

  it("passes the login page and the auth route handlers through", () => {
    expect(
      decideProxy({ ...base, pathname: "/admin/login", accessToken: undefined, hasCsrf: false }),
    ).toEqual({ kind: "pass", mintCsrf: true });
    expect(
      decideProxy({
        ...base,
        pathname: "/admin/auth/refresh",
        accessToken: undefined,
        hasCsrf: false,
      }),
    ).toEqual({ kind: "pass", mintCsrf: false });
    expect(decideProxy({ ...base, pathname: "/admin/auth/logout", method: "POST" })).toEqual({
      kind: "pass",
      mintCsrf: false,
    });
  });

  it("in mock mode only mints the csrf cookie when missing", () => {
    expect(decideProxy({ ...base, mode: "mock", accessToken: undefined, hasCsrf: false })).toEqual({
      kind: "pass",
      mintCsrf: true,
    });
    expect(decideProxy({ ...base, mode: "mock", accessToken: undefined, hasCsrf: true })).toEqual({
      kind: "pass",
      mintCsrf: false,
    });
  });

  it("in api mode bounces to the refresh route when the access cookie is missing or near expiry", () => {
    expect(decideProxy({ ...base, accessToken: undefined })).toEqual({
      kind: "refresh",
      next: "/admin/orders?status=processing",
      mintCsrf: false,
    });
    expect(decideProxy({ ...base, accessToken: expired, hasCsrf: false })).toEqual({
      kind: "refresh",
      next: "/admin/orders?status=processing",
      mintCsrf: true,
    });
    expect(decideProxy({ ...base, accessToken: nearExpiry })).toMatchObject({ kind: "refresh" });
    expect(decideProxy({ ...base, accessToken: "garbage" })).toMatchObject({ kind: "refresh" });
  });

  it("in api mode passes through with a live token, or with the backoff cookie set", () => {
    expect(decideProxy(base)).toEqual({ kind: "pass", mintCsrf: false });
    expect(decideProxy({ ...base, hasCsrf: false })).toEqual({ kind: "pass", mintCsrf: true });
    expect(decideProxy({ ...base, accessToken: undefined, hasBackoff: true })).toEqual({
      kind: "pass",
      mintCsrf: false,
    });
    expect(decideProxy({ ...base, accessToken: nearExpiry, hasBackoff: true })).toEqual({
      kind: "pass",
      mintCsrf: false,
    });
  });

  it("validates the next path it builds", () => {
    expect(
      decideProxy({ ...base, pathname: "/admin/../x", search: "", accessToken: undefined }),
    ).toEqual({ kind: "refresh", next: "/admin", mintCsrf: false });
  });
});
