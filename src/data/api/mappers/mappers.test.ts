import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, type ErrorEnvelope } from "../errors";
import { camelKey, idString, isoOrUndefined, nullToUndefined } from "./common";
import {
  type FieldRemap,
  isSessionExpired,
  mapFieldPath,
  SESSION_EXPIRED,
  TOP_LEVEL_ERROR,
  toActionResult,
} from "./errors";
import { mapPage } from "./page";

function envelope(partial: Partial<ErrorEnvelope>): ErrorEnvelope {
  return {
    code: "validation_error",
    message: "Maydonlarni tekshiring.",
    errors: [],
    request_id: "6f1c2a0e9b8d4c37",
    ...partial,
  };
}

describe("common", () => {
  it("camelises snake_case keys and leaves numbers and plain words alone", () => {
    expect(camelKey("page_size")).toBe("pageSize");
    expect(camelKey("access_expires_at")).toBe("accessExpiresAt");
    expect(camelKey("uz")).toBe("uz");
    expect(camelKey("1")).toBe("1");
    expect(camelKey("image_2x")).toBe("image2x");
  });

  it("converts ids and nulls", () => {
    expect(idString(5)).toBe("5");
    expect(idString("serums")).toBe("serums");
    expect(nullToUndefined(null)).toBeUndefined();
    expect(nullToUndefined(0)).toBe(0);
    expect(nullToUndefined("")).toBe("");
    expect(isoOrUndefined(null)).toBeUndefined();
    expect(isoOrUndefined("")).toBeUndefined();
    expect(isoOrUndefined("2026-10-23T14:02:00+05:00")).toBe("2026-10-23T14:02:00+05:00");
  });
});

describe("mapPage", () => {
  it("renames the envelope keys and maps the items", () => {
    const page = mapPage(
      { count: 1284, page: 1, page_size: 10, page_count: 129, results: [{ id: 10252 }] },
      (item, index) => ({ id: String(item.id), index }),
    );
    expect(page).toEqual({
      items: [{ id: "10252", index: 0 }],
      total: 1284,
      page: 1,
      pageSize: 10,
      pageCount: 129,
    });
  });
});

describe("mapFieldPath", () => {
  it("camelises per dotted segment and keeps numeric segments", () => {
    expect(mapFieldPath("texts.uz.name")).toBe("texts.uz.name");
    expect(mapFieldPath("tiers.1.percent")).toBe("tiers.1.percent");
    expect(mapFieldPath("scheduled_at")).toBe("scheduledAt");
    expect(mapFieldPath("audience.segment_id")).toBe("audience.segmentId");
    expect(mapFieldPath("page_size")).toBe("pageSize");
  });

  it("applies the per-action remap table, exact keys first, then prefixes", () => {
    const remap = {
      "audience.phone": "phone",
      "audience.segment_id": "segmentId",
      "audience.type": "audience",
      "link.*": "link",
      scheduled_at: "scheduledAt",
    };
    expect(mapFieldPath("audience.phone", remap)).toBe("phone");
    expect(mapFieldPath("audience.segment_id", remap)).toBe("segmentId");
    expect(mapFieldPath("audience.type", remap)).toBe("audience");
    expect(mapFieldPath("link.kind", remap)).toBe("link");
    expect(mapFieldPath("link.product_id", remap)).toBe("link");
    expect(mapFieldPath("linkage", remap)).toBe("linkage");
    expect(mapFieldPath("title", remap)).toBe("title");
  });
});

