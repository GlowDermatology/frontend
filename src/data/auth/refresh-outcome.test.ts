import { describe, expect, it } from "vitest";

import { fakeJwt } from "./jwt.fixture";
import { classifyRefresh } from "./refresh-outcome";

const now = Date.parse("2026-10-24T12:00:00+05:00");
const nowSeconds = Math.floor(now / 1000);

describe("classifyRefresh", () => {
  it("ok: a fresh token yields the cookie lifetime", () => {
    const access = fakeJwt({ exp: nowSeconds + 900 });
    expect(
      classifyRefresh(
        { status: 200, body: { access, access_expires_at: "2026-10-24T12:15:00+05:00" } },
        now,
      ),
    ).toEqual({
      kind: "ok",
      access,
      accessExpiresAt: "2026-10-24T12:15:00+05:00",
      maxAge: 900,
      nearExpiry: false,
    });
  });

  it("ok + nearExpiry when the new token is already inside the 60 s lead", () => {
    const access = fakeJwt({ exp: nowSeconds + 45 });
    const outcome = classifyRefresh(
      { status: 200, body: { access, access_expires_at: "2026-10-24T12:15:00+05:00" } },
      now,
    );
    expect(outcome).toMatchObject({ kind: "ok", maxAge: 45, nearExpiry: true });
  });

  it("ended on 400 and 401", () => {
    expect(classifyRefresh({ status: 401, body: { code: "SESSION_EXPIRED" } }, now)).toEqual({
      kind: "ended",
    });
    expect(classifyRefresh({ status: 401, body: { code: "not_authenticated" } }, now)).toEqual({
      kind: "ended",
    });
    expect(classifyRefresh({ status: 400, body: { code: "validation_error" } }, now)).toEqual({
      kind: "ended",
    });
  });

  it("transient on 429, 5xx, transport failures and unusable tokens", () => {
    expect(classifyRefresh({ status: 429, retryAfter: 7 }, now)).toEqual({
      kind: "transient",
      retryAfter: 7,
    });
    expect(classifyRefresh({ status: 500 }, now)).toEqual({
      kind: "transient",
      retryAfter: undefined,
    });
    expect(classifyRefresh({ status: 503, retryAfter: 2 }, now)).toEqual({
      kind: "transient",
      retryAfter: 2,
    });
    expect(classifyRefresh({ status: 0 }, now)).toEqual({
      kind: "transient",
      retryAfter: undefined,
    });
    expect(classifyRefresh({ status: 403 }, now)).toEqual({
      kind: "transient",
      retryAfter: undefined,
    });
    expect(
      classifyRefresh({ status: 200, body: { access: "garbage", access_expires_at: "x" } }, now),
    ).toEqual({ kind: "transient", retryAfter: undefined });
    expect(classifyRefresh({ status: 200, body: null }, now)).toEqual({
      kind: "transient",
      retryAfter: undefined,
    });
    const expired = fakeJwt({ exp: nowSeconds - 5 });
    expect(
      classifyRefresh(
        { status: 200, body: { access: expired, access_expires_at: "2026-10-24T12:15:00+05:00" } },
        now,
      ),
    ).toEqual({ kind: "transient", retryAfter: undefined });
  });
});
