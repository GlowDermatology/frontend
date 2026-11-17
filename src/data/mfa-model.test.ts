import { describe, expect, it } from "vitest";

import { mfaDataCopy } from "@/domain/copy/mfa";
import { LOW_RECOVERY_CODES, recoveryCodesLow } from "@/domain/settings";

import { ApiError } from "./api/errors";
import type { ErrorEnvelope } from "./api/types";
import { mfaFailure, mfaStepRefusal } from "./mfa-errors";
import {
  factorOf,
  isRecoveryCode,
  isTotpCode,
  mfaSchemas,
  normalizeRecovery,
  normalizeTotp,
} from "./mfa.schema";
import {
  groupKey,
  isMockRecoveryCode,
  isWrongMockPassword,
  mockOtpauthUri,
  mockResetStaffMfa,
  readMockMfaState,
} from "./mock/mfa";
import { MOCK_STAFF_ACCOUNTS } from "./mock/staff";

const m = mfaDataCopy.uz;
const envelope = (code: string, message: string, errors: ErrorEnvelope["errors"] = []) =>
  ({ code, message, errors, request_id: "r" }) as ErrorEnvelope;

describe("codes", () => {
  it("normalises what people type or paste", () => {
    expect(normalizeTotp("123 456")).toBe("123456");
    expect(isTotpCode("123-456")).toBe(true);
    expect(isTotpCode("12345")).toBe(false);
    expect(normalizeRecovery(" ABCDE-12345 ")).toBe("abcde12345");
    expect(isRecoveryCode("abcde-12345")).toBe(true);
    expect(isRecoveryCode("abcde-1234")).toBe(false);
    expect(isRecoveryCode(`abcde-12345${" ".repeat(30)}x`)).toBe(false);
    expect(factorOf("123456")).toBe("totp");
    expect(factorOf("abcde-12345")).toBe("recovery");
  });

  it("validates in every admin language with the contract's lengths", () => {
    for (const locale of ["uz", "ru", "en"] as const) {
      const schemas = mfaSchemas[locale];
      expect(schemas.setup.safeParse({ currentPassword: "" }).success).toBe(false);
      expect(schemas.setup.safeParse({ currentPassword: "x".repeat(129) }).success).toBe(false);
      expect(schemas.confirm.safeParse({ deviceId: 0, code: "123456" }).success).toBe(false);
      expect(schemas.confirm.safeParse({ deviceId: 3, code: "123 456" })).toMatchObject({
        success: true,
        data: { deviceId: 3, code: "123456" },
      });
      expect(schemas.disable.safeParse({ currentPassword: "p", code: "zzz" }).success).toBe(false);
      expect(
        schemas.disable.safeParse({ currentPassword: "p", code: "ABCDE-12345" }),
      ).toMatchObject({
        success: true,
        data: { code: "ABCDE-12345" },
      });
      expect(
        schemas.regenerate.safeParse({ currentPassword: "p", code: "abcde-12345" }).success,
      ).toBe(false);
      expect(schemas.verify.safeParse({ factor: "recovery", code: "abcde12345" }).success).toBe(
        true,
      );
      expect(schemas.verify.safeParse({ factor: "totp", code: "abcde12345" }).success).toBe(false);
      expect(schemas.reset.safeParse({ reason: "x".repeat(201) }).success).toBe(false);
    }
    const ru = mfaSchemas.ru.confirm.safeParse({ deviceId: 1, code: "12" });
    expect(ru.success ? "" : ru.error.issues[0]?.message).toBe(mfaDataCopy.ru.codeFormat);
  });
});

