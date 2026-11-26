import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { autoCrop, SHAPE_RATIO } from "@/domain/crop";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * `updateProductImageRenditions` (backend 0bcf0a5 `PUT …/images/{image_id}/renditions/`) in
 * both data modes: a shape the dialog did not touch is left out of the body (left out = kept,
 * `null` = removed), the dialog's idempotency key goes along, the answer maps to the image with
 * its shapes, and the per-shape refusals come back as field errors.
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
  getMe: async () => ({ id: 1, is_superuser: true }),
}));
vi.mock("./mock/delay", () => ({ delay: async () => undefined }));
vi.mock("./api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  cachedGet: vi.fn(),
  apiFetchRaw: vi.fn(),
  buildQuery: () => "",
}));

import { ApiError } from "./api/errors";
import { updateProductImageRenditions } from "./products.actions";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const originalSource = process.env.GLOWDERMA_DATA_SOURCE;
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });

const RENDITION = {
  crop: [0.1, 0.2, 0.8, 0.6],
  mode: "manual",
  url: "http://m/a_r11-1.webp",
  medium_url: "http://m/a_r11-1_1000.webp",
  thumbnail_url: "http://m/a_r11-1_400.webp",
};
const IMAGE = {
  id: 5,
  url: "http://m/a.webp",
  thumbnail_url: "http://m/a_400.webp",
  medium_url: "http://m/a_1000.webp",
  position: 0,
  alt: { uz: "Flakon" },
  width: 1200,
  height: 1600,
  source: "upload",
  derived_from_id: null,
  product_box: [0.4, 0.3, 0.6, 0.7],
  renditions: { portrait: null, square: RENDITION },
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

describe("updateProductImageRenditions — api mode", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  });

  it("sends only the changed shapes, keyed, and maps the answer", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, IMAGE));
    const result = await updateProductImageRenditions(
      "1",
      "5",
      { square: [0.1, 0.2, 0.8, 0.6] },
      KEY,
      CSRF,
    );
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/admin/products/1/images/5/renditions/",
      expect.objectContaining({ method: "PUT", idempotencyKey: KEY }),
    );
    const [, request] = apiFetch.mock.calls[0]!;
    // The untouched portrait is absent (kept), not null (removed).
    expect(request.body).toEqual({ square: [0.1, 0.2, 0.8, 0.6] });
    expect("portrait" in request.body).toBe(false);
    expect(result).toMatchObject({
      ok: true,
      data: {
        id: "5",
        src: "http://m/a_400.webp",
        alt: { uz: "Flakon", ru: "", en: "" },
        media: {
          width: 1200,
          height: 1600,
          url: "http://m/a.webp",
          mediumUrl: "http://m/a_1000.webp",
          source: "upload",
          productBox: [0.4, 0.3, 0.6, 0.7],
          renditions: {
            portrait: null,
            square: {
              crop: [0.1, 0.2, 0.8, 0.6],
              mode: "manual",
              thumbnailUrl: "http://m/a_r11-1_400.webp",
            },
          },
        },
      },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("passes auto and a removal as they are", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, IMAGE));
    await updateProductImageRenditions("1", "5", { portrait: "auto", square: null }, KEY, CSRF);
    expect(apiFetch.mock.calls[0]![1].body).toEqual({ portrait: "auto", square: null });
  });

  it("returns the server's per-shape refusals as field errors", async () => {
    apiFetch.mockRejectedValueOnce(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [
          {
            field: "square",
            code: "crop_too_small",
            message: "Kesilgan qism juda kichik: kamida 200 piksel bo‘lsin.",
          },
        ],
        request_id: "r",
      }),
    );
    const result = await updateProductImageRenditions(
      "1",
      "5",
      { square: [0, 0, 0.1, 0.075] },
      KEY,
      CSRF,
    );
    expect(result).toMatchObject({
      ok: false,
      code: "validation_error",
      fieldErrors: { square: "Kesilgan qism juda kichik: kamida 200 piksel bo‘lsin." },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses an empty change, an unknown shape or a bad key before the round trip", async () => {
    expect(await updateProductImageRenditions("1", "5", {}, KEY, CSRF)).toMatchObject({
      ok: false,
    });
    expect(
      await updateProductImageRenditions(
        "1",
        "5",
        { landscape: "auto" } as unknown as { portrait: "auto" },
        KEY,
        CSRF,
      ),
    ).toMatchObject({ ok: false });
    expect(
      await updateProductImageRenditions("1", "5", { portrait: "auto" }, "nope", CSRF),
    ).toMatchObject({ ok: false });
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe("updateProductImageRenditions — mock mode", () => {
  it("frames auto on the product box and keeps a shape left out", async () => {
    const result = await updateProductImageRenditions(
      "1",
      "img-1",
      { portrait: "auto" },
      KEY,
      CSRF,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const media = result.data.media!;
    expect(media.renditions.portrait).toMatchObject({
      mode: "auto",
      crop: autoCrop(SHAPE_RATIO.portrait, media, media.productBox),
    });
    expect(media.renditions.square).toBeNull();
    // The studio scene already has both shapes: removing one keeps the other.
    const scene = await updateProductImageRenditions("1", "img-2", { portrait: null }, KEY, CSRF);
    expect(scene.ok && scene.data.media?.renditions).toMatchObject({
      portrait: null,
      square: { mode: "manual" },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("answers the backend's per-shape codes in the admin language", async () => {
    const result = await updateProductImageRenditions(
      "1",
      "img-1",
      { portrait: [0, 0, 1, 0.5], square: [0, 0, 0.1, 0.08] },
      KEY,
      CSRF,
    );
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        portrait: "Kesish chegarasi rasm ichida va kerakli shaklda bo‘lishi kerak.",
        square: "Kesilgan qism juda kichik: kamida 200 piksel bo‘lsin.",
      },
    });
    expect(
      await updateProductImageRenditions("1", "nope", { square: "auto" }, KEY, CSRF),
    ).toMatchObject({ ok: false, code: "not_found" });
  });
});
