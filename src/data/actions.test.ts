import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { appointmentActions } from "@/domain/appointment";
import { ledgerBalance } from "@/domain/cashback";
import { canCancel, manualTransitions } from "@/domain/order";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * The Server Actions in mock mode: session/csrf gate, zod re-validation and
 * the happy paths, which must produce the same shapes the old client-side
 * mocks produced (the UI behaviour is unchanged). `verifyStaff` is mocked so
 * the gate can be exercised; `connection()` needs a Next request store and is
 * stubbed; `refresh()` must never run in mock mode.
 */

const verifyStaff = vi.fn<(options?: VerifyStaffOptions) => Promise<StaffSession>>();
const refresh = vi.fn();

const apiFetch = vi.fn();
const cachedGet = vi.fn();

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("./auth", () => ({
  verifyStaff: (options?: VerifyStaffOptions) => verifyStaff(options),
  requireApiToken: async () => "t",
}));
vi.mock("./mock/delay", () => ({ delay: async () => undefined }));
vi.mock("./api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  cachedGet: (...args: unknown[]) => cachedGet(...args),
  apiFetchRaw: vi.fn(),
  buildQuery: () => "",
}));

import bannerFixture from "./api/__fixtures__/banner.json";
import categoryErrorFixture from "./api/__fixtures__/category-error.json";
import productFixture from "./api/__fixtures__/product-1.json";
import { ApiError } from "./api/errors";
import { mapProduct } from "./api/mappers/products";
import type { ApiProduct } from "./api/types";
import { deleteBanner, reorderBanners, saveBanner } from "./banners.actions";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from "./categories.actions";

import { updateAppointment } from "./appointments.actions";
import { saveCashbackPolicy } from "./cashback.actions";
import { adjustCashback } from "./customers.actions";
import { ACTIVE_POLICY } from "./mock/cashback";
import { APPOINTMENTS } from "./mock/appointments";
import { PRODUCTS } from "./mock/catalog";
import { ORDER_SUMMARIES } from "./mock/orders";
import { getOrder } from "./mock/orders.queries";
import { sendNotification } from "./notifications.actions";
import { cancelOrder, changeOrderStatus, retryShipment } from "./orders.actions";
import {
  deleteProductImage,
  importFromBillz,
  pollJob,
  reorderProductImages,
  saveProduct,
  searchProducts,
  uploadProductImage,
} from "./products.actions";
import type { ProductFormValues } from "./products.schema";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const DEMO_NOW_ISO = "2026-10-24T07:00:00.000Z";

const originalSource = process.env.GLOWDERMA_DATA_SOURCE;

beforeEach(() => {
  delete process.env.GLOWDERMA_DATA_SOURCE;
  verifyStaff.mockReset();
  verifyStaff.mockResolvedValue({ ok: true, mode: "mock" });
  refresh.mockClear();
  apiFetch.mockReset();
  cachedGet.mockReset();
});

afterEach(() => {
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
  vi.useRealTimers();
});

function notificationForm(overrides: Record<string, string | File> = {}): FormData {
  const form = new FormData();
  const fields: Record<string, string | File> = {
    kind: "promo",
    title: "Yangi aksiya",
    body: "Barcha serumlarga 20% chegirma.",
    link: "none",
    audience: "all",
    segmentId: "",
    phone: "",
    scheduledAt: "",
    ...overrides,
  };
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
}

const CSRF_FAILURE = {
  ok: false,
  error: "Xavfsizlik tekshiruvi o‘tmadi. Sahifani yangilang.",
  code: "csrf",
};