describe("mfaFailure", () => {
  it("puts a wrong code on the code field and a wrong password on the password field", () => {
    expect(mfaFailure(new ApiError(400, envelope("mfa_code_invalid", "Kod xato.")), m)).toEqual({
      ok: false,
      error: "Kod xato.",
      code: "mfa_code_invalid",
      fieldErrors: { code: "Kod xato." },
    });
    const password = mfaFailure(
      new ApiError(
        400,
        envelope("validation_error", "x", [
          { field: "current_password", code: "password_incorrect", message: "Parol xato." },
          { field: "code_or_recovery", code: "max_length", message: "Uzun." },
        ]),
      ),
      m,
    );
    expect(password).toMatchObject({
      error: m.checkFields,
      fieldErrors: { currentPassword: "Parol xato.", code: "Uzun." },
    });
  });

  it("names the wait of a 429, keeps a 409's message and reports outages", () => {
    expect(
      mfaFailure(new ApiError(429, envelope("throttled", "x"), { retryAfter: 60 }), m),
    ).toEqual({ ok: false, error: m.throttledFor(60), code: "throttled", retryAfter: 60 });
    expect(mfaFailure(new ApiError(409, envelope("conflict", "Allaqachon.")), m)).toMatchObject({
      error: "Allaqachon.",
      code: "conflict",
    });
    expect(mfaFailure(new ApiError(0, envelope("network_error", "x")), m).error).toBe(
      m.unreachable,
    );
    expect(mfaFailure(new ApiError(502, envelope("http_502", "x")), m).error).toBe(m.unreachable);
  });
});

describe("mfaStepRefusal", () => {
  it("tells a wrong code from a dead challenge", () => {
    expect(mfaStepRefusal(new ApiError(400, envelope("mfa_code_invalid", "Xato.")), m)).toEqual({
      kind: "code",
      message: "Xato.",
    });
    expect(mfaStepRefusal(new ApiError(400, envelope("mfa_challenge_invalid", "x")), m)).toEqual({
      kind: "challenge",
    });
    expect(
      mfaStepRefusal(
        new ApiError(
          400,
          envelope("validation_error", "x", [
            { field: "challenge", code: "max_length", message: "x" },
          ]),
        ),
        m,
      ),
    ).toEqual({ kind: "challenge" });
    expect(
      mfaStepRefusal(new ApiError(429, envelope("throttled", "x"), { retryAfter: 8 }), m),
    ).toEqual({ kind: "throttled", message: m.throttledFor(8), retryAfter: 8 });
    expect(mfaStepRefusal(new Error("boom"), m)).toEqual({ kind: "form", message: m.unreachable });
  });
});

describe("the demo MFA", () => {
  it("reads its state from the cookie, else from GLOWDERMA_MOCK_MFA", () => {
    expect(readMockMfaState(undefined, false)).toEqual({ enabled: false, recoveryCodesLeft: 0 });
    expect(readMockMfaState(undefined, true)).toEqual({ enabled: true, recoveryCodesLeft: 3 });
    expect(readMockMfaState("off", true)).toEqual({ enabled: false, recoveryCodesLeft: 0 });
    expect(readMockMfaState("on:7", false)).toEqual({ enabled: true, recoveryCodesLeft: 7 });
    expect(readMockMfaState("on:99", false).recoveryCodesLeft).toBe(10);
    expect(readMockMfaState("garbage", false).enabled).toBe(false);
  });

  it("has deterministic codes, key and refusals", () => {
    expect(isMockRecoveryCode("GDEMO-10010")).toBe(true);
    expect(isMockRecoveryCode("gdemo-10011")).toBe(false);
    expect(isWrongMockPassword("Wrong password")).toBe(true);
    expect(groupKey("ABCDEFGHIJ")).toBe("ABCD EFGH IJ");
    expect(mockOtpauthUri("admin")).toContain("issuer=Glow%20Derma%20Admin");
    const withMfa = MOCK_STAFF_ACCOUNTS.find((row) => row.mfaEnabled)!;
    expect(mockResetStaffMfa(withMfa, withMfa.id)).toEqual({ ok: false, reason: "self" });
    expect(mockResetStaffMfa(null, "1")).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("the low-codes warning", () => {
  it("starts at three codes left, only while MFA is on", () => {
    expect(LOW_RECOVERY_CODES).toBe(3);
    expect(recoveryCodesLow({ enabled: true, recoveryCodesLeft: 3 })).toBe(true);
    expect(recoveryCodesLow({ enabled: true, recoveryCodesLeft: 4 })).toBe(false);
    expect(recoveryCodesLow({ enabled: false, recoveryCodesLeft: 0 })).toBe(false);
  });
});
