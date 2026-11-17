import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession, VerifyStaffOptions } from "./auth";
import { fakeJwt } from "./auth/jwt.fixture";

/**
 * The admin panel MFA flows (DESIGN §E "MFA"): the sign-in's second step (`verifyMfaStep`,
 * `leaveMfaStep`), the Settings actions and the manager's reset, in api and mock mode. The
 * challenge must stay in its cookie: it never shows up in a redirect target or a returned state.
 */

const jar = vi.hoisted(() => new Map<string, string>());
const sets = vi.hoisted(() => [] as Array<{ name: string; value: string; options: unknown }>);
const verifyStaff = vi.fn<(options?: VerifyStaffOptions) => Promise<StaffSession>>();
const apiFetch = vi.fn();

class Redirected extends Error {
  constructor(readonly location: string) {
    super(`redirect ${location}`);
  }
}

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (location: string) => {
    throw new Redirected(location);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string, options: unknown) => {
      sets.push({ name, value, options });
      if (value) jar.set(name, value);
      else jar.delete(name);
    },
  }),
  headers: async () => new Headers(),
}));
vi.mock("./auth", () => ({
  verifyStaff: (options?: VerifyStaffOptions) => verifyStaff(options),
  getMe: async () => ({ email: "admin@glowderma.uz" }),
}));
vi.mock("./mock/delay", () => ({ delay: async () => undefined }));
vi.mock("./api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  cachedGet: vi.fn(),
  apiFetchRaw: vi.fn(),
  buildQuery: () => "",
}));

import { ApiError } from "./api/errors";
import type { ErrorEnvelope } from "./api/types";
import { mfaChallengeCookie, mfaChallengeCookieName, openPendingMfa } from "./auth/mfa-challenge";
import {
  confirmMfaSetup,
  disableMfa,
  regenerateRecoveryCodes,
  resetStaffMfa,
  startMfaSetup,
} from "./mfa.actions";
import { leaveMfaStep, verifyMfaStep, type MfaStepState } from "./mfa-step.actions";
import { MOCK_MFA_COOKIE } from "./mock/mfa";
import { MOCK_STAFF_ACCOUNTS } from "./mock/staff";

const CHALLENGE = "Chal1enge_".repeat(4) + "xyz";
const KEY = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";
const savedSource = process.env.GLOWDERMA_DATA_SOURCE;
const savedMockMfa = process.env.GLOWDERMA_MOCK_MFA;
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
const envelope = (code: string, message: string, errors: ErrorEnvelope["errors"] = []) =>
  ({ code, message, errors, request_id: "r" }) as ErrorEnvelope;
const INITIAL: MfaStepState = {
  factor: "totp",
  codeError: null,
  formError: null,
  retryAfter: null,
  attempt: 0,
};

function plantChallenge(next = "/admin/orders?status=new") {
  const nowMs = Date.now();
  const cookie = mfaChallengeCookie({
    secure: false,
    answer: {
      challenge: CHALLENGE,
      challenge_expires_at: new Date(nowMs + 300_000).toISOString(),
    },
    next,
    nowMs,
  });
  jar.set(cookie!.name, cookie!.value);
}

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  data.set("csrf", "c1");
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

async function redirectOf(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (error) {
    if (error instanceof Redirected) return error.location;
    throw error;
  }
  throw new Error("expected a redirect");
}

function sessionAnswer() {
  const exp = Math.floor(Date.now() / 1000) + 600;
  return {
    access: fakeJwt({ exp, sid: "s1" }),
    access_expires_at: new Date(exp * 1000).toISOString(),
    refresh: "refresh-token",
    refresh_expires_at: new Date(Date.now() + 12 * 3_600_000).toISOString(),
    user: { language: "ru" },
  };
}

beforeEach(() => {
  delete process.env.GLOWDERMA_DATA_SOURCE;
  delete process.env.GLOWDERMA_MOCK_MFA;
  jar.clear();
  sets.length = 0;
  jar.set("gd_csrf", "c1");
  verifyStaff.mockReset();
  verifyStaff.mockResolvedValue({ ok: true, mode: "mock" });
  apiFetch.mockReset();
});