describe("session and csrf gate", () => {
  it("passes the presented token to verifyStaff on every call", async () => {
    await changeOrderStatus(10248, "handed_to_courier", KEY, CSRF);
    expect(verifyStaff).toHaveBeenCalledTimes(1);
    expect(verifyStaff).toHaveBeenCalledWith({ csrf: CSRF });
    await deleteProductImage("1", "img-1", "other-token");
    expect(verifyStaff).toHaveBeenLastCalledWith({ csrf: "other-token" });
  });

  it("returns session_expired when verifyStaff reports no session or an expired one", async () => {
    verifyStaff.mockResolvedValue({ ok: false, reason: "expired" });
    const result = await changeOrderStatus(10248, "handed_to_courier", KEY, CSRF);
    expect(result).toEqual({
      ok: false,
      error: "Sessiya tugadi. Qayta kiring.",
      code: "session_expired",
    });
    verifyStaff.mockResolvedValue({ ok: false, reason: "no_session" });
    expect(await updateAppointment("a1", "confirm", KEY, CSRF)).toMatchObject({
      code: "session_expired",
    });
  });

  it("returns csrf when the double-submit token does not match", async () => {
    verifyStaff.mockResolvedValue({ ok: false, reason: "csrf" });
    const result = await adjustCashback(
      "5",
      { direction: "add", amount: 1000, reason: "Chek qo‘lda" },
      KEY,
      "wrong",
    );
    expect(result).toEqual(CSRF_FAILURE);
    expect(verifyStaff).toHaveBeenCalledWith({ csrf: "wrong" });
  });

  it("refuses a call that omits the token without consulting the session (every action family)", async () => {
    // Server Action arguments are attacker-controlled: the `csrf: string`
    // signature does not exist at runtime. Even in mock mode (where
    // `verifyStaff` is open) the guard answers `csrf` and runs nothing.
    const missing = undefined as never;
    const calls: Array<() => Promise<unknown>> = [
      () => cancelOrder(10248, "mijoz so‘rovi bilan", KEY, missing),
      () => changeOrderStatus(10248, "handed_to_courier", KEY, missing),
      () => retryShipment(10248, KEY, missing),
      () => saveProduct("1", {} as ProductFormValues, null, KEY, missing),
      () => uploadProductImage("1", new FormData(), missing),
      () => deleteProductImage("1", "img-1", missing),
      () => reorderProductImages("1", ["img-1"], missing),
      () => importFromBillz(KEY, missing),
      () => pollJob("1", missing),
      () => searchProducts("serum", missing),
      () =>
        createCategory(
          { slug: "a1", name: { uz: "Ab", ru: "", en: "" }, isActive: true },
          KEY,
          missing,
        ),
      () =>
        updateCategory(
          "serums",
          { name: { uz: "Ab", ru: "", en: "" }, isActive: true },
          KEY,
          missing,
        ),
      () => deleteCategory("serums", missing),
      () => reorderCategories(["serums"], missing),
      () => saveBanner(null, new FormData(), null, KEY, missing),
      () => deleteBanner("1", missing),
      () => reorderBanners(["1"], missing),
      () => adjustCashback("5", { direction: "add", amount: 1, reason: "abc" }, KEY, missing),
      () => saveCashbackPolicy(ACTIVE_POLICY, KEY, missing),
      () => sendNotification(notificationForm(), KEY, missing),
      () => updateAppointment("a1", "confirm", KEY, missing),
    ];
    for (const call of calls) expect(await call()).toEqual(CSRF_FAILURE);
    expect(verifyStaff).not.toHaveBeenCalled();

    // Other non-token values are refused the same way.
    expect(await retryShipment(10248, KEY, "")).toEqual(CSRF_FAILURE);
    expect(await retryShipment(10248, KEY, null as never)).toEqual(CSRF_FAILURE);
    expect(await retryShipment(10248, KEY, 42 as never)).toEqual(CSRF_FAILURE);
    expect(await retryShipment(10248, KEY, { csrf: CSRF } as never)).toEqual(CSRF_FAILURE);
    expect(verifyStaff).not.toHaveBeenCalled();
  });

  it("rejects a non-UUID idempotency key before touching the data", async () => {
    const result = await cancelOrder(10248, "mijoz so‘rovi bilan", "not-a-uuid", CSRF);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.key).toBe("Noto‘g‘ri so‘rov kaliti.");
  });
});

