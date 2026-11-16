import { describe, expect, it } from "vitest";

import type { ActionFailure } from "@/data/types";

import {
  cancelOutcome,
  confirmReturnRefusal,
  DISPATCH_REFUSAL_MESSAGE,
  dispatchRefusal,
  rememberMethodRefusal,
} from "./carrier-refusals";

const fail = (code: string, error = "server text", fieldErrors?: Record<string, string>) =>
  ({ ok: false, code, error, ...(fieldErrors ? { fieldErrors } : {}) }) satisfies ActionFailure;

describe("dispatchRefusal (every documented code of POST orders/{id}/dispatch/)", () => {
  it("keeps field errors on the dialog's fields", () => {
    expect(
      dispatchRefusal(fail("validation_error", "x", { weightG: "20 000 g dan oshmasin." })),
    ).toEqual({ kind: "field", field: "weight", message: "20 000 g dan oshmasin." });
    expect(
      dispatchRefusal(
        fail("validation_error", "x", {
          contentsVerified: "Jo‘natma tarkibini tekshirganingizni tasdiqlang.",
        }),
      ),
    ).toMatchObject({ kind: "field", field: "contents" });
    expect(
      dispatchRefusal(fail("validation_error", "x", { approvedPrice: "Noto‘g‘ri qiymat." })),
    ).toEqual({ kind: "retry", message: "Noto‘g‘ri qiymat." });
  });

  it("closes and re-reads on a changed order", () => {
    for (const code of ["invalid_transition", "conflict", "not_found"]) {
      const refusal = dispatchRefusal(fail(code));
      expect(refusal.kind).toBe("stale");
    }
    expect(dispatchRefusal(fail("conflict"))).toMatchObject({
      message: DISPATCH_REFUSAL_MESSAGE.conflict,
    });
  });

  it("keeps pin, method and weight refusals in the dialog with Uzbek texts", () => {
    for (const code of ["coordinates_required", "method_disabled", "too_heavy"]) {
      expect(dispatchRefusal(fail(code))).toEqual({
        kind: "blocked",
        code,
        message: DISPATCH_REFUSAL_MESSAGE[code],
        reload: false,
      });
    }
    expect(DISPATCH_REFUSAL_MESSAGE.coordinates_required).toContain("xaritadagi nuqtasi");
  });

  it("re-reads the order on a warehouse-calendar refusal", () => {
    for (const code of [
      "suspended",
      "closed",
      "after_cutoff",
      "returns_unavailable",
      "not_configured",
    ]) {
      const refusal = dispatchRefusal(fail(code));
      expect(refusal).toMatchObject({ kind: "blocked", code, reload: true });
      expect(refusal.kind === "blocked" && refusal.message).toBe(DISPATCH_REFUSAL_MESSAGE[code]);
    }
  });

  it("retries a transient failure with the server's message", () => {
    expect(dispatchRefusal(fail("provider_unavailable", "Tashqi xizmat javob bermadi."))).toEqual({
      kind: "retry",
      message: "Tashqi xizmat javob bermadi.",
    });
    expect(dispatchRefusal(fail("network_error", "API bilan bog‘lanib bo‘lmadi."))).toMatchObject({
      kind: "retry",
    });
  });

  it("remembers a disabled switch and a too heavy parcel", () => {
    const start = { disabled: [], tooHeavy: false };
    expect(rememberMethodRefusal(start, "method_disabled", "express")).toEqual({
      disabled: ["express"],
      tooHeavy: false,
    });
    expect(rememberMethodRefusal(start, "method_disabled", null)).toBe(start);
    expect(rememberMethodRefusal(start, "too_heavy", null)).toEqual({
      disabled: [],
      tooHeavy: true,
    });
    expect(rememberMethodRefusal(start, "closed", "express")).toBe(start);
  });
});

describe("confirmReturnRefusal", () => {
  it("maps the note error, the changed order and transient failures", () => {
    expect(
      confirmReturnRefusal(fail("validation_error", "x", { note: "1000 belgidan oshmasin." })),
    ).toEqual({ kind: "field", field: "note", message: "1000 belgidan oshmasin." });
    expect(confirmReturnRefusal(fail("invalid_transition"))).toMatchObject({
      kind: "stale",
      message: "Qaytayotgan posilka yo‘q: qaytishni tasdiqlab bo‘lmaydi.",
    });
    expect(confirmReturnRefusal(fail("conflict"))).toMatchObject({ kind: "stale" });
    expect(confirmReturnRefusal(fail("network_error", "x"))).toEqual({
      kind: "retry",
      message: "x",
    });
  });
});

describe("cancelOutcome (carrier-aware cancel, plan §3.8)", () => {
  it("keeps the earlier BTS / pickup wording unchanged", () => {
    expect(cancelOutcome(fail("not_cancellable", "BTS text"), false)).toEqual({
      kind: "stale",
      title: "Amal bajarilmadi",
      message: "BTS text",
    });
    expect(cancelOutcome(fail("conflict", "busy"), false)).toEqual({
      kind: "retry",
      title: "Amal bajarilmadi",
      message: "busy",
    });
    expect(cancelOutcome(fail("provider_unavailable", "BTS down"), false)).toMatchObject({
      kind: "retry",
      title: "Amal bajarilmadi",
    });
  });

  it("titles the Yandex codes and keeps the server's message", () => {
    expect(cancelOutcome(fail("return_requested", "asked back"), true)).toEqual({
      kind: "return_requested",
      title: "Yandexdan qaytarish so‘raldi",
      message: "asked back",
    });
    expect(cancelOutcome(fail("conflict", "busy"), true)).toEqual({
      kind: "retry",
      title: "Yandex bilan amal davom etmoqda",
      message: "busy",
    });
    expect(cancelOutcome(fail("provider_unavailable", "no answer"), true)).toEqual({
      kind: "retry",
      title: "Yandex javob bermadi",
      message: "no answer",
    });
    expect(cancelOutcome(fail("not_cancellable", "delivered"), true)).toEqual({
      kind: "stale",
      title: "Bekor qilib bo‘lmadi",
      message: "delivered",
    });
    expect(cancelOutcome(fail("network_error", "x"), true)).toMatchObject({ kind: "retry" });
  });

  it("falls back to an Uzbek text when the server sent none", () => {
    expect(cancelOutcome(fail("return_requested", ""), true).message).toContain(
      "omborga qaytarish so‘raldi",
    );
  });
});
