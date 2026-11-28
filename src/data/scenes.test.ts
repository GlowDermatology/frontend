import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { autoCrop, SHAPE_RATIO } from "@/domain/crop";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * The scene Server Actions (admin contract §2.20) in both data modes, and the scene mappers: the
 * api bodies and error remaps, refresh only on accept; the demo's queued → running → succeeded
 * jobs, its failing `marble`, its overlay that must be acknowledged and its `fit` crops.
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
import { mapSceneJob, mapSceneStatus, mapSceneTemplates, percent } from "./api/mappers/scenes";
import type { ApiSceneJob } from "./api/types";
import { acceptSceneJob, discardSceneJob, pollSceneJob, startSceneJob } from "./scenes.actions";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const originalSource = process.env.GLOWDERMA_DATA_SOURCE;
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });

const API_JOB: ApiSceneJob = {
  id: 12,
  product_id: 7,
  source_image_id: 3,
  kind: "ai_scene",
  template: { key: "spa", name: "Spa" },
  state: "succeeded",
  outcome: "pending",
  progress: null,
  result: {
    url: "http://m/c.webp",
    overlay_url: "http://m/o.webp",
    product_box: [0.3, 0.2, 0.7, 0.9],
    crops: { portrait: [0, 0, 1, 1], square: [0, 0.1, 1, 0.8] },
    generated_inside_pct: "3.50",
    occluded_pct: "6.00",
  },
  error: null,
  warnings: ["hand_removed"],
  banner: null,
  accepted_image_id: null,
  created_at: "2026-11-26T10:00:00Z",
  finished_at: "2026-11-26T10:00:30Z",
  expires_at: "2026-11-29T10:00:30Z",
  created_by: { id: 1, display_name: "Admin" } as ApiSceneJob["created_by"],
};

beforeEach(() => {
  delete process.env.GLOWDERMA_DATA_SOURCE;
  verifyStaff.mockReset();
  verifyStaff.mockResolvedValue({ ok: true, mode: "mock" });
  refresh.mockClear();
  apiFetch.mockReset();
});

afterEach(() => {
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
});

describe("scene mappers", () => {
  it("maps a job with its candidate, decimal strings as numbers", () => {
    expect(mapSceneJob(API_JOB)).toMatchObject({
      id: "12",
      productId: "7",
      sourceImageId: "3",
      kind: "ai_scene",
      template: { key: "spa", name: "Spa" },
      result: {
        url: "http://m/c.webp",
        overlayUrl: "http://m/o.webp",
        crops: { portrait: [0, 0, 1, 1], square: [0, 0.1, 1, 0.8] },
        generatedInsidePct: 3.5,
        occludedPct: 6,
      },
      warnings: ["hand_removed"],
    });
  });

  it("is defensive about the loose fields", () => {
    const odd = mapSceneJob({
      ...API_JOB,
      template: "spa",
      source_image_id: null,
      result: {
        ...API_JOB.result!,
        crops: { portrait: "x" } as never,
        generated_inside_pct: "n/a",
      },
      error: { code: "scene_product_cut_off", message: "Kesilgan." },
      state: "weird" as never,
    });
    expect(odd.template).toBeNull();
    expect(odd.sourceImageId).toBeNull();
    expect(odd.result?.crops).toEqual({ portrait: null, square: null });
    expect(odd.result?.generatedInsidePct).toBe(0);
    expect(odd.state).toBe("failed");
    expect(odd.error).toEqual({ code: "scene_product_cut_off", message: "Kesilgan." });
    expect(percent("12.50")).toBe(12.5);
  });

  it("maps the status and drops templates it cannot show", () => {
    expect(
      mapSceneStatus({
        enabled: false,
        ai_enabled: true,
        max_occluded_pct: "15.00",
        segmenter: "bria",
      }),
    ).toEqual({ enabled: false, aiEnabled: false, maxOccludedPct: 15 });
    expect(
      mapSceneTemplates([
        {
          id: 1,
          key: "white",
          kind: "studio",
          name: "Oq",
          colours: ["#ffffff", "red"],
          preview_url: "http://m/scene-previews/white.webp",
          names: { uz: "Oq", ru: "Белый", en: "White" },
          text: "",
          reference_url: null,
          reference_source: "",
          enabled: true,
          saved_by_staff: false,
        },
        {
          id: 2,
          key: "odd",
          kind: "other" as never,
          name: "",
          colours: [],
          preview_url: null,
          names: {},
          text: "",
          reference_url: null,
          reference_source: "",
          enabled: true,
          saved_by_staff: false,
        },
      ]),
    ).toEqual([
      {
        id: "1",
        key: "white",
        kind: "studio",
        name: "Oq",
        colours: ["#ffffff"],
        previewUrl: "http://m/scene-previews/white.webp",
        names: { uz: "Oq", ru: "Белый", en: "White" },
        text: "",
        referenceUrl: null,
        referenceSource: "",
        savedByStaff: false,
      },
    ]);
  });
});