afterEach(() => {
  if (savedSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = savedSource;
  if (savedMockMfa === undefined) delete process.env.GLOWDERMA_MOCK_MFA;
  else process.env.GLOWDERMA_MOCK_MFA = savedMockMfa;
});

describe("verifyMfaStep (api)", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    plantChallenge();
  });

  it("opens the session like the password login, drops the challenge, lands on next", async () => {
    apiFetch.mockResolvedValue(respond(200, sessionAnswer()));
    const location = await redirectOf(
      verifyMfaStep(INITIAL, form({ factor: "totp", code: "123 456" })),
    );
    expect(location).toBe("/admin/orders?status=new");
    expect(location).not.toContain(CHALLENGE);
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/admin/auth/mfa/verify/", {
      method: "POST",
      body: { challenge: CHALLENGE, code: "123456" },
    });
    const names = sets.map((cookie) => cookie.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "gd_admin_access",
        "gd_admin_refresh",
        "gd_csrf",
        "gd_admin_language",
      ]),
    );
    expect(jar.has(mfaChallengeCookieName(false))).toBe(false);
    expect(jar.get("gd_admin_language")).toBe("ru");
  });

  it("sends a recovery code as recovery_code", async () => {
    apiFetch.mockResolvedValue(respond(200, sessionAnswer()));
    await redirectOf(verifyMfaStep(INITIAL, form({ factor: "recovery", code: "ABCDE-12345" })));
    expect(apiFetch.mock.calls[0]?.[1]).toEqual({
      method: "POST",
      body: { challenge: CHALLENGE, recovery_code: "ABCDE-12345" },
    });
  });

  it("keeps the challenge on a wrong code and says why on the field", async () => {
    apiFetch.mockRejectedValue(new ApiError(400, envelope("mfa_code_invalid", "Kod noto‘g‘ri.")));
    const state = await verifyMfaStep(INITIAL, form({ factor: "totp", code: "654321" }));
    expect(state).toMatchObject({ codeError: "Kod noto‘g‘ri.", formError: null, attempt: 1 });
    expect(jar.has(mfaChallengeCookieName(false))).toBe(true);
    expect(JSON.stringify(state)).not.toContain(CHALLENGE);
  });

  it("returns to the sign-in page with the notice when the challenge is dead", async () => {
    apiFetch.mockRejectedValue(
      new ApiError(400, envelope("mfa_challenge_invalid", "Muddati tugadi.")),
    );
    const location = await redirectOf(
      verifyMfaStep(INITIAL, form({ factor: "totp", code: "654321" })),
    );
    expect(location).toBe("/admin/login?next=%2Fadmin%2Forders%3Fstatus%3Dnew&notice=mfa_expired");
    expect(jar.has(mfaChallengeCookieName(false))).toBe(false);
  });

  it("shows the wait of a 429", async () => {
    apiFetch.mockRejectedValue(
      new ApiError(429, envelope("throttled", "Juda ko‘p."), { retryAfter: 120 }),
    );
    const state = await verifyMfaStep(INITIAL, form({ factor: "totp", code: "654321" }));
    expect(state.retryAfter).toBe(120);
    expect(state.formError).toContain("120");
  });

  it("refuses a malformed code before calling the API", async () => {
    const state = await verifyMfaStep(INITIAL, form({ factor: "totp", code: "12ab" }));
    expect(state.codeError).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("refuses a stale page (csrf) without touching the challenge", async () => {
    const data = form({ factor: "totp", code: "123456" });
    data.set("csrf", "other");
    const state = await verifyMfaStep(INITIAL, data);
    expect(state.formError).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
    expect(jar.has(mfaChallengeCookieName(false))).toBe(true);
  });

  it("goes back to the sign-in page when the cookie has expired", async () => {
    jar.delete(mfaChallengeCookieName(false));
    const location = await redirectOf(
      verifyMfaStep(
        INITIAL,
        form({ factor: "totp", code: "123456", fallbackNext: "/admin/staff" }),
      ),
    );
    expect(location).toBe("/admin/login?next=%2Fadmin%2Fstaff&notice=mfa_expired");
  });
});