describe("api mode (endpoints not wired yet)", () => {
  it("answers 'not wired' without refreshing the route", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const notWired = { ok: false, error: "Bu amal API bilan hali ulanmagan." };
    expect(await cancelOrder(10248, "mijoz so‘rovi bilan", KEY, CSRF)).toEqual(notWired);
    expect(await changeOrderStatus(10248, "handed_to_courier", KEY, CSRF)).toEqual(notWired);
    expect(await retryShipment(10248, KEY, CSRF)).toEqual(notWired);
    expect(await updateAppointment("a1", "confirm", KEY, CSRF)).toEqual(notWired);
    expect(await sendNotification(notificationForm(), KEY, CSRF)).toEqual(notWired);
    expect(await saveCashbackPolicy(ACTIVE_POLICY, KEY, CSRF)).toEqual(notWired);
    expect(
      await adjustCashback("5", { direction: "add", amount: 1, reason: "abc" }, KEY, CSRF),
    ).toEqual(notWired);
    expect(refresh).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("api mode (catalog actions wired)", () => {
  const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });
  const values: ProductFormValues = {
    texts: mapProduct(productFixture as ApiProduct).texts,
    price: 185_000,
    category: "serums",
    billzId: "4607012301",
    promo: false,
    status: "hidden",
    images: [],
  };

  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  });

  it("saveProduct creates hidden with JSON and an idempotency key, maps the answer and refreshes the route", async () => {
    apiFetch.mockResolvedValueOnce(respond(201, productFixture));
    const result = await saveProduct(null, { ...values, category: "" }, null, KEY, CSRF);
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/products/",
      expect.objectContaining({
        method: "POST",
        token: "t",
        idempotencyKey: KEY,
        body: expect.objectContaining({ billz_id: "4607012301", status: "hidden", category: null }),
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      data: { id: "1", lastChange: { by: "Administrator" } },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("saveProduct patches only the diff against the editor's baseline (no re-read)", async () => {
    const baseline = { ...values, status: "active" as const };
    apiFetch.mockResolvedValueOnce(respond(200, { ...productFixture, price: 190_000 }));
    const image = { id: "1", label: "Rasm 1", src: "http://m/a.webp" };
    const result = await saveProduct(
      "1",
      {
        ...values,
        price: 190_000,
        status: "active",
        images: [image],
        texts: { ...values.texts, en: { ...values.texts.en, usage: "At night." } },
      },
      baseline,
      KEY,
      CSRF,
    );
    // The baseline is what the editor loaded: no GET before the PATCH.
    expect(cachedGet).not.toHaveBeenCalled();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/products/1/",
      expect.objectContaining({
        method: "PATCH",
        body: { price: 190_000, texts: { en: { usage: "At night." } } },
      }),
    );
    // A PATCH is not keyed (the activation PATCH would replay the first one).
    expect(apiFetch.mock.calls[0]![1].idempotencyKey).toBeUndefined();
    expect(result).toMatchObject({ ok: true, data: { price: 190_000 } });
    // Nothing changed → no PATCH, the current product is read and returned.
    apiFetch.mockClear();
    cachedGet.mockResolvedValueOnce(respond(200, productFixture));
    const unchanged = await saveProduct(
      "1",
      { ...values, status: "active", images: [image] },
      baseline,
      KEY,
      CSRF,
    );
    expect(unchanged).toMatchObject({ ok: true, data: { id: "1" } });
    expect(apiFetch).not.toHaveBeenCalled();
    expect(cachedGet).toHaveBeenCalledWith("/api/v1/admin/products/1/", undefined, "t");
  });

  it("saveProduct refuses a malformed baseline before the round trip", async () => {
    const result = await saveProduct("1", values, { ...values, price: "x" } as never, KEY, CSRF);
    expect(result.ok).toBe(false);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("saveProduct maps a 400 with billz_id → billzId and the active-rule fields", async () => {
    apiFetch.mockRejectedValueOnce(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [
          {
            field: "images",
            code: "required_for_active",
            message: "Faol mahsulotda kamida bitta rasm bo‘lsin.",
          },
          {
            field: "billz_id",
            code: "billz_not_found",
            message: "Billz’da bunday mahsulot topilmadi.",
          },
        ],
        request_id: "r",
      }),
    );
    // The client-side rule passes (the form still lists an image); the server
    // judges the real set and answers 400 on `images` and `billz_id`.
    const result = await saveProduct(
      "1",
      { ...values, billzId: "4607010000", status: "active", images: [{ id: "9", label: "x" }] },
      values,
      KEY,
      CSRF,
    );
    expect(result).toEqual({
      ok: false,
      error: "Maydonlarni tekshiring.",
      code: "validation_error",
      fieldErrors: {
        images: "Faol mahsulotda kamida bitta rasm bo‘lsin.",
        billzId: "Billz’da bunday mahsulot topilmadi.",
      },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("image actions post multipart, delete and put the exact order", async () => {
    apiFetch.mockResolvedValueOnce(respond(201, { id: 32, url: "http://m/x.webp", position: 1 }));
    const form = new FormData();
    form.set("file", new File(["x"], "photo.png", { type: "image/png" }));
    const uploaded = await uploadProductImage("1", form, CSRF);
    const [, request] = apiFetch.mock.calls[0]!;
    expect(request.formData).toBeInstanceOf(FormData);
    expect(request.body).toBeUndefined();
    expect(request.formData.get("file")).toBeInstanceOf(File);
    expect(uploaded).toEqual({
      ok: true,
      data: { id: "32", src: "http://m/x.webp", label: "Rasm 2" },
    });

    apiFetch.mockRejectedValueOnce(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "images", code: "max_items", message: "Ko‘pi bilan 8 ta rasm." }],
        request_id: "r",
      }),
    );
    expect(await uploadProductImage("1", form, CSRF)).toMatchObject({
      ok: false,
      error: "Ko‘pi bilan 8 ta rasm.",
    });

    apiFetch.mockResolvedValueOnce(respond(204, undefined));
    expect(await deleteProductImage("1", "31", CSRF)).toEqual({ ok: true, data: { id: "31" } });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/products/1/images/31/",
      expect.objectContaining({ method: "DELETE" }),
    );

    apiFetch.mockResolvedValueOnce(
      respond(200, {
        images: [
          { id: 31, url: "a", position: 1 },
          { id: 32, url: "b", position: 0 },
        ],
      }),
    );
    expect(await reorderProductImages("1", ["32", "31"], CSRF)).toEqual({
      ok: true,
      data: { imageIds: ["32", "31"] },
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/products/1/images/order/",
      expect.objectContaining({ method: "PUT", body: { image_ids: [32, 31] } }),
    );
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("importFromBillz posts with the idempotency key and pollJob reads jobs/{id}/", async () => {
    const job = {
      id: 12,
      kind: "billz_import",
      state: "running",
      params: { mode: "delta" },
      created_at: "2026-10-24T12:03:00+05:00",
      started_at: null,
      finished_at: null,
      progress: null,
      result: null,
      error: null,
      created_by: null,
    };
    apiFetch.mockResolvedValueOnce(respond(202, job));
    expect(await importFromBillz(KEY, CSRF)).toMatchObject({
      ok: true,
      data: { id: "12", state: "running" },
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/integrations/billz/import/",
      expect.objectContaining({ method: "POST", idempotencyKey: KEY, body: {} }),
    );
    apiFetch.mockResolvedValueOnce(
      respond(200, {
        ...job,
        state: "succeeded",
        result: { created: 3, updated: 245, unchanged: 0, new_from_billz: 3 },
      }),
    );
    expect(await pollJob("12", CSRF)).toMatchObject({
      ok: true,
      data: { state: "succeeded", result: { created: 3, updated: 245, unchanged: 0 } },
    });
    expect(apiFetch).toHaveBeenLastCalledWith("/api/v1/admin/jobs/12/", { token: "t" });
    apiFetch.mockRejectedValueOnce(
      new ApiError(404, { code: "not_found", message: "Topilmadi.", errors: [], request_id: "" }),
    );
    expect(await pollJob("99", CSRF)).toMatchObject({ ok: false, code: "not_found" });
    expect(await importFromBillz("nope", CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { key: expect.any(String) },
    });
  });

  it("category actions map the contract's answers (400 fields, 409 conflict, order)", async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(400, categoryErrorFixture));
    expect(
      await createCategory(
        { slug: "no-ne", name: { uz: "Ab", ru: "", en: "" }, isActive: true },
        KEY,
        CSRF,
      ),
    ).toEqual({
      ok: false,
      error: "Maydonlarni tekshiring.",
      code: "validation_error",
      fieldErrors: { slug: "Bu slug band.", "name.uz": "Kamida 2 ta belgi kiriting." },
    });
    // The reserved slugs are refused before the round trip.
    expect(
      await createCategory(
        { slug: "none", name: { uz: "Ab", ru: "", en: "" }, isActive: true },
        KEY,
        CSRF,
      ),
    ).toMatchObject({ fieldErrors: { slug: "Bu slug band." } });
    expect(apiFetch).toHaveBeenCalledTimes(1);

    apiFetch.mockRejectedValueOnce(
      new ApiError(409, {
        code: "conflict",
        message: "Kategoriyada mahsulotlar bor.",
        errors: [],
        request_id: "",
      }),
    );
    expect(await deleteCategory("serums", CSRF)).toEqual({
      ok: false,
      error: "Kategoriyada mahsulotlar bor.",
      code: "conflict",
    });

    const category = {
      slug: "masks",
      name: { uz: "Niqoblar", ru: "", en: "" },
      position: 1,
      is_active: true,
      product_count: 0,
      created_at: "2026-10-26T00:00:00+05:00",
      updated_at: "2026-10-26T00:00:00+05:00",
    };
    apiFetch.mockResolvedValueOnce(respond(200, { ...category, is_active: false }));
    expect(
      await updateCategory("masks", { name: category.name, isActive: false }, KEY, CSRF),
    ).toMatchObject({ ok: true, data: { slug: "masks", isActive: false } });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/categories/masks/",
      expect.objectContaining({
        method: "PATCH",
        idempotencyKey: KEY,
        body: { name: category.name, is_active: false },
      }),
    );
    apiFetch.mockResolvedValueOnce(respond(200, { results: [{ ...category, position: 0 }] }));
    expect(await reorderCategories(["masks"], CSRF)).toMatchObject({
      ok: true,
      data: [{ slug: "masks", position: 0 }],
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/categories/order/",
      expect.objectContaining({ method: "PUT", body: { slugs: ["masks"] } }),
    );
  });

  it("saveBanner posts multipart with dotted keys on create and JSON on an image-less update", async () => {
    const form = new FormData();
    form.set("title.uz", "Kuzgi chegirmalar");
    form.set("link.kind", "product");
    form.set("link.productId", "4");
    form.set("isActive", "true");
    form.set("endsAt", "2026-11-30T00:00:00+05:00");
    // Create without an image is refused before the round trip.
    expect(await saveBanner(null, form, null, KEY, CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { image: "Banner rasmini tanlang." },
    });
    form.set("image", new File(["x"], "b.png", { type: "image/png" }));
    apiFetch.mockResolvedValueOnce(respond(201, bannerFixture));
    const created = await saveBanner(null, form, null, KEY, CSRF);
    const [path, request] = apiFetch.mock.calls[0]!;
    expect(path).toBe("/api/v1/admin/banners/");
    expect(request.method).toBe("POST");
    expect(request.idempotencyKey).toBe(KEY);
    expect(
      Object.fromEntries(
        [...request.formData.entries()].filter(([k]: [string, unknown]) => k !== "image"),
      ),
    ).toEqual({
      "title.uz": "Kuzgi chegirmalar",
      "title.ru": "",
      "title.en": "",
      "link.kind": "product",
      "link.product_id": "4",
      "link.category": "",
      is_active: "true",
      starts_at: "",
      ends_at: "2026-11-30T00:00:00+05:00",
    });
    expect(created).toMatchObject({ ok: true, data: { id: "1", link: { productId: "4" } } });

    form.delete("image");
    const loaded = {
      title: { uz: "Kuzgi chegirmalar", ru: "", en: "" },
      link: { kind: "product" as const, productId: "4", category: null },
      isActive: true,
      startsAt: null,
      endsAt: "2026-11-30T00:00:00+05:00",
    };
    // An image-less update is JSON with only the changed fields: the unchanged
    // link (to a product that may be hidden by now) is not resent.
    form.set("isActive", "false");
    apiFetch.mockResolvedValueOnce(respond(200, { ...bannerFixture, is_active: false }));
    await saveBanner("1", form, loaded, KEY, CSRF);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/banners/1/",
      expect.objectContaining({ method: "PATCH", body: { is_active: false } }),
    );
    expect(apiFetch.mock.calls[1]![1].formData).toBeUndefined();
    // A changed link is sent whole.
    form.set("link.kind", "none");
    apiFetch.mockResolvedValueOnce(respond(200, bannerFixture));
    await saveBanner("1", form, { ...loaded, isActive: false }, KEY, CSRF);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/banners/1/",
      expect.objectContaining({
        body: { link: { kind: "none", product_id: null, category: null } },
      }),
    );
    // Nothing changed → no PATCH; the banner is read back.
    apiFetch.mockResolvedValueOnce(respond(200, bannerFixture));
    await saveBanner(
      "1",
      form,
      { ...loaded, isActive: false, link: { kind: "none", productId: null, category: null } },
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/banners/1/",
      expect.not.objectContaining({ method: "PATCH" }),
    );
    form.set("link.kind", "product");
    form.set("isActive", "true");

    // Window order is checked before the round trip.
    form.set("startsAt", "2026-12-01T00:00:00+05:00");
    expect(await saveBanner("1", form, loaded, KEY, CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { endsAt: "Tugash vaqti boshlanish vaqtidan keyin bo‘lsin." },
    });

    apiFetch.mockResolvedValueOnce(respond(204, undefined));
    expect(await deleteBanner("1", CSRF)).toEqual({ ok: true, data: { id: "1" } });
    apiFetch.mockResolvedValueOnce(respond(200, { results: [bannerFixture] }));
    expect(await reorderBanners(["1"], CSRF)).toMatchObject({ ok: true, data: [{ id: "1" }] });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/banners/order/",
      expect.objectContaining({ method: "PUT", body: { ids: [1] } }),
    );
  });
});

