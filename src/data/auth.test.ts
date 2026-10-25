import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeJwt } from "./auth/jwt.fixture";

/**
 * `verifyStaff` / `requireStaff` in api mode, with Next's request APIs
 * stubbed: the cookie store, the `x-gd-next` header the proxy stamps and
 * `redirect()` (which throws, as the real one does). Covers the three
 * outcomes of the double-submit check (omitted property = read, present but
 * wrong/empty/undefined = `csrf`) and the redirect targets of `requireStaff`
 * (expired → the refresh route, no session → login).
 */

const cookieJar = new Map<string, string>();
const requestHeaders = new Map<string, string>();

class RedirectSignal extends Error {
  constructor(readonly location: string) {
    super(`NEXT_REDIRECT ${location}`);
  }
}

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
  headers: async () => ({ get: (name: string) => requestHeaders.get(name) ?? null }),
}));
vi.mock("next/navigation", () => ({
  redirect: (location: string) => {
    throw new RedirectSignal(location);
  },
}));

import { requireStaff, verifyStaff } from "./auth";

const ACCESS = "gd_admin_access";
const CSRF = "gd_csrf";
const TOKEN = "double-submit-token";

const savedSource = process.env.GLOWDERMA_DATA_SOURCE;
const savedSecure = process.env.GLOWDERMA_COOKIE_SECURE;

function liveAccess(secondsFromNow = 600): string {
  return fakeJwt({ exp: Math.floor(Date.now() / 1000) + secondsFromNow, sid: "s1", sub: "1" });
}

async function redirectOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof RedirectSignal) return error.location;
    throw error;
  }
  throw new Error("expected a redirect");
}

beforeEach(() => {
  process.env.GLOWDERMA_DATA_SOURCE = "api";
  process.env.GLOWDERMA_COOKIE_SECURE = "false";
  cookieJar.clear();
  requestHeaders.clear();
});

afterEach(() => {
  if (savedSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = savedSource;
  if (savedSecure === undefined) delete process.env.GLOWDERMA_COOKIE_SECURE;
  else process.env.GLOWDERMA_COOKIE_SECURE = savedSecure;
});

describe("verifyStaff (api mode)", () => {
  it("reports no_session without an access cookie and expired past exp", async () => {
    expect(await verifyStaff()).toEqual({ ok: false, reason: "no_session" });
    cookieJar.set(ACCESS, "not-a-jwt");
    expect(await verifyStaff()).toEqual({ ok: false, reason: "no_session" });
    cookieJar.set(ACCESS, liveAccess(-5));
    expect(await verifyStaff()).toEqual({ ok: false, reason: "expired" });
  });

  it("accepts a live access cookie for a read (no csrf property)", async () => {
    const token = liveAccess();
    cookieJar.set(ACCESS, token);
    expect(await verifyStaff()).toEqual({ ok: true, mode: "api", token, sid: "s1" });
    expect(await verifyStaff({})).toMatchObject({ ok: true });
  });

  it("compares the presented token with the gd_csrf cookie whenever the property is present", async () => {
    cookieJar.set(ACCESS, liveAccess());
    cookieJar.set(CSRF, TOKEN);
    expect(await verifyStaff({ csrf: TOKEN })).toMatchObject({ ok: true, mode: "api" });
    expect(await verifyStaff({ csrf: "wrong" })).toEqual({ ok: false, reason: "csrf" });
    expect(await verifyStaff({ csrf: "" })).toEqual({ ok: false, reason: "csrf" });
    expect(await verifyStaff({ csrf: null })).toEqual({ ok: false, reason: "csrf" });
    // `{ csrf: undefined }` is a present property, not an omitted check.
    expect(await verifyStaff({ csrf: undefined })).toEqual({ ok: false, reason: "csrf" });
  });

  it("fails the csrf check when the cookie itself is missing", async () => {
    cookieJar.set(ACCESS, liveAccess());
    expect(await verifyStaff({ csrf: TOKEN })).toEqual({ ok: false, reason: "csrf" });
  });

  it("answers the session problem before the csrf one", async () => {
    cookieJar.set(ACCESS, liveAccess(-5));
    cookieJar.set(CSRF, TOKEN);
    expect(await verifyStaff({ csrf: "wrong" })).toEqual({ ok: false, reason: "expired" });
  });
});

describe("requireStaff (api mode)", () => {
  it("returns the session when the access cookie is live", async () => {
    cookieJar.set(ACCESS, liveAccess());
    expect(await requireStaff()).toMatchObject({ ok: true, mode: "api", sid: "s1" });
  });

  it("sends an expired session to the refresh route with the proxy's next path", async () => {
    cookieJar.set(ACCESS, liveAccess(-5));
    requestHeaders.set("x-gd-next", "/admin/orders?status=new");
    expect(await redirectOf(requireStaff)).toBe(
      "/admin/auth/refresh?next=%2Fadmin%2Forders%3Fstatus%3Dnew",
    );
  });

  it("sends a missing session to the login page, falling back to /admin without the header", async () => {
    expect(await redirectOf(requireStaff)).toBe("/admin/login?next=%2Fadmin");
    requestHeaders.set("x-gd-next", "/admin/customers/5");
    expect(await redirectOf(requireStaff)).toBe("/admin/login?next=%2Fadmin%2Fcustomers%2F5");
  });

  it("does not let an unsafe next path through", async () => {
    requestHeaders.set("x-gd-next", "https://evil.example/admin");
    expect(await redirectOf(requireStaff)).toBe("/admin/login?next=%2Fadmin");
  });
});