describe("scene actions — api mode", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  });

  it("starts with the template id as a number, keyed, without a refresh", async () => {
    apiFetch.mockResolvedValueOnce(respond(202, { ...API_JOB, state: "queued", result: null }));
    const result = await startSceneJob("7", "3", { kind: "ai_scene", templateId: "5" }, KEY, CSRF);
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/products/7/images/3/scenes/",
      expect.objectContaining({
        method: "POST",
        body: { kind: "ai_scene", template_id: 5 },
        idempotencyKey: KEY,
      }),
    );
    expect(result).toMatchObject({ ok: true, data: { id: "12", state: "queued" } });
    apiFetch.mockResolvedValueOnce(respond(202, { ...API_JOB, kind: "fit", result: null }));
    await startSceneJob("7", "3", { kind: "fit" }, KEY, CSRF);
    expect(apiFetch.mock.calls[1]![1].body).toEqual({ kind: "fit" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses a scene without a template before the round trip, and maps template_id", async () => {
    expect(await startSceneJob("7", "3", { kind: "studio" }, KEY, CSRF)).toMatchObject({
      ok: false,
      fieldErrors: { "request.templateId": expect.any(String) },
    });
    expect(apiFetch).not.toHaveBeenCalled();
    apiFetch.mockRejectedValueOnce(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "template_id", code: "invalid", message: "Shablon topilmadi." }],
        request_id: "r",
      }),
    );
    expect(
      await startSceneJob("7", "3", { kind: "studio", templateId: "9" }, KEY, CSRF),
    ).toMatchObject({ ok: false, fieldErrors: { templateId: "Shablon topilmadi." } });
  });

  it("accepts with make_main and the acknowledgement, maps the new image, refreshes", async () => {
    apiFetch.mockResolvedValueOnce(
      respond(200, {
        job: { ...API_JOB, outcome: "accepted", accepted_image_id: 50 },
        image: {
          id: 50,
          url: "http://m/s.webp",
          thumbnail_url: "http://m/s_400.webp",
          medium_url: "http://m/s_1000.webp",
          position: 0,
          alt: {},
          width: 1600,
          height: 2000,
          source: "ai_scene",
          derived_from_id: 3,
          product_box: null,
          renditions: { portrait: null, square: null },
        },
      }),
    );
    const result = await acceptSceneJob(
      "12",
      { makeMain: true, acknowledgeGenerated: true },
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/scenes/jobs/12/accept/",
      expect.objectContaining({
        body: { make_main: true, acknowledge_generated: true },
        idempotencyKey: KEY,
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      data: { image: { id: "50", media: { source: "ai_scene", derivedFromId: "3" } } },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("puts a full gallery in the whole message, keeps the acknowledgement a field error", async () => {
    apiFetch.mockRejectedValueOnce(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "images", code: "max_items", message: "Ko‘pi bilan 8 ta rasm." }],
        request_id: "r",
      }),
    );
    expect(
      await acceptSceneJob("12", { makeMain: false, acknowledgeGenerated: true }, KEY, CSRF),
    ).toMatchObject({ ok: false, error: "Ko‘pi bilan 8 ta rasm." });
    apiFetch.mockRejectedValueOnce(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "acknowledge_generated", code: "required", message: "Tasdiqlang." }],
        request_id: "r",
      }),
    );
    expect(
      await acceptSceneJob("12", { makeMain: false, acknowledgeGenerated: false }, KEY, CSRF),
    ).toMatchObject({ ok: false, fieldErrors: { acknowledgeGenerated: "Tasdiqlang." } });
  });

  it("polls and discards without a refresh", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, API_JOB));
    expect(await pollSceneJob("12", CSRF)).toMatchObject({ ok: true, data: { id: "12" } });
    apiFetch.mockResolvedValueOnce(respond(200, { ...API_JOB, outcome: "discarded" }));
    expect(await discardSceneJob("12", KEY, CSRF)).toMatchObject({
      ok: true,
      data: { outcome: "discarded" },
    });
    expect(apiFetch.mock.calls[1]![0]).toBe("/api/v1/admin/scenes/jobs/12/discard/");
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("scene actions — mock mode", () => {
  it("runs queued → running → succeeded, then accepts a new gallery photo", async () => {
    const started = await startSceneJob(
      "1",
      "img-1",
      { kind: "studio", templateId: "1" },
      KEY,
      CSRF,
    );
    expect(started).toMatchObject({ ok: true, data: { state: "queued", kind: "studio" } });
    const id = started.ok ? started.data.id : "";
    expect(await pollSceneJob(id, CSRF)).toMatchObject({ ok: true, data: { state: "running" } });
    const done = await pollSceneJob(id, CSRF);
    expect(done).toMatchObject({ ok: true, data: { state: "succeeded", outcome: "pending" } });
    expect(done.ok && done.data.result?.url).toBe("/mock/scene-candidate.webp");
    const accepted = await acceptSceneJob(
      id,
      { makeMain: true, acknowledgeGenerated: false },
      KEY,
      CSRF,
    );
    expect(accepted).toMatchObject({
      ok: true,
      data: {
        job: { outcome: "accepted" },
        image: {
          src: "/mock/scene-candidate.webp",
          media: { source: "studio", derivedFromId: "img-1" },
        },
      },
    });
    // Reviewed: a second accept or a discard is refused.
    expect(await discardSceneJob(id, KEY, CSRF)).toMatchObject({
      ok: false,
      code: "scene_job_not_ready",
    });
    // Every start is a new job.
    const again = await startSceneJob("1", "img-1", { kind: "studio", templateId: "1" }, KEY, CSRF);
    expect(again.ok && again.data.id).not.toBe(id);
  });

  it("fails `marble` like a cut-off product", async () => {
    const started = await startSceneJob(
      "1",
      "img-1",
      { kind: "studio", templateId: "3" },
      KEY,
      CSRF,
    );
    const id = started.ok ? started.data.id : "";
    await pollSceneJob(id, CSRF);
    expect(await pollSceneJob(id, CSRF)).toMatchObject({
      ok: true,
      data: { state: "failed", error: { code: "scene_product_cut_off" } },
    });
  });

  it("needs the acknowledgement for `spa`, which drew part of the product", async () => {
    const started = await startSceneJob(
      "1",
      "img-1",
      { kind: "ai_scene", templateId: "5" },
      KEY,
      CSRF,
    );
    const id = started.ok ? started.data.id : "";
    await pollSceneJob(id, CSRF);
    const done = await pollSceneJob(id, CSRF);
    expect(done.ok && done.data.result?.overlayUrl).toBe("/mock/scene-overlay.webp");
    expect(
      await acceptSceneJob(id, { makeMain: false, acknowledgeGenerated: false }, KEY, CSRF),
    ).toMatchObject({ ok: false, fieldErrors: { acknowledgeGenerated: expect.any(String) } });
    expect(
      await acceptSceneJob(id, { makeMain: false, acknowledgeGenerated: true }, KEY, CSRF),
    ).toMatchObject({ ok: true, data: { image: { media: { source: "ai_scene" } } } });
  });

  it("proposes fit crops closer than the automatic framing; accepting writes them on the photo", async () => {
    const started = await startSceneJob("1", "img-1", { kind: "fit" }, KEY, CSRF);
    const id = started.ok ? started.data.id : "";
    await pollSceneJob(id, CSRF);
    const done = await pollSceneJob(id, CSRF);
    const crops = done.ok ? done.data.result!.crops : null;
    const box = [0.34, 0.12, 0.66, 0.9];
    expect(crops?.portrait).not.toEqual(
      autoCrop(SHAPE_RATIO.portrait, { width: 1200, height: 1500 }, box),
    );
    const accepted = await acceptSceneJob(
      id,
      { makeMain: false, acknowledgeGenerated: false },
      KEY,
      CSRF,
    );
    expect(accepted).toMatchObject({
      ok: true,
      data: {
        image: {
          id: "img-1",
          media: { renditions: { portrait: { mode: "auto", crop: crops!.portrait } } },
        },
      },
    });
  });
});