describe("leaveMfaStep", () => {
  it("drops the challenge and keeps next", async () => {
    plantChallenge("/admin/payments");
    const location = await redirectOf(leaveMfaStep(form({})));
    expect(location).toBe("/admin/login?next=%2Fadmin%2Fpayments");
    expect(jar.has(mfaChallengeCookieName(false))).toBe(false);
  });

  it("adds the notice for the expired state and never leaves the panel", async () => {
    const location = await redirectOf(
      leaveMfaStep(form({ expired: "1", fallbackNext: "https://evil.example/" })),
    );
    expect(location).toBe("/admin/login?next=%2Fadmin&notice=mfa_expired");
  });
});

describe("verifyMfaStep (mock)", () => {
  beforeEach(() => plantChallenge("/admin"));

  it("accepts the demo code", async () => {
    expect(await redirectOf(verifyMfaStep(INITIAL, form({ factor: "totp", code: "123456" })))).toBe(
      "/admin",
    );
  });

  it("imitates a wrong code and the lockout", async () => {
    expect(
      (await verifyMfaStep(INITIAL, form({ factor: "totp", code: "111111" }))).codeError,
    ).toBeTruthy();
    const locked = await verifyMfaStep(INITIAL, form({ factor: "totp", code: "000000" }));
    expect(locked.retryAfter).toBe(30);
  });

  it("uses up a demo recovery code", async () => {
    process.env.GLOWDERMA_MOCK_MFA = "true";
    await redirectOf(verifyMfaStep(INITIAL, form({ factor: "recovery", code: "GDEMO-10004" })));
    expect(jar.get(MOCK_MFA_COOKIE)).toBe("on:2");
  });
});

describe("the Settings actions (mock)", () => {
  it("walks through enabling: password, code, ten codes, then on", async () => {
    expect(await startMfaSetup({ currentPassword: "wrong-one" }, "c1")).toMatchObject({
      ok: false,
      fieldErrors: { currentPassword: expect.any(String) },
    });
    const setup = await startMfaSetup({ currentPassword: "parol-12345678" }, "c1");
    expect(setup.ok && setup.data.otpauthUri).toMatch(/^otpauth:\/\/totp\/Glow%20Derma%20Admin%3A/);
    expect(await confirmMfaSetup({ deviceId: 1, code: "999999" }, "c1")).toMatchObject({
      ok: false,
      code: "mfa_code_invalid",
      fieldErrors: { code: expect.any(String) },
    });
    const confirmed = await confirmMfaSetup({ deviceId: 1, code: "123456" }, "c1");
    expect(confirmed.ok && confirmed.data.recoveryCodes).toHaveLength(10);
    expect(jar.get(MOCK_MFA_COOKIE)).toBe("on:10");
    expect(await startMfaSetup({ currentPassword: "parol-12345678" }, "c1")).toMatchObject({
      ok: false,
      code: "conflict",
    });
  });

  it("turns off with a recovery code and regenerates with a TOTP code", async () => {
    jar.set(MOCK_MFA_COOKIE, "on:3");
    const codes = await regenerateRecoveryCodes({ currentPassword: "x", code: "123456" }, "c1");
    expect(codes.ok && codes.data.recoveryCodes).toHaveLength(10);
    expect(await disableMfa({ currentPassword: "x", code: "nonsense" }, "c1")).toMatchObject({
      ok: false,
      fieldErrors: { code: expect.any(String) },
    });
    expect(await disableMfa({ currentPassword: "x", code: "gdemo-10001" }, "c1")).toEqual({
      ok: true,
      data: { enabled: false, recoveryCodesLeft: 0 },
    });
    expect(jar.get(MOCK_MFA_COOKIE)).toBe("off");
  });

  it("checks the csrf token first", async () => {
    verifyStaff.mockResolvedValue({ ok: false, reason: "csrf" });
    expect(await startMfaSetup({ currentPassword: "x" }, "bad")).toMatchObject({ code: "csrf" });
  });
});

