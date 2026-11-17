import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * The admin language switch (DESIGN §G): `PATCH auth/me/ {language}` in api mode, then the
 * `gd_admin_language` cookie and a refresh; mock mode only sets the cookie. The Settings card is
 * checked as static markup in each language.
 */

const verifyStaff = vi.fn<(options?: VerifyStaffOptions) => Promise<StaffSession>>();
const refresh = vi.fn();
const apiFetch = vi.fn();
const cookieSet = vi.fn();
let cookieValue: string | undefined;

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookieValue ? { value: cookieValue } : undefined),
    set: (...args: unknown[]) => cookieSet(...args),
  }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./auth", () => ({
  verifyStaff: (options?: VerifyStaffOptions) => verifyStaff(options),
  getMe: async () => null,
}));
vi.mock("./api/client", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }));

import { ApiError } from "./api/errors";
import { chooseSignInLanguage, saveAdminLanguage } from "./admin-language.actions";

const CSRF = "csrf-token";
const originalSource = process.env.GLOWDERMA_DATA_SOURCE;

beforeEach(() => {
  delete process.env.GLOWDERMA_DATA_SOURCE;
  verifyStaff.mockReset();
  verifyStaff.mockResolvedValue({ ok: true, mode: "mock" } as StaffSession);
  refresh.mockClear();
  apiFetch.mockReset();
  cookieSet.mockClear();
  cookieValue = undefined;
});

afterEach(() => {
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
});

describe("saveAdminLanguage", () => {
  it("mock mode: sets the cookie and refreshes, nothing is sent", async () => {
    expect(await saveAdminLanguage("ru", CSRF)).toEqual({ ok: true, data: { language: "ru" } });
    expect(apiFetch).not.toHaveBeenCalled();
    expect(cookieSet).toHaveBeenCalledWith(
      "gd_admin_language",
      "ru",
      expect.objectContaining({ path: "/admin", httpOnly: false, sameSite: "lax" }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("api mode: saves on the account first, in the new language", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "tok" } as StaffSession);
    apiFetch.mockResolvedValue({ status: 200, data: {}, headers: new Headers() });
    expect(await saveAdminLanguage("en", CSRF)).toMatchObject({ ok: true });
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/admin/auth/me/", {
      method: "PATCH",
      body: { language: "en" },
      token: "tok",
      locale: "en",
    });
    expect(cookieSet).toHaveBeenCalledWith("gd_admin_language", "en", expect.anything());
  });

  it("api mode: a refused PATCH leaves the cookie alone", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "tok" } as StaffSession);
    apiFetch.mockRejectedValue(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "language", code: "invalid_choice", message: "Noto‘g‘ri qiymat." }],
        request_id: "r",
      }),
    );
    const result = await saveAdminLanguage("ru", CSRF);
    expect(result).toMatchObject({ ok: false, fieldErrors: { language: "Noto‘g‘ri qiymat." } });
    expect(cookieSet).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses an unknown language in the current language, and a missing csrf", async () => {
    cookieValue = "en";
    expect(await saveAdminLanguage("de", CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { language: "Value not allowed." },
    });
    expect(await saveAdminLanguage("ru", "")).toMatchObject({ ok: false, code: "csrf" });
    expect(cookieSet).not.toHaveBeenCalled();
  });
});

describe("chooseSignInLanguage", () => {
  it("sets the cookie only for a known language", async () => {
    expect(await chooseSignInLanguage("en")).toEqual({ language: "en" });
    expect(cookieSet).toHaveBeenCalledTimes(1);
    cookieValue = "ru";
    expect(await chooseSignInLanguage("xx")).toEqual({ language: "ru" });
    expect(cookieSet).toHaveBeenCalledTimes(1);
  });
});

describe("LanguageCard", () => {
  it("renders the three languages with the current one checked, in the panel language", async () => {
    const { LanguageCard } = await import("@/features/admin/settings/language-card");
    const { ToastProvider } = await import("@/components/ui/toast");
    const { AdminLocaleProvider } = await import("@/lib/i18n/admin-context");
    const LocaleProvider = AdminLocaleProvider as FC<{ locale: "ru"; children?: ReactNode }>;
    const Toasts = ToastProvider as FC<{ children?: ReactNode }>;
    const html = renderToStaticMarkup(
      createElement(
        LocaleProvider,
        { locale: "ru" },
        createElement(Toasts, null, createElement(LanguageCard)),
      ),
    );
    expect(html).toContain("Язык интерфейса");
    expect(html).toContain('lang="uz"');
    expect(html).toContain("O‘zbekcha");
    expect(html).toContain("Узбекский");
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html).toMatch(/checked="" value="ru"/);
    // Nothing to save yet: the button stays focusable and says why.
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("Этот язык уже используется.");
  });
});
