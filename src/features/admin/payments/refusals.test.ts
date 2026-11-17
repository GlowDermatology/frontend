import { describe, expect, it } from "vitest";

import noPaydocFixture from "@/data/api/__fixtures__/err-refund-no-paydoc.json";
import { ApiError } from "@/data/api/errors";
import { toActionResult } from "@/data/api/mappers/errors";
import type { ErrorEnvelope } from "@/data/api/types";
import { paymentDataCopy } from "@/domain/copy/payments";
import { CLICK_NO_PAYDOC_MESSAGE, CLICK_STILL_PAID_MESSAGE } from "@/domain/payment";

import {
  CLICK_FAKE_MODE_CODE,
  CLICK_NO_PAYDOC_CODE,
  CLICK_NOT_REVERSED_CODE,
  isClickFakeModeRefusal,
  isClickNoPaydocRefusal,
  isClickStillPaidRefusal,
  isOrderBusyRefusal,
  isStaleRefundRefusal,
  ORDER_BUSY_CODE,
  refundRefusalMessage,
} from "./refusals";
import { CLICK_UNAVAILABLE_MESSAGE } from "./refund-dialog";

describe("the refusal codes the backend sends (admin contract §1.6)", () => {
  it("are fixed strings", () => {
    expect([
      ORDER_BUSY_CODE,
      CLICK_NOT_REVERSED_CODE,
      CLICK_NO_PAYDOC_CODE,
      CLICK_FAKE_MODE_CODE,
    ]).toEqual(["order_busy", "click_not_reversed", "click_no_paydoc", "click_fake_mode"]);
  });
});

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
    const busy = {
      ok: false as const,
      error: "Buyurtma boshqa amal bilan band. Birozdan so‘ng qayta urinib ko‘ring.",
      code: "order_busy",
    };
    expect(isOrderBusyRefusal(busy)).toBe(true);
    expect(isStaleRefundRefusal(busy)).toBe(false);
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
    code: "click_not_reversed",
  };
  const clickFake = {
    ok: false as const,
    error:
      "Click sinov rejimida: to‘lov holatini tekshirib bo‘lmaydi. Click ulanganidan keyin yakunlang.",
    code: "click_fake_mode",
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
    expect(isClickStillPaidRefusal({ ok: true, data: null })).toBe(false);
  });

  it("keeps the dialog open with Click's test-mode 409 instead of treating it as stale", () => {
    expect(isClickFakeModeRefusal(clickFake)).toBe(true);
    expect(isStaleRefundRefusal(clickFake)).toBe(false);
    expect(refundRefusalMessage("close", clickFake, CLICK_UNAVAILABLE_MESSAGE)).toBe(
      clickFake.error,
    );
    expect(isClickFakeModeRefusal(stillPaid)).toBe(false);
    expect(isClickFakeModeRefusal({ ok: true, data: null })).toBe(false);
  });

  it("goes by the code alone: the same text under a generic code is a stale row", () => {
    expect(isClickStillPaidRefusal({ ...stillPaid, code: "invalid_transition" })).toBe(false);
    expect(isStaleRefundRefusal({ ...stillPaid, code: "invalid_transition" })).toBe(true);
    expect(isClickFakeModeRefusal({ ...clickFake, code: "invalid_transition" })).toBe(false);
    expect(isStaleRefundRefusal({ ...clickFake, code: "invalid_transition" })).toBe(true);
  });

  it("names Click when it did not answer the status check, keeps other messages", () => {
    expect(isStaleRefundRefusal(unavailable)).toBe(false);
    expect(refundRefusalMessage("close", unavailable, CLICK_UNAVAILABLE_MESSAGE)).toBe(
      CLICK_UNAVAILABLE_MESSAGE,
    );
    expect(refundRefusalMessage("retry", unavailable, CLICK_UNAVAILABLE_MESSAGE)).toBe(
      unavailable.error,
    );
    expect(
      refundRefusalMessage(
        "close",
        { ok: false, error: "Tarmoq xatosi.", code: "network_error" },
        CLICK_UNAVAILABLE_MESSAGE,
      ),
    ).toBe("Tarmoq xatosi.");
  });
});

describe("a failed Click refund whose payment has no Click payment id (M3)", () => {
  // The backend's answer to "Yakunlash" (M3 text, with the click_no_paydoc code), through the mapping.
  const noPaydoc = toActionResult(new ApiError(409, noPaydocFixture as ErrorEnvelope));

  it("is a 409 click_no_paydoc with the text the demo answers too", () => {
    expect(noPaydoc).toMatchObject({ ok: false, code: "click_no_paydoc" });
    expect(noPaydoc.error).toBe(CLICK_NO_PAYDOC_MESSAGE);
  });

  it("is its own refusal: neither Click's still-paid answer nor a stale row", () => {
    expect(isClickNoPaydocRefusal(noPaydoc)).toBe(true);
    expect(isClickStillPaidRefusal(noPaydoc)).toBe(false);
    expect(isStaleRefundRefusal(noPaydoc)).toBe(false);
    expect(CLICK_NO_PAYDOC_MESSAGE).not.toMatch(/qaytarmagan/);
    expect(isClickNoPaydocRefusal({ ...noPaydoc, code: "conflict" })).toBe(false);
    expect(isClickNoPaydocRefusal({ ok: true, data: null })).toBe(false);
  });
});

describe("refusals in the admin languages (the API answers in Accept-Language)", () => {
  it("recognises a Russian or English answer by its code, whatever the text", () => {
    for (const locale of ["uz", "ru", "en"] as const) {
      const m = paymentDataCopy[locale];
      expect(
        isClickStillPaidRefusal({ ok: false, error: m.clickStillPaid, code: "click_not_reversed" }),
      ).toBe(true);
      expect(
        isClickNoPaydocRefusal({ ok: false, error: m.clickNoPaydoc, code: "click_no_paydoc" }),
      ).toBe(true);
      expect(
        isClickFakeModeRefusal({ ok: false, error: m.clickFakeMode, code: "click_fake_mode" }),
      ).toBe(true);
      expect(isStaleRefundRefusal({ ok: false, error: m.orderBusy, code: "order_busy" })).toBe(
        false,
      );
      expect(isStaleRefundRefusal({ ok: false, error: m.refundOpen, code: "conflict" })).toBe(true);
    }
  });
});
