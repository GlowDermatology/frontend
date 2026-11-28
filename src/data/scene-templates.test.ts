import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession, VerifyStaffOptions } from "./auth";

/**
 * The scene template editor's Server Actions (admin contract §2.20.9) in both data modes, and the
 * template mapper's new fields.
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
import { mapSceneTemplate } from "./api/mappers/scenes";
import type { ApiSceneTemplate } from "./api/types";
import { getSceneTemplates } from "./mock/scenes";
import { makeTemplateReference, saveSceneTemplateEdits } from "./scene-templates.actions";

const KEY = "6f1c2a0e-9b8d-4c37-8a1e-2f3b4c5d6e7f";
const CSRF = "csrf-token";
const originalSource = process.env.GLOWDERMA_DATA_SOURCE;
const respond = (status: number, data: unknown) => ({ status, data, headers: new Headers() });

const API_TEMPLATE: ApiSceneTemplate = {
  id: 9,
  key: "staff-1a2b",
  kind: "ai_scene",
  name: "Stol",
  names: { uz: "Stol", ru: "Стол", en: "" },
  colours: [],
  preview_url: "http://m/scene-references/staff-1a2b.webp",
  reference_url: "http://m/scene-references/staff-1a2b.webp",
  reference_source: "upload",
  text: "oq marmar",
  enabled: true,
  saved_by_staff: true,
};

function form(values: Record<string, string | File>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) data.set(name, value);
  return data;
}

const picture = () =>
  new File([new Uint8Array([137, 80, 78, 71])], "scene.png", { type: "image/png" });

beforeEach(() => {
  apiFetch.mockReset();
  refresh.mockReset();
  verifyStaff.mockResolvedValue({ ok: true, mode: "mock" });
});

afterEach(() => {
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
});

describe("the template mapper", () => {
  it("maps names, words and the reference", () => {
    expect(mapSceneTemplate(API_TEMPLATE)).toMatchObject({
      id: "9",
      names: { uz: "Stol", ru: "Стол", en: "" },
      text: "oq marmar",
      referenceUrl: "http://m/scene-references/staff-1a2b.webp",
      referenceSource: "upload",
      savedByStaff: true,
    });
    expect(
      mapSceneTemplate({ ...API_TEMPLATE, reference_url: null, reference_source: "odd" }),
    ).toMatchObject({ referenceUrl: null, referenceSource: "" });
  });
});

describe("template edits — api mode", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "t", sid: null });
  });

  it("creates with dotted names, the words and the picture (multipart), then refreshes", async () => {
    apiFetch.mockResolvedValueOnce(respond(201, API_TEMPLATE));
    const result = await saveSceneTemplateEdits(
      null,
      form({
        "name.uz": " Stol ",
        "name.ru": "Стол",
        "name.en": "",
        text: "oq  marmar",
        reference: picture(),
      }),
      KEY,
      CSRF,
    );
    expect(result).toMatchObject({ ok: true, data: { id: "9", name: "Stol" } });
    const [path, init] = apiFetch.mock.calls[0]!;
    expect(path).toBe("/api/v1/admin/scenes/templates/");
    expect(init).toMatchObject({ method: "POST", idempotencyKey: KEY });
    const sent = init.formData as FormData;
    expect(sent.get("name.uz")).toBe("Stol");
    expect(sent.get("text")).toBe("oq marmar");
    expect((sent.get("reference") as File).name).toBe("scene.png");
    expect(refresh).toHaveBeenCalled();
  });

  it("edits with PATCH: hide, remove the picture; maps the server's field errors", async () => {
    apiFetch.mockResolvedValueOnce(respond(200, { ...API_TEMPLATE, enabled: false }));
    await saveSceneTemplateEdits(
      "9",
      form({ "name.uz": "Stol", enabled: "false", removeReference: "true" }),
      KEY,
      CSRF,
    );
    const [path, init] = apiFetch.mock.calls[0]!;
    expect(path).toBe("/api/v1/admin/scenes/templates/9/");
    expect(init.method).toBe("PATCH");
    expect((init.formData as FormData).get("enabled")).toBe("false");
    expect((init.formData as FormData).get("remove_reference")).toBe("true");
    apiFetch.mockRejectedValueOnce(
      new ApiError(400, {
        code: "validation_error",
        message: "Maydonlarni tekshiring.",
        errors: [{ field: "reference", code: "invalid", message: "Namuna rasmda mahsulot bor." }],
        request_id: "r",
      }),
    );
    expect(
      await saveSceneTemplateEdits("9", form({ reference: picture() }), KEY, CSRF),
    ).toMatchObject({ ok: false, fieldErrors: { reference: "Namuna rasmda mahsulot bor." } });
  });

  it("refuses an empty new template and a wrong file before the round trip", async () => {
    expect(
      await saveSceneTemplateEdits(null, form({ "name.uz": "Stol" }), KEY, CSRF),
    ).toMatchObject({ ok: false });
    const text = new File(["x"], "a.txt", { type: "text/plain" });
    expect(
      await saveSceneTemplateEdits(null, form({ "name.uz": "Stol", reference: text }), KEY, CSRF),
    ).toMatchObject({ ok: false });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("«Rasmini yaratish» starts the job without a refresh", async () => {
    apiFetch.mockResolvedValueOnce(
      respond(202, {
        id: 77,
        product_id: null,
        source_image_id: null,
        kind: "preview",
        template: null,
        state: "queued",
        outcome: "pending",
        progress: null,
        result: null,
        error: null,
        warnings: [],
        accepted_image_id: null,
        banner: null,
        created_at: "2026-11-28T08:00:00Z",
        finished_at: null,
        expires_at: null,
        created_by: { id: 1, display_name: "Admin" },
      }),
    );
    const result = await makeTemplateReference("9", KEY, CSRF);
    expect(result).toMatchObject({ ok: true, data: { id: "77", state: "queued" } });
    expect(apiFetch.mock.calls[0]![0]).toBe("/api/v1/admin/scenes/templates/9/reference/");
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("template edits — mock mode", () => {
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "mock";
  });

  it("creates, renames, hides; the seeded AI cards show the scene alone", async () => {
    const seeded = await getSceneTemplates();
    for (const template of seeded.filter((entry) => entry.kind === "ai_scene")) {
      expect(template.previewUrl).toMatch(/scene-reference-\d\.webp$/);
    }
    const created = await saveSceneTemplateEdits(
      null,
      form({ "name.uz": "Stol", text: "oq marmar", reference: picture() }),
      KEY,
      CSRF,
    );
    expect(created).toMatchObject({
      ok: true,
      data: { referenceSource: "upload", savedByStaff: true },
    });
    const id = created.ok ? created.data.id : "";
    const renamed = await saveSceneTemplateEdits(id, form({ "name.uz": "Oq stol" }), KEY, CSRF);
    expect(renamed).toMatchObject({ ok: true, data: { name: "Oq stol" } });
    await saveSceneTemplateEdits(id, form({ enabled: "false" }), KEY, CSRF);
    expect((await getSceneTemplates()).some((template) => template.id === id)).toBe(false);
    const refused = await saveSceneTemplateEdits(
      null,
      form({ "name.uz": "Qiz", text: "qiz krem tutib turibdi" }),
      KEY,
      CSRF,
    );
    expect(refused).toMatchObject({ ok: false, fieldErrors: { text: expect.any(String) } });
  });
});
