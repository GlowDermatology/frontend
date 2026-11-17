import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * The own-password flows of DESIGN §E: the forced change (`changeOwnPassword`), the self link
 * (`requestOwnPasswordLink`), the e-mailed link's check (`checkPasswordLink`) and set
 * (`setPasswordWithLink`), in both modes, plus the token cookie helpers the proxy uses.
 */

const jar = vi.hoisted(() => new Map<string, string>());
const sets = vi.hoisted(() => [] as Array<{ name: string; value: string; options: unknown }>);
const verifyStaff = vi.fn<(options?: VerifyStaffOptions) => Promise<StaffSession>>();
const apiFetch = vi.fn();

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
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
  MOCK_PASSWORD_SET_COOKIE: "gd_mock_password_set",
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
import {
  clearPasswordTokenCookie,
  isPasswordToken,
  passwordTokenCookie,
  tokenFromSearch,
} from "./auth/password-token";
import { checkPasswordLink, mockPasswordLink } from "./password";
import { changeOwnPassword, requestOwnPasswordLink, setPasswordWithLink } from "./password.actions";

const TOKEN = "Zx8".repeat(14) + "q";
const GOOD = { newPassword: "osmon-gullari-2026", confirmPassword: "osmon-gullari-2026" };
const savedSource = process.env.GLOWDERMA_DATA_SOURCE;
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
const envelope = (code: string, message: string, errors: ErrorEnvelope["errors"] = []) =>
  ({ code, message, errors, request_id: "r" }) as ErrorEnvelope;

beforeEach(() => {
  delete process.env.GLOWDERMA_DATA_SOURCE;
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
});

describe("the token cookie", () => {
  it("accepts only base64url tokens of a sane length", () => {
    expect(isPasswordToken(TOKEN)).toBe(true);
    expect(isPasswordToken("short")).toBe(false);
    expect(isPasswordToken("a".repeat(129))).toBe(false);
    expect(isPasswordToken("a".repeat(20) + "/")).toBe(false);
    expect(tokenFromSearch(`?token=${TOKEN}&x=1`)).toBe(TOKEN);
    expect(tokenFromSearch("?token=<script>")).toBe("");
    expect(tokenFromSearch("?other=1")).toBeNull();
  });

  it("is HttpOnly, Lax and scoped to the page", () => {
    expect(passwordTokenCookie({ secure: true, token: TOKEN })).toEqual({
      name: "__Secure-gd_password_token",
      value: TOKEN,
      attributes: {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/admin/set-password",
        maxAge: 7200,
      },
    });
    const sink = { set: vi.fn() };
    clearPasswordTokenCookie(sink, false);
    expect(sink.set).toHaveBeenCalledWith(
      "gd_password_token",
      "",
      expect.objectContaining({ maxAge: 0, path: "/admin/set-password" }),
    );
  });
});

describe("checkPasswordLink", () => {
  it("is missing without the cookie and imitates the backend in mock mode", async () => {
    expect(await checkPasswordLink()).toEqual({ ok: false, reason: "missing" });
    jar.set("gd_password_token", TOKEN);
    expect(await checkPasswordLink()).toMatchObject({ ok: true, info: { purpose: "invite" } });
    expect(mockPasswordLink(`expired${TOKEN}`)).toEqual({ ok: false, reason: "invalid" });
    expect(mockPasswordLink(`reset${TOKEN}`)).toMatchObject({ info: { purpose: "reset" } });
  });

  it("asks the backend in api mode and maps its refusals", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    jar.set("gd_password_token", TOKEN);
    apiFetch.mockResolvedValueOnce(
      respond(200, {
        email_masked: "n***@glowderma.uz",
        full_name: "Nodira",
        purpose: "reset",
        expires_at: "2026-10-30T10:00:00+05:00",
      }),
    );
    expect(await checkPasswordLink()).toEqual({
      ok: true,
      info: {
        emailMasked: "n***@glowderma.uz",
        fullName: "Nodira",
        purpose: "reset",
        expiresAt: "2026-10-30T10:00:00+05:00",
      },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/auth/password-token/check/",
      expect.objectContaining({ method: "POST", body: { token: TOKEN } }),
    );
    apiFetch.mockRejectedValueOnce(new ApiError(400, envelope("token_invalid", "Havola yaroqsiz")));
    expect(await checkPasswordLink()).toEqual({ ok: false, reason: "invalid" });
    apiFetch.mockRejectedValueOnce(new ApiError(429, envelope("throttled", "x")));
    expect(await checkPasswordLink()).toEqual({ ok: false, reason: "throttled" });
    apiFetch.mockRejectedValueOnce(new ApiError(503, envelope("unavailable", "x")));
    expect(await checkPasswordLink()).toEqual({ ok: false, reason: "unreachable" });
  });
});

