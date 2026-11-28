import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * AI banner images (admin contract §2.20.8): `startBannerImage` and `saveBanner` with a finished
 * image (`imageJobId`) in both data modes, and the job's `banner` mapper.
 */

const verifyStaff = vi.fn<(options?: VerifyStaffOptions) => Promise<StaffSession>>();
const refresh = vi.fn();
const apiFetch = vi.fn();

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("./auth", () => ({
  verifyStaff: (options?: VerifyStaffOptions) => verifyStaff(options),
  requireApiToken: async () => "t",
}));
vi.mock("./mock/delay", () => ({ delay: async () => undefined }));
vi.mock("./api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  cachedGet: vi.fn(),
  apiFetchRaw: vi.fn(),
  buildQuery: () => "",
}));

import { ApiError } from "./api/errors";
import { mapBannerInfo, mapSceneJob } from "./api/mappers/scenes";
import type { ApiSceneJob } from "./api/types";
import { saveBanner } from "./banners.actions";
import { bannerFormDataFromValues, type BannerFormValues } from "./banners.schema";
import { MOCK_BANNER_FAILING_PRODUCT, MOCK_BANNER_URL } from "./mock/banner-images";
import { pollSceneJob, startBannerImage } from "./scenes.actions";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const originalSource = process.env.GLOWDERMA_DATA_SOURCE;
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });

const API_JOB: ApiSceneJob = {
  id: 40,
  product_id: null,
  source_image_id: null,
  kind: "banner",
  template: { key: "marble", name: "Marmar" },
  state: "succeeded",
  outcome: "pending",
  progress: null,
  result: {
    url: "http://m/scene-candidates/40-banner.webp",
    overlay_url: null,
    product_box: null,
    crops: { portrait: [], square: [] },
    generated_inside_pct: "0.00",
    occluded_pct: "0.00",
  },
  error: null,
  warnings: [],
  accepted_image_id: null,
  banner: {
    mode: "products",
    products: [
      { id: 7, name: "Serum" },
      { id: 9, name: "Krem" },
    ],
    failed_product: null,
    web_crop: [0.03488, 0, 0.93023, 1],
    accepted_banner_id: null,
  },
  created_at: "2026-11-28T08:00:00Z",
  finished_at: "2026-11-28T08:01:00Z",
  expires_at: "2026-12-01T08:01:00Z",
  created_by: { id: 1, display_name: "Admin" },
};

const VALUES: BannerFormValues = {
  title: { uz: "Yangi kolleksiya", ru: "", en: "" },
  link: { kind: "none", productId: null, category: null, url: null },
  isActive: true,
  startsAt: null,
  endsAt: null,
};

beforeEach(() => {
  apiFetch.mockReset();
  refresh.mockReset();
  verifyStaff.mockResolvedValue({ ok: true, mode: "mock" });
});

afterEach(() => {
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
});

describe("the banner image mapper", () => {
  it("maps the job's banner facts", () => {
    expect(mapSceneJob(API_JOB).banner).toEqual({
      mode: "products",
      products: [
        { id: "7", name: "Serum" },
        { id: "9", name: "Krem" },
      ],
      failedProduct: null,
      webCrop: [0.03488, 0, 0.93023, 1],
      acceptedBannerId: null,
    });
  });

  it("is defensive and null for a product photo's job", () => {
    expect(mapBannerInfo(null)).toBeNull();
    expect(
      mapBannerInfo({
        mode: "odd" as never,
        products: [{ id: "x" as never, name: 3 as never }, null as never],
        failed_product: { id: 9, name: "Krem" },
        web_crop: [1] as never,
        accepted_banner_id: 5,
      }),
    ).toEqual({
      mode: "scene",
      products: [{ id: "x", name: "" }],
      failedProduct: { id: "9", name: "Krem" },
      webCrop: [expect.closeTo(0.0349, 3), 0, expect.closeTo(0.9302, 3), 1],
      acceptedBannerId: "5",
    });
  });
});

