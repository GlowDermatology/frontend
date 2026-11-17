import { runInNewContext } from "node:vm";

import { describe, expect, it, vi } from "vitest";

import {
  ADMIN_LOCALE_COOKIE,
  HTML_LANG_SCRIPT,
  adminLocaleCookie,
  adminLocaleFromCookieHeader,
  applyAdminLocaleCookie,
  knownAdminLocale,
  parseAdminLocale,
  staffLanguage,
} from "./admin-locale-cookie";

describe("admin locale cookie", () => {
  it("parses a value, falling back to Uzbek", () => {
    expect(parseAdminLocale("ru")).toBe("ru");
    expect(parseAdminLocale(" EN ")).toBe("en");
    expect(parseAdminLocale("de")).toBe("uz");
    expect(parseAdminLocale(undefined)).toBe("uz");
    expect(knownAdminLocale("ru")).toBe("ru");
    expect(knownAdminLocale("de")).toBeNull();
    expect(knownAdminLocale(3)).toBeNull();
  });

  it("reads the cookie from a Cookie header", () => {
    expect(adminLocaleFromCookieHeader("gd_csrf=x; gd_admin_language=en; other=1")).toBe("en");
    expect(adminLocaleFromCookieHeader("gd_admin_language=ru")).toBe("ru");
    expect(adminLocaleFromCookieHeader("xgd_admin_language=ru")).toBe("uz");
    expect(adminLocaleFromCookieHeader("gd_admin_language=%E0")).toBe("uz");
    expect(adminLocaleFromCookieHeader(null)).toBe("uz");
  });

  it("builds the Set-Cookie of a choice: /admin, one year, readable by the head script", () => {
    expect(adminLocaleCookie("ru", true)).toEqual({
      name: ADMIN_LOCALE_COOKIE,
      value: "ru",
      attributes: {
        httpOnly: false,
        secure: true,
        sameSite: "lax",
        path: "/admin",
        maxAge: 31_536_000,
      },
    });
    const set = vi.fn();
    applyAdminLocaleCookie({ set }, "en", false);
    expect(set).toHaveBeenCalledWith(
      "gd_admin_language",
      "en",
      expect.objectContaining({ secure: false }),
    );
  });

  it("takes the saved language from a login answer only when it is known", () => {
    expect(staffLanguage({ id: 1, language: "en" })).toBe("en");
    expect(staffLanguage({ id: 1 })).toBeNull();
    expect(staffLanguage({ language: "fr" })).toBeNull();
    expect(staffLanguage(null)).toBeNull();
  });

  it("sets <html lang> from the cookie in the head script, and only to a known language", () => {
    const run = (cookie: string) => {
      const documentElement = { lang: "uz" };
      runInNewContext(HTML_LANG_SCRIPT, { document: { cookie, documentElement } });
      return documentElement.lang;
    };
    expect(run("a=1; gd_admin_language=ru; b=2")).toBe("ru");
    expect(run("gd_admin_language=en")).toBe("en");
    expect(run("gd_admin_language=xx")).toBe("uz");
    expect(run("gd_admin_language=ruby")).toBe("uz");
    expect(run("")).toBe("uz");
  });
});