describe("setPasswordWithLink", () => {
  it("needs the double-submit token and the stored link", async () => {
    expect(await setPasswordWithLink(GOOD, "wrong")).toMatchObject({ ok: false, code: "csrf" });
    expect(await setPasswordWithLink(GOOD, "c1")).toMatchObject({
      ok: false,
      code: "token_invalid",
      error: "Havola yaroqsiz yoki muddati o‘tgan. Menejerdan yangi havola so‘rang.",
    });
  });

  it("validates both fields in the admin language before anything is sent", async () => {
    jar.set("gd_password_token", TOKEN);
    jar.set("gd_admin_language", "en");
    expect(
      await setPasswordWithLink({ newPassword: "short", confirmPassword: "other" }, "c1"),
    ).toMatchObject({
      ok: false,
      fieldErrors: {
        newPassword: "At least 12 characters.",
        confirmPassword: "The passwords do not match.",
      },
    });
  });

  it("sets the password in the demo and forgets the token", async () => {
    jar.set("gd_password_token", TOKEN);
    expect(await setPasswordWithLink(GOOD, "c1")).toEqual({ ok: true, data: { done: true } });
    expect(jar.has("gd_password_token")).toBe(false);
  });

  it("posts token + password in api mode; keeps the link on a weak password, drops it when invalid", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    jar.set("gd_password_token", TOKEN);
    apiFetch.mockRejectedValueOnce(
      new ApiError(
        400,
        envelope("validation_error", "Maydonlarni tekshiring.", [
          { field: "new_password", code: "password_too_common", message: "Juda oddiy parol." },
        ]),
      ),
    );
    expect(await setPasswordWithLink(GOOD, "c1")).toMatchObject({
      ok: false,
      fieldErrors: { newPassword: "Juda oddiy parol." },
    });
    expect(jar.has("gd_password_token")).toBe(true);
    apiFetch.mockRejectedValueOnce(new ApiError(400, envelope("token_invalid", "Havola yaroqsiz")));
    expect(await setPasswordWithLink(GOOD, "c1")).toMatchObject({ code: "token_invalid" });
    expect(jar.has("gd_password_token")).toBe(false);
    jar.set("gd_password_token", TOKEN);
    apiFetch.mockResolvedValueOnce(respond(204, undefined));
    expect(await setPasswordWithLink(GOOD, "c1")).toEqual({ ok: true, data: { done: true } });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/auth/password-token/set/",
      expect.objectContaining({ body: { token: TOKEN, new_password: GOOD.newPassword } }),
    );
  });
});

describe("changeOwnPassword / requestOwnPasswordLink", () => {
  const values = { currentPassword: "Kp7m-Qx3r-Wt9z-Hn2v", ...GOOD };

  it("continues to a safe next and ends the demo gate in this browser", async () => {
    expect(await changeOwnPassword(values, "/admin/orders?status=new", "c1")).toEqual({
      ok: true,
      data: { next: "/admin/orders?status=new" },
    });
    expect(sets.find((s) => s.name === "gd_mock_password_set")).toMatchObject({
      value: "1",
      options: expect.objectContaining({ httpOnly: true, path: "/admin" }),
    });
    expect(await changeOwnPassword(values, "/admin/change-password", "c1")).toMatchObject({
      data: { next: "/admin" },
    });
    expect(await changeOwnPassword(values, "https://evil.example", "c1")).toMatchObject({
      data: { next: "/admin" },
    });
    expect(
      await changeOwnPassword({ ...values, newPassword: values.currentPassword }, "/admin", "c1"),
    ).toMatchObject({ ok: false, fieldErrors: { confirmPassword: "Parollar mos emas." } });
  });

  it("posts the change in api mode and shows the backend's field errors", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockResolvedValueOnce(respond(204, undefined));
    expect(await changeOwnPassword(values, "/admin/staff", "c1")).toMatchObject({ ok: true });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/auth/change-password/",
      expect.objectContaining({
        body: { current_password: values.currentPassword, new_password: GOOD.newPassword },
        token: "t",
      }),
    );
    apiFetch.mockRejectedValueOnce(
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
    expect(await changeOwnPassword(values, "/admin", "c1")).toMatchObject({
      fieldErrors: { currentPassword: "Joriy parol noto‘g‘ri." },
    });
  });

  it("e-mails the caller a link (demo) or answers the backend's refusal", async () => {
    expect(await requestOwnPasswordLink("c1")).toMatchObject({
      ok: true,
      data: { emailMasked: expect.stringContaining("***@"), demo: true },
    });
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    apiFetch.mockResolvedValueOnce(
      respond(200, {
        email_masked: "o***@glowderma.uz",
        activation: { sent: true, expires_at: "2026-10-30T10:00:00+05:00" },
      }),
    );
    expect(await requestOwnPasswordLink("c1")).toEqual({
      ok: true,
      data: { emailMasked: "o***@glowderma.uz", expiresAt: "2026-10-30T10:00:00+05:00" },
    });
    apiFetch.mockRejectedValueOnce(
      new ApiError(409, envelope("conflict", "E-pochta orqali yuborish sozlanmagan.")),
    );
    expect(await requestOwnPasswordLink("c1")).toEqual({
      ok: false,
      error: "E-pochta orqali yuborish sozlanmagan.",
      code: "conflict",
    });
  });
});