describe("toActionResult", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a 400 validation_error to field errors (contract example)", () => {
    const error = new ApiError(
      400,
      envelope({
        errors: [
          {
            field: "texts.uz.name",
            code: "min_length",
            message: "O‘zbekcha nomni kiriting (kamida 2 belgi).",
          },
          { field: "texts.uz.name", code: "blank", message: "Maydonni to‘ldiring." },
          {
            field: "tiers.1.percent",
            code: "max_decimal_places",
            message: "Ko‘pi bilan 2 ta kasr raqam.",
          },
          { field: "billz_id", code: "unique", message: "Bu qiymat band." },
        ],
      }),
    );
    expect(toActionResult(error, { billz_id: "billzId" })).toEqual({
      ok: false,
      error: "Maydonlarni tekshiring.",
      fieldErrors: {
        "texts.uz.name": "O‘zbekcha nomni kiriting (kamida 2 belgi).",
        "tiers.1.percent": "Ko‘pi bilan 2 ta kasr raqam.",
        billzId: "Bu qiymat band.",
      },
    });
  });

  it("prefers the first non-field message over the envelope message", () => {
    const error = new ApiError(
      400,
      envelope({
        errors: [
          { field: "tiers.0.from", code: "min_value", message: "Qiymat 0 dan kam bo‘lmasin." },
          { field: null, code: "tiers_overlap", message: "Darajalar bir-birini qoplaydi." },
          { field: null, code: "other", message: "Ikkinchi xabar." },
        ],
      }),
    );
    expect(toActionResult(error)).toEqual({
      ok: false,
      error: "Darajalar bir-birini qoplaydi.",
      fieldErrors: { "tiers.0.from": "Qiymat 0 dan kam bo‘lmasin." },
    });
  });

  it("omits fieldErrors when a validation error has none", () => {
    const error = new ApiError(400, envelope({ errors: [] }));
    expect(toActionResult(error)).toEqual({ ok: false, error: "Maydonlarni tekshiring." });
  });

  it("applies the notification remap, folding image into the top-level error", () => {
    const remap: FieldRemap = { "audience.phone": "phone", image: TOP_LEVEL_ERROR };
    const error = new ApiError(
      400,
      envelope({
        errors: [
          { field: "audience.phone", code: "invalid", message: "Noto‘g‘ri qiymat." },
          { field: "image", code: "file_too_large", message: "Rasm 5 MB dan oshmasin." },
        ],
      }),
    );
    expect(toActionResult(error, remap)).toEqual({
      ok: false,
      error: "Rasm 5 MB dan oshmasin.",
      fieldErrors: { phone: "Noto‘g‘ri qiymat." },
    });
  });

  it("treats an empty-string remap target as the top-level error too", () => {
    const error = new ApiError(
      400,
      envelope({
        errors: [
          { field: "image", code: "unsupported_image", message: "Faqat JPEG, PNG yoki WebP rasm." },
        ],
      }),
    );
    expect(toActionResult(error, { image: "" })).toEqual({
      ok: false,
      error: "Faqat JPEG, PNG yoki WebP rasm.",
    });
    expect(mapFieldPath("image", { image: "" })).toBeNull();
    expect(mapFieldPath("link.product_id", { "link.*": "" })).toBeNull();
  });

  it("keeps the first non-field message when both a field:null entry and a remapped one exist", () => {
    const error = new ApiError(
      400,
      envelope({
        errors: [
          { field: null, code: "invalid", message: "Avval yuborish vaqtini tanlang." },
          { field: "image", code: "file_too_large", message: "Rasm 5 MB dan oshmasin." },
        ],
      }),
    );
    expect(toActionResult(error, { image: TOP_LEVEL_ERROR })).toEqual({
      ok: false,
      error: "Avval yuborish vaqtini tanlang.",
    });
  });

  it("returns the envelope message for 409, 422 and 503", () => {
    for (const [status, code, message] of [
      [409, "not_cancellable", "Buyurtmani bekor qilib bo‘lmaydi."],
      [422, "idempotency_key_reused", "Bu kalit boshqa so‘rov uchun ishlatilgan."],
      [503, "provider_unavailable", "Tashqi xizmat javob bermadi. Qayta urinib ko‘ring."],
      [404, "not_found", "Topilmadi."],
    ] as const) {
      const error = new ApiError(status, envelope({ code, message }));
      expect(toActionResult(error)).toEqual({ ok: false, error: message });
    }
  });

  it("formats 429 with the Retry-After seconds, falling back to the message", () => {
    const throttled = envelope({
      code: "throttled",
      message: "Juda ko‘p urinish. {n} soniyadan so‘ng qayta urinib ko‘ring.",
    });
    expect(toActionResult(new ApiError(429, throttled, { retryAfter: 17 }))).toEqual({
      ok: false,
      error: "Juda ko‘p urinish. 17 soniyadan so‘ng qayta urinib ko‘ring.",
    });
    expect(toActionResult(new ApiError(429, throttled))).toEqual({
      ok: false,
      error: throttled.message,
    });
  });

  it("flags session-ending 401s and keeps invalid_credentials as a form error", () => {
    const expired = new ApiError(
      401,
      envelope({ code: "SESSION_EXPIRED", message: "Sessiya tugadi. Qayta kiring." }),
    );
    const notAuthenticated = new ApiError(
      401,
      envelope({ code: "not_authenticated", message: "Avtorizatsiya talab qilinadi." }),
    );
    const replaced = new ApiError(401, envelope({ code: "SESSION_REPLACED" }));
    const badLogin = new ApiError(
      401,
      envelope({ code: "invalid_credentials", message: "Login yoki parol noto‘g‘ri." }),
    );

    expect(isSessionExpired(expired)).toBe(true);
    expect(isSessionExpired(notAuthenticated)).toBe(true);
    expect(isSessionExpired(replaced)).toBe(true);
    expect(isSessionExpired(badLogin)).toBe(false);
    expect(isSessionExpired(new Error("x"))).toBe(false);

    expect(toActionResult(expired)).toEqual({ ok: false, error: SESSION_EXPIRED });
    expect(toActionResult(notAuthenticated)).toEqual({ ok: false, error: SESSION_EXPIRED });
    expect(toActionResult(badLogin)).toEqual({ ok: false, error: "Login yoki parol noto‘g‘ri." });
  });

  it("maps transport failures and unexpected errors", () => {
    const network = new ApiError(0, envelope({ code: "network_error", message: "x" }));
    expect(toActionResult(network)).toEqual({ ok: false, error: "API bilan bog‘lanib bo‘lmadi." });

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(toActionResult(new TypeError("boom"))).toEqual({ ok: false, error: "Kutilmagan xato." });
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
