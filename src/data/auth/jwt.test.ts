import { describe, expect, it } from "vitest";

import { accessExpiresAtMs, decodeJwtPayload, isAccessLive } from "./jwt";
import { fakeJwt } from "./jwt.fixture";

describe("decodeJwtPayload", () => {
  it("reads exp, sid and sub without verifying the signature", () => {
    const token = fakeJwt({ exp: 1_800_000_000, sid: "abc", sub: "1", aud: "staff" });
    expect(decodeJwtPayload(token)).toEqual({ exp: 1_800_000_000, sid: "abc", sub: "1" });
  });

  it("tolerates garbage", () => {
    expect(decodeJwtPayload(undefined)).toBeNull();
    expect(decodeJwtPayload(null)).toBeNull();
    expect(decodeJwtPayload("")).toBeNull();
    expect(decodeJwtPayload("not-a-jwt")).toBeNull();
    expect(decodeJwtPayload("a.b")).toBeNull();
    expect(decodeJwtPayload("a..c")).toBeNull();
    expect(decodeJwtPayload("a.!!!.c")).toBeNull();
    expect(decodeJwtPayload(`a.${Buffer.from("not json").toString("base64url")}.c`)).toBeNull();
    expect(decodeJwtPayload(`a.${Buffer.from("[1]").toString("base64url")}.c`)).toBeNull();
    expect(decodeJwtPayload(fakeJwt({ sid: "x" }))).toBeNull();
    expect(decodeJwtPayload(fakeJwt({ exp: "soon" }))).toBeNull();
  });

  it("ignores non-string sid/sub", () => {
    expect(decodeJwtPayload(fakeJwt({ exp: 1, sid: 5, sub: {} }))).toEqual({
      exp: 1,
      sid: null,
      sub: null,
    });
  });
});

describe("isAccessLive", () => {
  const now = Date.UTC(2026, 9, 24, 7, 0, 0);
  const expIn = (seconds: number) => fakeJwt({ exp: Math.floor(now / 1000) + seconds });

  it("compares exp against now with an optional lead", () => {
    expect(accessExpiresAtMs(expIn(600))).toBe(now + 600_000);
    expect(isAccessLive(expIn(600), now)).toBe(true);
    expect(isAccessLive(expIn(-1), now)).toBe(false);
    expect(isAccessLive(expIn(0), now)).toBe(false);
    expect(isAccessLive(expIn(59), now, 60)).toBe(false);
    expect(isAccessLive(expIn(61), now, 60)).toBe(true);
    expect(isAccessLive("garbage", now)).toBe(false);
    expect(isAccessLive(undefined, now)).toBe(false);
  });
});
