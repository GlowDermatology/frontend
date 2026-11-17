import { createElement, type FC, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { cleanOtp } from "../auth/otp-input";
import { formatClock } from "../auth/countdown";
import { mfaSettingsCopy } from "./mfa-copy";
import { compactKey, otpauthAccount, recoveryCodesClipboard, recoveryCodesFile } from "./mfa-model";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => vi.fn() }));
vi.mock("@/data/mfa.actions", () => ({
  startMfaSetup: vi.fn(),
  confirmMfaSetup: vi.fn(),
  disableMfa: vi.fn(),
  regenerateRecoveryCodes: vi.fn(),
}));
vi.mock("@/data/mfa-step.actions", () => ({ verifyMfaStep: vi.fn(), leaveMfaStep: vi.fn() }));

const { MfaCard } = await import("./mfa-card");
const { RecoveryCodes } = await import("./recovery-codes");
const { MfaStepForm } = await import("../auth/mfa-step-form");
const LocaleProvider = AdminLocaleProvider as FC<{ locale: Locale; children?: ReactNode }>;

const inLocale = (locale: Locale, node: ReactNode) =>
  renderToStaticMarkup(createElement(LocaleProvider, { locale }, node));

const CODES = Array.from({ length: 10 }, (_, i) => `abcde-${10000 + i}`);

describe("the MFA card", () => {
  it("offers to turn it on while it is off", () => {
    const html = inLocale(
      "uz",
      createElement(MfaCard, {
        status: { enabled: false, recoveryCodesLeft: 0 },
        account: "a@b.uz",
      }),
    );
    expect(html).toContain("Ikki bosqichli himoya");
    expect(html).toContain("O‘chirilgan");
    expect(html).toContain("Yoqish");
    expect(html).not.toContain("Zaxira kodlar:");
  });

  it("shows the codes left and warns at three or fewer", () => {
    const fine = inLocale(
      "uz",
      createElement(MfaCard, { status: { enabled: true, recoveryCodesLeft: 8 }, account: null }),
    );
    expect(fine).toContain("Zaxira kodlar: 8 ta qoldi");
    expect(fine).not.toContain("kam qoldi");
    expect(fine).toContain("Yangi zaxira kodlar");
    expect(fine).toContain("O‘chirish");
    const low = inLocale(
      "uz",
      createElement(MfaCard, { status: { enabled: true, recoveryCodesLeft: 3 }, account: null }),
    );
    expect(low).toContain(mfaSettingsCopy.uz.codesLow);
    const none = inLocale(
      "uz",
      createElement(MfaCard, { status: { enabled: true, recoveryCodesLeft: 0 }, account: null }),
    );
    expect(none).toContain(mfaSettingsCopy.uz.codesNone);
  });

  it("offers nothing when the state is unknown", () => {
    const html = inLocale("uz", createElement(MfaCard, { status: null, account: null }));
    expect(html).toContain(mfaSettingsCopy.uz.unknown);
    expect(html).not.toContain(">Yoqish<");
  });

  it("speaks Russian and English", () => {
    const ru = inLocale(
      "ru",
      createElement(MfaCard, { status: { enabled: true, recoveryCodesLeft: 2 }, account: null }),
    );
    expect(ru).toContain("Двухэтапная защита");
    expect(ru).toContain("Резервных кодов осталось: 2");
    const en = inLocale(
      "en",
      createElement(MfaCard, { status: { enabled: true, recoveryCodesLeft: 1 }, account: null }),
    );
    expect(en).toContain("1 recovery code left");
    expect(en).toContain("Turn off");
  });
});

describe("the recovery codes", () => {
  it("lists the ten codes and asks for the «I saved them» confirmation", () => {
    const html = inLocale(
      "en",
      createElement(RecoveryCodes, {
        codes: CODES,
        account: "a@b.uz",
        saved: false,
        onSavedChange: () => undefined,
        needsConfirm: true,
      }),
    );
    expect(html.match(/<code /g)).toHaveLength(10);
    expect(html).toContain("Copy all");
    expect(html).toContain("Download (.txt)");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(mfaSettingsCopy.en.codes.mustConfirm);
  });

  it("writes a plain text file and a clipboard list", () => {
    const file = recoveryCodesFile(CODES, mfaSettingsCopy.uz.codes, "a@b.uz", "17.11.2026 10:00");
    expect(file.split("\r\n")).toEqual(
      expect.arrayContaining([
        "Glow Derma Admin — zaxira kodlar",
        "Hisob: a@b.uz",
        " 1. abcde-10000",
        "10. abcde-10009",
      ]),
    );
    expect(recoveryCodesClipboard(CODES.slice(0, 2))).toBe("abcde-10000\nabcde-10001");
  });
});

describe("the setup helpers", () => {
  it("reads the account from the otpauth URI and compacts the key", () => {
    expect(
      otpauthAccount(
        "otpauth://totp/Glow%20Derma%20Admin%3Aadmin%40glowderma.uz?secret=X&issuer=Glow%20Derma%20Admin",
      ),
    ).toBe("admin@glowderma.uz");
    expect(otpauthAccount("https://example.com")).toBeNull();
    expect(otpauthAccount("otpauth://totp/%E0%A4%A?x")).toBeNull();
    expect(compactKey("ABCD EFGH IJKL")).toBe("ABCDEFGHIJKL");
  });

  it("keeps a typed or pasted code clean", () => {
    expect(cleanOtp("totp", "12 34-56 78")).toBe("123456");
    expect(cleanOtp("recovery", "ABCDE 12345!")).toBe("abcde12345");
    expect(cleanOtp("either", "x".repeat(40))).toHaveLength(32);
  });

  it("formats the countdown", () => {
    expect(formatClock(300)).toBe("5:00");
    expect(formatClock(61.2)).toBe("1:02");
    expect(formatClock(9)).toBe("0:09");
    expect(formatClock(-4)).toBe("0:00");
  });
});

describe("the sign-in's second step", () => {
  const render = (locale: Locale, secondsLeft = 287) =>
    inLocale(
      locale,
      createElement(MfaStepForm, { csrf: "c1", secondsLeft, next: "/admin/orders", demo: false }),
    );

  it("asks for the app's code with a one-time-code input and a countdown", () => {
    const html = render("uz");
    // Attribute names are case-insensitive in HTML (React keeps these camel-cased).
    expect(html).toMatch(/autocomplete="one-time-code"/i);
    expect(html).toMatch(/inputmode="numeric"/i);
    expect(html).toContain("Kodni kiritish uchun 4:47 qoldi");
    expect(html).toContain("Zaxira kod bilan kirish");
    expect(html).toContain("Kirish sahifasiga qaytish");
    expect(html).toContain('name="fallbackNext" value="/admin/orders"');
    // The challenge is not part of the page.
    expect(html).not.toContain("challenge");
  });

  it("shows the expired state at 0:00", () => {
    const html = render("en", 0);
    expect(html).toContain("The sign-in has expired");
    expect(html).toContain('name="expired" value="1"');
    expect(html).not.toContain("one-time-code");
  });

  it("speaks Russian", () => {
    expect(render("ru")).toContain("Войти с резервным кодом");
  });
});