describe("orders", () => {
  it("cancelOrder validates the reason (3..500) and returns the field error", async () => {
    const short = await cancelOrder(10248, "ab", KEY, CSRF);
    expect(short).toEqual({
      ok: false,
      error: "Sababni kiriting.",
      fieldErrors: { reason: "Kamida 3 ta belgi kiriting." },
    });
    const long = await cancelOrder(10248, "x".repeat(501), KEY, CSRF);
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.fieldErrors?.reason).toBe("500 belgidan oshmasin.");
  });

  it("cancelOrder adds the cancellation, the reversal entries and the history row", async () => {
    const before = await getOrder(10248);
    expect(before && canCancel(before)).toBe(true);
    const result = await cancelOrder(10248, "  mijoz so‘rovi bilan  ", KEY, CSRF);
    expect(result.ok).toBe(true);
    if (!result.ok || !before) return;
    const order = result.data;
    expect(order.id).toBe(10248);
    expect(order.status).toBe("cancelled");
    expect(order.cancellation).toEqual({ reason: "admin", note: "mijoz so‘rovi bilan" });
    const reversals = order.cashback.filter((e) => e.kind === "reversal");
    expect(reversals).toHaveLength(before.cashback.filter((e) => e.kind !== "reversal").length);
    expect(order.cashback.slice(0, before.cashback.length)).toEqual(before.cashback);
    expect(order.history).toHaveLength(before.history.length + 1);
    expect(order.history[0]).toMatchObject({
      at: DEMO_NOW_ISO,
      title: "Bekor qilindi",
      source: "admin",
      status: "cancelled",
    });
    expect(order.history[0]?.note).toContain("mijoz so‘rovi bilan");
    if (before.payment.status === "paid") expect(order.payment.status).toBe("refunded");
  });

  it("cancelOrder reports an unknown order as not_found", async () => {
    expect(await cancelOrder(999, "mijoz so‘rovi bilan", KEY, CSRF)).toMatchObject({
      ok: false,
      code: "not_found",
    });
  });

  it("changeOrderStatus appends the history row for an allowed transition only", async () => {
    const before = await getOrder(10248);
    const [next] = before ? manualTransitions(before) : [];
    expect(next).toBeDefined();
    if (!before || !next) return;
    const result = await changeOrderStatus(10248, next, KEY, CSRF);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe(next);
    expect(result.data.history).toHaveLength(before.history.length + 1);
    expect(result.data.history[0]).toMatchObject({
      at: DEMO_NOW_ISO,
      source: "admin",
      status: next,
      note: "Administrator · holat qo‘lda o‘zgartirildi · mijozga push yuborildi",
    });

    expect(await changeOrderStatus(10248, "awaiting_payment", KEY, CSRF)).toEqual({
      ok: false,
      error: "Bu holatga o‘tib bo‘lmaydi.",
    });
    const invalid = await changeOrderStatus(10248, "shipped" as never, KEY, CSRF);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.fieldErrors?.status).toBeDefined();
  });

  it("retryShipment sets the shipment to created with a tracking number", async () => {
    const failed = ORDER_SUMMARIES.find((o) => o.shipment.state === "failed");
    expect(failed).toBeDefined();
    if (!failed) return;
    const result = await retryShipment(failed.id, KEY, CSRF);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.shipment).toEqual({
      state: "created",
      trackingNumber: String(48_214_000 + (failed.id % 1000)),
      tariff: result.data.deliveryFee,
      updatedAt: DEMO_NOW_ISO,
      via: "webhook",
    });
    expect(result.data.history[0]).toMatchObject({
      title: "BTS buyurtmasi yaratildi",
      source: "admin",
    });

    const created = ORDER_SUMMARIES.find((o) => o.shipment.state === "created");
    if (created) {
      expect(await retryShipment(created.id, KEY, CSRF)).toEqual({
        ok: false,
        error: "BTS buyurtmasi allaqachon yaratilgan.",
      });
    }
  });
});

