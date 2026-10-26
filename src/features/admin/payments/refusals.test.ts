import { describe, expect, it } from "vitest";

import { isStaleRefundRefusal } from "./refusals";

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