describe("banner images — api mode", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  });

  it("starts with products and a template as numbers, keyed, without a refresh", async () => {
    apiFetch.mockResolvedValueOnce(respond(202, { ...API_JOB, state: "queued", result: null }));
    const result = await startBannerImage(
      { mode: "products", productIds: ["7", "9"], templateId: "4" },
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/scenes/banner-images/",
      expect.objectContaining({
        method: "POST",
        body: { mode: "products", product_ids: [7, 9], template_id: 4 },
        idempotencyKey: KEY,
      }),
    );
    expect(result).toMatchObject({ ok: true, data: { id: "40", state: "queued" } });
    apiFetch.mockResolvedValueOnce(respond(202, { ...API_JOB, state: "queued", result: null }));
    await startBannerImage(
      { mode: "scene", productIds: [], customPrompt: "  ipak   va iliq yorug‘lik " },
      KEY,
      CSRF,
    );
    expect(apiFetch.mock.calls[1]![1].body).toEqual({
      mode: "scene",
      product_ids: [],
      custom_prompt: "ipak va iliq yorug‘lik",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses a bad request before the round trip and maps product_ids", async () => {
    for (const request of [
      { mode: "products" as const, productIds: [], templateId: "4" },
      { mode: "products" as const, productIds: ["1", "1"], templateId: "4" },
      { mode: "products" as const, productIds: ["1", "2", "3", "4"], templateId: "4" },
      { mode: "scene" as const, productIds: ["1"], templateId: "4" },
      { mode: "scene" as const, productIds: [] },
    ]) {
      expect(await startBannerImage(request, KEY, CSRF)).toMatchObject({ ok: false });
    }
    expect(apiFetch).not.toHaveBeenCalled();
    apiFetch.mockRejectedValueOnce(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [
          {
            field: "product_ids",
            code: "invalid",
            message: "Rasmsiz krem: Tanlangan mahsulotlardan birida rasm yo‘q.",
          },
        ],
        request_id: "r",
      }),
    );
    expect(
      await startBannerImage({ mode: "products", productIds: ["5"], templateId: "4" }, KEY, CSRF),
    ).toMatchObject({
      ok: false,
      fieldErrors: { productIds: "Rasmsiz krem: Tanlangan mahsulotlardan birida rasm yo‘q." },
    });
  });

  it("saves a new banner with the image: every field, then a refresh", async () => {
    apiFetch.mockResolvedValueOnce(
      respond(200, {
        job: { ...API_JOB, outcome: "accepted" },
        banner: {
          id: 12,
          title: { uz: "Yangi kolleksiya", ru: "", en: "" },
          image_url: "http://m/banners/12/x.webp",
          image_thumbnail_url: "",
          image_medium_url: "",
          link: { kind: "none", product_id: null, category: null, url: null },
          is_active: true,
          starts_at: null,
          ends_at: null,
          position: 0,
          created_at: "2026-11-28T08:02:00Z",
          updated_at: "2026-11-28T08:02:00Z",
        },
      }),
    );
    const result = await saveBanner(
      null,
      bannerFormDataFromValues(VALUES, null),
      null,
      KEY,
      CSRF,
      "40",
    );
    expect(result).toMatchObject({ ok: true, data: { id: "12" } });
    const [path, init] = apiFetch.mock.calls[0]!;
    expect(path).toBe("/api/v1/admin/scenes/jobs/40/banner/");
    expect(init).toMatchObject({ method: "POST", idempotencyKey: KEY });
    expect(init.body.banner_id).toBeNull();
    expect(init.body.banner).toMatchObject({
      title: { uz: "Yangi kolleksiya" },
      link: { kind: "none" },
      is_active: true,
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("updates an existing banner with only its changes, and refuses a file and a job together", async () => {
    apiFetch.mockRejectedValueOnce(
      new ApiError(409, {
        code: "scene_job_not_ready",
        message: "Natija tayyor emas.",
        errors: [],
        request_id: "r",
      }),
    );
    const changed = { ...VALUES, title: { ...VALUES.title, uz: "Qish" } };
    const result = await saveBanner(
      "12",
      bannerFormDataFromValues(changed, null),
      VALUES,
      KEY,
      CSRF,
      "40",
    );
    expect(result).toMatchObject({ ok: false, code: "scene_job_not_ready" });
    expect(apiFetch.mock.calls[0]![1].body).toEqual({
      banner_id: 12,
      banner: { title: { uz: "Qish" } },
    });
    const file = new File([new Uint8Array([137, 80, 78, 71])], "b.png", { type: "image/png" });
    const both = await saveBanner(
      "12",
      bannerFormDataFromValues(changed, file),
      VALUES,
      KEY,
      CSRF,
      "40",
    );
    expect(both).toMatchObject({ ok: false });
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});

describe("banner images — mock mode", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "mock";
  });

  it("queues, runs, succeeds, and a banner saved with it shows the picture once", async () => {
    const started = await startBannerImage(
      { mode: "products", productIds: ["1", "2"], templateId: "4" },
      KEY,
      CSRF,
    );
    expect(started).toMatchObject({ ok: true, data: { state: "queued" } });
    const id = started.ok ? started.data.id : "";
    expect(await pollSceneJob(id, CSRF)).toMatchObject({ ok: true, data: { state: "running" } });
    const done = await pollSceneJob(id, CSRF);
    expect(done).toMatchObject({
      ok: true,
      data: {
        state: "succeeded",
        result: { url: MOCK_BANNER_URL },
        banner: { mode: "products", products: [{ id: "1" }, { id: "2" }] },
      },
    });
    const saved = await saveBanner(
      null,
      bannerFormDataFromValues(VALUES, null),
      null,
      KEY,
      CSRF,
      id,
    );
    expect(saved).toMatchObject({ ok: true, data: { imageUrl: MOCK_BANNER_URL } });
    const again = await saveBanner(
      null,
      bannerFormDataFromValues(VALUES, null),
      null,
      KEY,
      CSRF,
      id,
    );
    expect(again).toMatchObject({ ok: false, code: "scene_job_not_ready" });
  });

  it("a product whose photo cannot be used fails, naming it", async () => {
    const started = await startBannerImage(
      { mode: "products", productIds: [MOCK_BANNER_FAILING_PRODUCT], templateId: "4" },
      KEY,
      CSRF,
    );
    const id = started.ok ? started.data.id : "";
    await pollSceneJob(id, CSRF);
    const failed = await pollSceneJob(id, CSRF);
    expect(failed).toMatchObject({
      ok: true,
      data: {
        state: "failed",
        error: { code: "banner_product_photo_unusable" },
        banner: { failedProduct: { id: MOCK_BANNER_FAILING_PRODUCT } },
      },
    });
  });
});