describe("products", () => {
  const product = PRODUCTS.find((p) => p.status === "active" && p.images.length > 0)!;
  const values: ProductFormValues = {
    texts: structuredClone(product.texts),
    price: product.price + 10_000,
    category: product.category ?? "serums",
    billzId: product.billzId,
    promo: product.promo,
    status: "active",
    images: structuredClone(product.images),
  };

  it("saveProduct re-validates with productFormSchema and maps field errors", async () => {
    const result = await saveProduct(
      product.id,
      { ...values, texts: { ...values.texts, uz: { ...values.texts.uz, name: "A" } }, price: 10 },
      null,
      KEY,
      CSRF,
    );
    expect(result).toEqual({
      ok: false,
      error: "Maydonlarni tekshiring.",
      fieldErrors: {
        "texts.uz.name": "O‘zbekcha nomni kiriting (kamida 2 belgi).",
        price: "Narx kamida 1 000 so‘m bo‘lsin.",
      },
    });
  });

  it("saveProduct patches an existing product and notes the price change", async () => {
    const result = await saveProduct(product.id, values, null, KEY, CSRF);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.id).toBe(product.id);
    expect(result.data.price).toBe(product.price + 10_000);
    expect(result.data.stock).toBe(product.stock);
    expect(result.data.lastChange).toMatchObject({ by: "Administrator", at: DEMO_NOW_ISO });
    expect(result.data.lastChange?.note).toMatch(/^narx /);
  });

  it("saveProduct creates a hidden draft and later activates it by id", async () => {
    const created = await saveProduct(
      null,
      { ...values, billzId: "123456789", status: "hidden", images: [] },
      null,
      KEY,
      CSRF,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.data.id).toBe("draft-123456789");
    expect(created.data.lastChange?.note).toBe("mahsulot yaratildi");

    const activated = await saveProduct(
      created.data.id,
      { ...values, billzId: "123456789", status: "active", images: [{ id: "img-1", label: "a" }] },
      null,
      KEY,
      CSRF,
    );
    expect(activated.ok).toBe(true);
    if (activated.ok)
      expect(activated.data).toMatchObject({ id: "draft-123456789", status: "active" });

    expect(await saveProduct("missing", values, null, KEY, CSRF)).toMatchObject({
      code: "not_found",
    });
  });

  it("image actions validate the file, ids and order", async () => {
    const form = new FormData();
    form.set("file", new File(["x"], "photo.gif", { type: "image/gif" }));
    expect(await uploadProductImage(product.id, form, CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { file: "Faqat JPEG, PNG yoki WebP rasm." },
    });
    form.set("file", new File(["x"], "photo.jpg", { type: "image/jpeg" }));
    const uploaded = await uploadProductImage(product.id, form, CSRF);
    expect(uploaded.ok).toBe(true);
    if (uploaded.ok)
      expect(uploaded.data).toEqual({ id: expect.stringMatching(/^img-/), label: "photo.jpg" });

    expect(await deleteProductImage(product.id, "img-1", CSRF)).toEqual({
      ok: true,
      data: { id: "img-1" },
    });
    expect(await reorderProductImages(product.id, ["b", "a"], CSRF)).toEqual({
      ok: true,
      data: { imageIds: ["b", "a"] },
    });
    expect(await reorderProductImages(product.id, ["a", "a"], CSRF)).toMatchObject({ ok: false });
    expect(
      await reorderProductImages(
        product.id,
        Array.from({ length: 9 }, (_, i) => `i${i}`),
        CSRF,
      ),
    ).toMatchObject({
      ok: false,
    });
  });
});

