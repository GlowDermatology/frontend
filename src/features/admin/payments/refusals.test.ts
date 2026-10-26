import { describe, expect, it } from "vitest";

import { CLICK_STILL_PAID_MESSAGE } from "@/domain/payment";

import {
  CLICK_NOT_REVERSED_CODE,
  CLICK_UNAVAILABLE_MESSAGE,
  isClickStillPaidRefusal,
  isStaleRefundRefusal,
  refundRefusalMessage,
} from "./refusals";

describe("isStaleRefundRefusal (contract §2.12, §2.2 busy order)", () => {
  it("treats a changed row as stale and the busy order or a network error as transient", () => {
    expect(isStaleRefundRefusal({ ok: true, data: null })).toBe(false);
    expect(
      isStaleRefundRefusal({
        ok: false,
        error: "Bu to‘lov uchun qaytarish allaqachon jarayonda.",
        code: "conflict",
      }),
    ).toBe(true);
    expect(
      isStaleRefundRefusal({
        ok: false,
        error: "Bu qaytarishni yakunlab bo‘lmaydi.",
        code: "invalid_transition",
      }),
    ).toBe(true);
    expect(isStaleRefundRefusal({ ok: false, error: "Topilmadi.", code: "not_found" })).toBe(true);
    expect(
      isStaleRefundRefusal({
        ok: false,
        error: "Buyurtma boshqa amal bilan band. Birozdan so‘ng qayta urinib ko‘ring.",
        code: "conflict",
      }),
    ).toBe(false);
    expect(
      isStaleRefundRefusal({
        ok: false,
        error: "Xizmat vaqtincha ishlamayapti.",
        code: "provider_unavailable",
      }),
    ).toBe(false);
    expect(isStaleRefundRefusal({ ok: false, error: "Tarmoq xatosi." })).toBe(false);
  });
});

describe("closing a failed Click refund (§7 item 18, M2)", () => {
  const stillPaid = {
    ok: false as const,
    error: CLICK_STILL_PAID_MESSAGE,
    code: "invalid_transition",
  };
  const clickFake = {
    ok: false as const,
    error:
      "Click sinov rejimida: to‘lov holatini tekshirib bo‘lmaydi. Click ulanganidan keyin yakunlang.",
    code: "invalid_transition",
  };
  const unavailable = {
    ok: false as const,
    error: "Tashqi xizmat javob bermadi. Qayta urinib ko‘ring.",
    code: "provider_unavailable",
  };

  it("reads Click's still-paid 409 as the payout step, not as a stale row", () => {
    expect(isClickStillPaidRefusal(stillPaid)).toBe(true);
    expect(isStaleRefundRefusal(stillPaid)).toBe(false);
    expect(isClickStillPaidRefusal(clickFake)).toBe(false);
    expect(isStaleRefundRefusal(clickFake)).toBe(true);
    expect(
      isClickStillPaidRefusal({ ok: false, error: CLICK_STILL_PAID_MESSAGE, code: "conflict" }),
    ).toBe(false);
    expect(isClickStillPaidRefusal({ ok: true, data: null })).toBe(false);
  });

  it("recognises the click_not_reversed code first, whatever the message says", () => {
    const coded = {
      ok: false as const,
      error: "Click pulni qaytarmadi.",
      code: "click_not_reversed",
    };
    expect(CLICK_NOT_REVERSED_CODE).toBe("click_not_reversed");
    expect(isClickStillPaidRefusal(coded)).toBe(true);
    expect(isStaleRefundRefusal(coded)).toBe(false);
    expect(
      isClickStillPaidRefusal({
        ok: false,
        error: CLICK_STILL_PAID_MESSAGE,
        code: CLICK_NOT_REVERSED_CODE,
      }),
    ).toBe(true);
    // The message prefix stays the fallback for a backend without the code.
    expect(isClickStillPaidRefusal(stillPaid)).toBe(true);
    expect(
      isClickStillPaidRefusal({
        ok: false,
        error: "Bu qaytarishni yakunlab bo‘lmaydi.",
        code: "invalid_transition",
      }),
    ).toBe(false);
  });

  it("names Click when it did not answer the status check, keeps other messages", () => {
    expect(isStaleRefundRefusal(unavailable)).toBe(false);
    expect(refundRefusalMessage("close", unavailable)).toBe(CLICK_UNAVAILABLE_MESSAGE);
    expect(refundRefusalMessage("retry", unavailable)).toBe(unavailable.error);
    expect(
      refundRefusalMessage("close", { ok: false, error: "Tarmoq xatosi.", code: "network_error" }),
    ).toBe("Tarmoq xatosi.");
  });
});
