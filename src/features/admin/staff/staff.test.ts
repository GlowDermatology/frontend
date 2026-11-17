import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  deliverySendsEmail,
  deliveryShowsPassword,
  inviteState,
  resendBlock,
  staffBadges,
  type StaffAccountRow,
} from "@/domain/staff";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import type { Locale } from "@/lib/i18n/locales";

import { allChecksMet, passwordChecks } from "../password/rules";
import { PasswordRules } from "../password/password-field";
import { staffCopy } from "./copy";
import { credentialsTitle } from "./credentials-dialog";
import { DeliveryChoice } from "./delivery-choice";
import { StaffBadges } from "./staff-badges";
import { defaultDelivery } from "./staff-dialogs";

/** DESIGN §E on the staff screen: row badges, the «Kirish usuli» choice, credentials, rules. */

const NOW = Date.parse("2026-10-24T12:00:00+05:00");

const row = (patch: Partial<StaffAccountRow> = {}): StaffAccountRow => ({
  id: "3",
  displayName: "Sardor Qodirov",
  email: "sardor@glowderma.uz",
  fullName: "Sardor Qodirov",
  isActive: true,
  isManager: false,
  lastLoginAt: null,
  linkedProviders: [],
  createdAt: null,
  mustChangePassword: false,
  passwordChangedAt: null,
  mfaEnabled: false,
  invite: null,
  ...patch,
});

const pending = { state: "pending" as const, sentAt: null, expiresAt: "2026-10-26T09:00:00+05:00" };

describe("staffBadges", () => {
  it("shows the password and MFA state of a row", () => {
    expect(staffBadges(row(), NOW)).toEqual([]);
    expect(staffBadges(row({ mustChangePassword: true }), NOW)).toEqual(["mustChange"]);
    expect(staffBadges(row({ mustChangePassword: true, invite: pending }), NOW)).toEqual([
      "invitePending",
    ]);
    expect(staffBadges(row({ mfaEnabled: true }), NOW)).toEqual(["mfa"]);
  });

  it("reads a pending link past its expiry as expired, and an inactive row has no password badge", () => {
    const late = Date.parse("2026-10-27T00:00:00+05:00");
    expect(inviteState(pending, late)).toBe("expired");
    expect(staffBadges(row({ mustChangePassword: true, invite: pending }), late)).toEqual([
      "inviteExpired",
    ]);
    // An expired link of an account that has set its password since is history, not a badge.
    expect(staffBadges(row({ invite: { ...pending, state: "expired" } }), NOW)).toEqual([]);
    expect(
      staffBadges(row({ isActive: false, mustChangePassword: true, mfaEnabled: true }), NOW),
    ).toEqual(["mfa"]);
  });
});

describe("delivery and resend rules", () => {
  it("knows which deliveries e-mail and which show a password", () => {
    expect(deliverySendsEmail("temporary_password")).toBe(false);
    expect(deliverySendsEmail("both")).toBe(true);
    expect(deliveryShowsPassword("email_link")).toBe(false);
    expect(deliveryShowsPassword("both")).toBe(true);
    expect(defaultDelivery(true)).toBe("both");
    expect(defaultDelivery(false)).toBe("temporary_password");
  });

  it("explains why a link cannot be resent", () => {
    expect(resendBlock(row(), "1", true)).toBeNull();
    expect(resendBlock(row({ id: "1" }), "1", true)).toBe("self");
    expect(resendBlock(row({ isActive: false }), "1", true)).toBe("inactive");
    expect(resendBlock(row(), "1", false)).toBe("emailUnavailable");
  });
});

describe("DeliveryChoice", () => {
  it("offers three radio cards in a labelled group", () => {
    const html = renderToStaticMarkup(
      createElement(DeliveryChoice, { value: "both", onChange: () => {}, emailInvite: true }),
    );
    expect(html).toContain("<legend");
    expect(html).toContain("Kirish usuli");
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html).toMatch(/checked="" value="both"/);
    expect(html).not.toContain("aria-disabled");
  });

  it("keeps the e-mail options reachable but refused with the reason when e-mail is off", () => {
    const html = renderToStaticMarkup(
      createElement(DeliveryChoice, {
        value: "temporary_password",
        onChange: () => {},
        emailInvite: false,
        error: "Kirish usulini tanlang.",
      }),
    );
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(html).toContain(staffCopy.uz.delivery.emailUnavailable);
    expect(html).toContain('data-field="delivery"');
    expect(html).toContain('data-invalid="true"');
    expect(html).toContain("Kirish usulini tanlang.");
  });

  it("speaks Russian and English", () => {
    for (const locale of ["ru", "en"] as const) {
      const html = renderToStaticMarkup(
        createElement(
          AdminLocaleProvider,
          { locale } as { locale: Locale; children: ReactNode },
          createElement(DeliveryChoice, { value: "both", onChange: () => {}, emailInvite: true }),
        ),
      );
      expect(html).toContain(staffCopy[locale].delivery.legend);
      expect(html).toContain(staffCopy[locale].delivery.options.email_link.label);
    }
  });
});

describe("StaffBadges", () => {
  it("names each badge and explains it to screen readers", () => {
    const html = renderToStaticMarkup(
      createElement(StaffBadges, {
        row: row({ mustChangePassword: true, invite: pending, mfaEnabled: true }),
        nowMs: NOW,
      }),
    );
    expect(html).toContain("Havola yuborilgan");
    expect(html).toContain("MFA yoqilgan");
    expect(html).toContain('data-badge="invitePending"');
    expect(html).toMatch(/gacha amal qiladi/);
    expect(renderToStaticMarkup(createElement(StaffBadges, { row: row(), nowMs: NOW }))).toBe("");
  });
});

describe("credentialsTitle", () => {
  const t = staffCopy.uz.credentials;
  const data = { staff: row(), temporaryPassword: "Ab2c-De3f-Gh4j-Km5n", activation: null };
  it("names what happened", () => {
    expect(credentialsTitle({ kind: "invited", data }, t)).toBe("Xodim qo‘shildi");
    expect(credentialsTitle({ kind: "reset", data }, t)).toBe("Yangi vaqtinchalik parol");
    expect(credentialsTitle({ kind: "reset", data: { ...data, temporaryPassword: null } }, t)).toBe(
      "Parol tiklandi",
    );
    expect(credentialsTitle({ kind: "resent", data }, t)).toBe("Havola yuborildi");
  });
});

describe("password rules", () => {
  it("checks length, digits-only and the confirmation", () => {
    expect(passwordChecks("", "", 12)).toEqual({
      length: false,
      notNumeric: false,
      matches: false,
    });
    expect(passwordChecks("123456789012", "123456789012", 12)).toEqual({
      length: true,
      notNumeric: false,
      matches: true,
    });
    const good = passwordChecks("osmon-gullari", "osmon-gullari", 12);
    expect(allChecksMet(good)).toBe(true);
    expect(allChecksMet(passwordChecks("osmon-gullari", "osmon", 12))).toBe(false);
  });

  it("reads out each rule with its state", () => {
    const html = renderToStaticMarkup(
      createElement(PasswordRules, {
        checks: { length: true, notNumeric: false, matches: false },
        min: 12,
      }),
    );
    expect(html).toContain("Kamida 12 ta belgi");
    expect(html).toContain("— bajarildi");
    expect(html.match(/— bajarilmagan/g)).toHaveLength(2);
    expect(html).toContain('data-met="true"');
  });
});