describe("adjustCashback", () => {
  it("validates the amount (int 1..10 000 000) and the reason (3..300) under the dialog's field names", async () => {
    const result = await adjustCashback(
      "5",
      { direction: "add", amount: 0.5, reason: "ab" },
      KEY,
      CSRF,
    );
    expect(result).toEqual({
      ok: false,
      error: "Maydonlarni tekshiring.",
      fieldErrors: { amount: "Summani kiriting.", reason: "Kamida 3 ta belgi kiriting." },
    });
    const big = await adjustCashback(
      "5",
      { direction: "add", amount: 10_000_001, reason: "abc" },
      KEY,
      CSRF,
    );
    expect(big).toMatchObject({ fieldErrors: { amount: "Summa juda katta." } });
  });

  it("refuses to take the fixture balance below zero", async () => {
    const result = await adjustCashback(
      "5",
      { direction: "subtract", amount: 48_601, reason: "xato tuzatish" },
      KEY,
      CSRF,
    );
    expect(result).toEqual({
      ok: false,
      error: "Balans manfiy bo‘lib qoladi.",
      fieldErrors: { amount: "Balansdan ko‘p ayirib bo‘lmaydi." },
    });
  });

  it("returns the signed ledger entry and no server balance in mock mode", async () => {
    const result = await adjustCashback(
      "5",
      { direction: "subtract", amount: 2_000, reason: "  kassa xatosi  " },
      KEY,
      CSRF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.balance).toBeUndefined();
    expect(result.data.entry).toEqual({
      id: expect.stringMatching(/^adj-/),
      at: DEMO_NOW_ISO,
      kind: "adjustment",
      source: "Administrator",
      note: "kassa xatosi",
      amount: -2_000,
    });
    expect(ledgerBalance([result.data.entry])).toBe(-2_000);
    expect(
      await adjustCashback("no-such", { direction: "add", amount: 1, reason: "abc" }, KEY, CSRF),
    ).toMatchObject({ code: "not_found" });
  });
});

