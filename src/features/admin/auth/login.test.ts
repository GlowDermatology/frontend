import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AuthLanguageMenu } from "@/components/brand/auth-language-menu";

import { staffAuthCopy } from "./copy";
import { hasLoginErrors, validateLogin } from "./login-validation";
import { ProviderMark } from "./provider-mark";

vi.mock("@/data/admin-language.actions", () => ({ chooseSignInLanguage: vi.fn() }));

const { StaffAuthCardSkeleton } = await import("./staff-auth-frame");

describe("validateLogin", () => {
  const m = staffAuthCopy.uz.errors;

  it("asks for both fields", () => {
    expect(validateLogin("", "", m)).toEqual({
      email: m.emailRequired,
      password: m.passwordRequired,
    });
    expect(validateLogin("   ", "x", m)).toEqual({ email: m.emailRequired });
  });

  it("checks the email's shape", () => {
    expect(validateLogin("admin", "x", m)).toEqual({ email: m.emailInvalid });
    expect(validateLogin("a@b", "x", m)).toEqual({ email: m.emailInvalid });
    expect(validateLogin(`${"a".repeat(250)}@b.uz`, "x", m)).toEqual({ email: m.emailInvalid });
    expect(validateLogin(" admin@glowderma.uz ", "secret", m)).toEqual({});
  });

  it("reports whether anything blocks the post", () => {
    expect(hasLoginErrors({})).toBe(false);
    expect(hasLoginErrors({ password: "x" })).toBe(true);
  });

  it("speaks the page's language", () => {
    expect(validateLogin("", "", staffAuthCopy.en.errors).email).toBe("Enter your email.");
    expect(validateLogin("", "", staffAuthCopy.ru.errors).password).toBe("Введите пароль.");
  });
});

describe("staff sign-in copy", () => {
  it("keeps the e2e-visible Uzbek labels", () => {
    expect(staffAuthCopy.uz.form.email).toBe("Email");
    expect(staffAuthCopy.uz.form.password).toBe("Parol");
    expect(staffAuthCopy.uz.form.fakeProvider("Google")).toBe("Google orqali kirish (sinov)");
  });

  it("words the throttling message with and without a wait", () => {
    expect(staffAuthCopy.uz.errors.throttledFor(30)).toContain("30 soniyadan");
    expect(staffAuthCopy.en.errors.throttledFor(30)).toContain("30 seconds");
  });
});

describe("AuthLanguageMenu", () => {
  it("shows one compact trigger with the current language", () => {
    const html = renderToStaticMarkup(
      createElement(AuthLanguageMenu, { current: "ru", label: "Язык интерфейса", choose: vi.fn() }),
    );
    expect(html).toContain('aria-label="Язык интерфейса"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html.match(/<button /g)).toHaveLength(1);
    expect(html).toContain('title="Русский"');
  });
});

describe("StaffAuthCardSkeleton", () => {
  it("holds the brand row's language pill and theme circle at their sizes", () => {
    const html = renderToStaticMarkup(createElement(StaffAuthCardSkeleton));
    expect(html).toContain("h-[38px] w-[76px]");
    expect(html).toContain("size-[38px] rounded-full");
  });
});

describe("ProviderMark", () => {
  it("is decorative", () => {
    for (const provider of ["google", "facebook"] as const) {
      expect(renderToStaticMarkup(createElement(ProviderMark, { provider }))).toMatch(
        /^<svg aria-hidden="true" focusable="false"/,
      );
    }
  });
});