describe("the Settings actions (api)", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: "s" });
  });

  it("maps a wrong password to the password field", async () => {
    apiFetch.mockRejectedValue(
      new ApiError(
        400,
        envelope("validation_error", "Maydonlarni tekshiring.", [
          {
            field: "current_password",
            code: "password_incorrect",
            message: "Joriy parol noto‘g‘ri.",
          },
        ]),
      ),
    );
    expect(await startMfaSetup({ currentPassword: "x" }, "c1")).toMatchObject({
      ok: false,
      fieldErrors: { currentPassword: "Joriy parol noto‘g‘ri." },
    });
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/admin/auth/mfa/setup/", {
      method: "POST",
      body: { current_password: "x" },
      token: "t",
    });
  });

  it("sends code_or_recovery and maps its error to the code field", async () => {
    apiFetch.mockRejectedValue(new ApiError(400, envelope("mfa_code_invalid", "Kod noto‘g‘ri.")));
    expect(await disableMfa({ currentPassword: "x", code: " 123 456 " }, "c1")).toMatchObject({
      fieldErrors: { code: "Kod noto‘g‘ri." },
    });
    expect(apiFetch.mock.calls[0]?.[1]).toMatchObject({
      body: { current_password: "x", code_or_recovery: "123456" },
    });
  });
});

describe("resetStaffMfa", () => {
  const withMfa = MOCK_STAFF_ACCOUNTS.find((row) => row.mfaEnabled)!;
  const withoutMfa = MOCK_STAFF_ACCOUNTS.find((row) => !row.mfaEnabled && row.id !== "1")!;

  it("imitates the backend's refusals and answers the row without MFA", async () => {
    expect(await resetStaffMfa("1", KEY, "c1")).toMatchObject({ ok: false, code: "conflict" });
    expect(await resetStaffMfa(withoutMfa.id, KEY, "c1")).toMatchObject({ code: "conflict" });
    expect(await resetStaffMfa(withMfa.id, KEY, "c1", withMfa, "telefon yo‘qolgan")).toEqual({
      ok: true,
      data: { ...withMfa, mfaEnabled: false },
    });
    expect(await resetStaffMfa(withMfa.id, "not-a-key", "c1")).toMatchObject({ ok: false });
    expect(await resetStaffMfa("../1", KEY, "c1")).toMatchObject({ code: "not_found" });
    expect(await resetStaffMfa(withMfa.id, KEY, "c1", undefined, "x".repeat(201))).toMatchObject({
      fieldErrors: { reason: expect.any(String) },
    });
  });

  it("posts with the Idempotency-Key and the reason (api)", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: "s" });
    apiFetch.mockResolvedValue(
      respond(200, {
        id: 7,
        email: "x@glowderma.uz",
        display_name: "X",
        full_name: "X",
        is_active: true,
        is_manager: false,
        linked_providers: [],
        mfa_enabled: false,
      }),
    );
    const result = await resetStaffMfa("7", KEY, "c1", undefined, "  telefon  ");
    expect(result).toMatchObject({ ok: true, data: { id: "7", mfaEnabled: false } });
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/admin/staff/7/reset-mfa/", {
      method: "POST",
      body: { reason: "telefon" },
      token: "t",
      idempotencyKey: KEY,
    });
  });
});

describe("the challenge cookie", () => {
  it("is HttpOnly, Strict, scoped to the step page and short-lived", () => {
    const nowMs = Date.parse("2026-11-17T10:00:00Z");
    const cookie = mfaChallengeCookie({
      secure: true,
      answer: { challenge: CHALLENGE, challenge_expires_at: "2026-11-17T10:05:00Z" },
      next: "/admin/staff",
      nowMs,
    });
    expect(cookie?.name).toBe("__Secure-gd_mfa_challenge");
    expect(cookie?.attributes).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/admin/mfa",
      maxAge: 300,
    });
    expect(openPendingMfa(cookie?.value, nowMs)).toEqual({
      challenge: CHALLENGE,
      expiresAtMs: Date.parse("2026-11-17T10:05:00Z"),
      next: "/admin/staff",
    });
  });
});