describe("saveCashbackPolicy", () => {
  const draft = { ...ACTIVE_POLICY, effectiveFrom: "2026-11-01T00:00:00+05:00" };

  it("returns version n+1, scheduled, with the added-tier summary", async () => {
    const result = await saveCashbackPolicy(
      {
        ...draft,
        tiers: [...draft.tiers, { id: "tier-4", from: 50_000_000, to: null, percent: 4 }],
      },
      KEY,
      CSRF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.policy.version).toBe(4);
    expect(result.data.policy.tiers).toHaveLength(4);
    expect(result.data.version).toEqual({
      version: 4,
      summary: "50\u00a0mln dan: 4% qo‘shildi",
      author: "Administrator",
      period: "1-noy 2026 dan",
      active: false,
      scheduled: true,
    });
    expect(result.data.warnings).toBeUndefined();
  });

  it("diffs the summary by (from, to, percent) and strips the NBSP mln suffix", async () => {
    const renamed = draft.tiers.map((t) => ({ ...t, id: `${t.id}-x` }));
    const same = await saveCashbackPolicy(
      { ...draft, tiers: renamed, basis: "with_purchase" },
      KEY,
      CSRF,
    );
    expect(same.ok && same.data.version.summary).toBe("Hisoblash qoidalari yangilandi");

    const bounded = await saveCashbackPolicy(
      {
        ...draft,
        tiers: [...draft.tiers, { id: "tier-4", from: 50_000_000, to: 80_000_000, percent: 4 }],
      },
      KEY,
      CSRF,
    );
    expect(bounded.ok && bounded.data.version.summary).toBe("50–80\u00a0mln: 4% qo‘shildi");

    const changed = await saveCashbackPolicy(
      { ...draft, tiers: draft.tiers.map((t, i) => (i === 0 ? { ...t, percent: 1.5 } : t)) },
      KEY,
      CSRF,
    );
    expect(changed.ok && changed.data.version.summary).toBe("Darajalar yangilandi");

    const fewer = await saveCashbackPolicy({ ...draft, tiers: draft.tiers.slice(0, 2) }, KEY, CSRF);
    expect(fewer.ok && fewer.data.version.summary).toBe("Daraja olib tashlandi");
  });

  it("applies the domain tier rules and the percent bounds", async () => {
    expect(await saveCashbackPolicy({ ...draft, tiers: [] }, KEY, CSRF)).toEqual({
      ok: false,
      error: "Kamida bitta daraja kerak.",
    });
    const overlapping = [
      { id: "a", from: 0, to: 20_000_000, percent: 1 },
      { id: "b", from: 10_000_000, to: null, percent: 2 },
    ];
    expect(await saveCashbackPolicy({ ...draft, tiers: overlapping }, KEY, CSRF)).toEqual({
      ok: false,
      error: "Darajalar ustma-ust tushmoqda.",
    });
    const badPercent = await saveCashbackPolicy(
      { ...draft, tiers: [{ id: "a", from: 0, to: null, percent: 101 }] },
      KEY,
      CSRF,
    );
    expect(badPercent).toMatchObject({
      ok: false,
      fieldErrors: { "draft.tiers.0.percent": "Foiz 100 dan oshmasin." },
    });
    const decimals = await saveCashbackPolicy(
      { ...draft, tiers: [{ id: "a", from: 0, to: null, percent: 1.234 }] },
      KEY,
      CSRF,
    );
    expect(decimals).toMatchObject({
      fieldErrors: { "draft.tiers.0.percent": "Ko‘pi bilan 2 ta kasr raqam." },
    });
  });
});

describe("sendNotification", () => {
  it("validates title (3..60), body (5..180), phone (+998) and the schedule against requestNow()", async () => {
    const result = await sendNotification(
      notificationForm({
        title: "ab",
        body: "abc",
        audience: "one",
        phone: "+998 90 12",
        scheduledAt: "2026-10-24T11:00:00+05:00",
      }),
      KEY,
      CSRF,
    );
    expect(result).toEqual({
      ok: false,
      error: "Maydonlarni tekshiring.",
      fieldErrors: {
        title: "Sarlavhani kiriting (kamida 3 belgi).",
        body: "Xabar matnini kiriting.",
        phone: "Telefon raqamni +998 XX XXX XX XX ko‘rinishida kiriting.",
        scheduledAt: "Kelajakdagi vaqtni tanlang.",
      },
    });
    const long = await sendNotification(
      notificationForm({ title: "x".repeat(61), body: "y".repeat(181) }),
      KEY,
      CSRF,
    );
    expect(long).toMatchObject({
      fieldErrors: { title: "60 belgidan oshmasin.", body: "180 belgidan oshmasin." },
    });
    expect(
      await sendNotification(notificationForm({ audience: "group" }), KEY, CSRF),
    ).toMatchObject({
      fieldErrors: { segmentId: "Guruhni tanlang." },
    });
  });

  it("folds image problems into the top-level error", async () => {
    const result = await sendNotification(
      notificationForm({ image: new File(["x"], "banner.webp", { type: "image/webp" }) }),
      KEY,
      CSRF,
    );
    expect(result).toEqual({ ok: false, error: "Faqat JPG yoki PNG." });
  });

  it("returns the queued record for a send-now and the scheduled one for a later send", async () => {
    const now = await sendNotification(
      notificationForm({
        title: "  Yangi aksiya  ",
        image: new File(["x"], "b.png", { type: "image/png" }),
      }),
      KEY,
      CSRF,
    );
    expect(now.ok).toBe(true);
    if (now.ok) {
      expect(now.data).toEqual({
        id: expect.stringMatching(/^n-/),
        at: DEMO_NOW_ISO,
        kind: "promo",
        title: "Yangi aksiya",
        audienceLabel: "Barcha · 4\u00a0751",
        sent: null,
        delivered: null,
        state: "queued",
      });
    }
    const later = await sendNotification(
      notificationForm({
        audience: "one",
        phone: "+998 90 123 45 67",
        scheduledAt: "2026-10-26T10:00:00+05:00",
      }),
      KEY,
      CSRF,
    );
    expect(later.ok).toBe(true);
    if (later.ok) {
      expect(later.data).toMatchObject({
        at: "2026-10-26T10:00:00+05:00",
        audienceLabel: "Bitta mijoz · +998 90 123 45 67",
        state: "scheduled",
      });
    }
    const group = await sendNotification(
      notificationForm({ audience: "group", segmentId: "regular" }),
      KEY,
      CSRF,
    );
    expect(group.ok).toBe(true);
    if (group.ok) expect(group.data.audienceLabel).toBe("Doimiy mijozlar · 612");
  });
});

describe("updateAppointment", () => {
  it("applies confirm/reject/attend per the domain transition table", async () => {
    const requested = APPOINTMENTS.find((a) => a.status === "requested")!;
    const confirmed = APPOINTMENTS.find((a) => a.status === "confirmed")!;
    expect(appointmentActions("requested")).toEqual(["confirm", "reject"]);

    const confirm = await updateAppointment(requested.id, "confirm", KEY, CSRF);
    expect(confirm.ok && confirm.data).toEqual({ ...requested, status: "confirmed" });
    const reject = await updateAppointment(requested.id, "reject", KEY, CSRF);
    expect(reject.ok && reject.data.status).toBe("rejected");
    const attend = await updateAppointment(confirmed.id, "attend", KEY, CSRF);
    expect(attend.ok && attend.data.status).toBe("attended");

    expect(await updateAppointment(requested.id, "attend", KEY, CSRF)).toEqual({
      ok: false,
      error: "Bu amal ushbu holatda mumkin emas.",
    });
    expect(await updateAppointment("nope", "confirm", KEY, CSRF)).toMatchObject({
      code: "not_found",
    });
    expect(await updateAppointment(requested.id, "cancel" as never, KEY, CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { action: expect.any(String) },
    });
  });
});
