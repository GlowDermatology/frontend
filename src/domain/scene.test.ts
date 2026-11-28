import { describe, expect, it } from "vitest";

import {
  isKnownSceneWarning,
  jobMatches,
  needsAcknowledge,
  sameSceneFamily,
  normalizeCustomPrompt,
  requestOfJob,
  sceneFailureHint,
  sceneView,
  type SceneJob,
  type SceneTemplate,
} from "./scene";

const job = (overrides: Partial<SceneJob> = {}): SceneJob => ({
  id: "1",
  productId: "7",
  sourceImageId: "3",
  kind: "studio",
  template: { key: "white", name: "Oq studiya", customText: null, savedTemplateId: null },
  state: "succeeded",
  outcome: "pending",
  result: {
    url: "http://m/c.webp",
    overlayUrl: null,
    productBox: null,
    crops: { portrait: [0, 0, 1, 1], square: [0, 0.1, 1, 0.8] },
    generatedInsidePct: 0,
    occludedPct: 0,
  },
  error: null,
  warnings: [],
  acceptedImageId: null,
  createdAt: "2026-11-26T10:00:00Z",
  finishedAt: null,
  expiresAt: null,
  ...overrides,
});

const LIBRARY = {
  text: "",
  referenceUrl: null,
  referenceSource: "" as const,
  savedByStaff: false,
};
const TEMPLATES: SceneTemplate[] = [
  {
    ...LIBRARY,
    id: "1",
    key: "white",
    kind: "studio",
    name: "Oq",
    names: { uz: "Oq", ru: "", en: "" },
    colours: ["#ffffff"],
    previewUrl: null,
  },
  {
    ...LIBRARY,
    id: "4",
    key: "bathroom",
    kind: "ai_scene",
    name: "Hammom",
    names: { uz: "Hammom", ru: "", en: "" },
    colours: [],
    previewUrl: null,
  },
];

describe("scene jobs", () => {
  it("maps a job to the dialog's view", () => {
    expect(sceneView(null)).toBe("idle");
    expect(sceneView(null, true)).toBe("running");
    expect(sceneView(job({ state: "queued", result: null }))).toBe("running");
    expect(sceneView(job({ state: "running", result: null }))).toBe("running");
    expect(sceneView(job())).toBe("review");
    expect(sceneView(job({ state: "failed", result: null }))).toBe("failed");
    expect(sceneView(job({ outcome: "expired", result: null }))).toBe("expired");
    expect(sceneView(job({ result: null }))).toBe("expired"); // succeeded, but the candidate is gone
    expect(sceneView(job({ outcome: "accepted", result: null }))).toBe("closed");
    expect(sceneView(job({ outcome: "discarded" }))).toBe("closed");
  });

  it("asks for the acknowledgement only when part of the product was drawn", () => {
    expect(needsAcknowledge(job())).toBe(false);
    expect(needsAcknowledge(job({ result: { ...job().result!, generatedInsidePct: 0.5 } }))).toBe(
      true,
    );
  });

  it("suggests a new photo or an AI template for the codes that need one", () => {
    expect(sceneFailureHint("scene_product_cut_off")).toBe("retake");
    expect(sceneFailureHint("scene_hand_covers_product")).toBe("retake");
    expect(sceneFailureHint("scene_occlusion_not_fillable")).toBe("retake");
    expect(sceneFailureHint("scene_custom_refused")).toBe("rewrite");
    expect(sceneFailureHint("scene_occlusion_needs_ai")).toBe("ai_template");
    expect(sceneFailureHint("provider_unavailable")).toBeNull();
    expect(sceneFailureHint(undefined)).toBeNull();
  });

  it("tells a job that answers the request from the image's other running job", () => {
    expect(jobMatches(job(), { kind: "studio", templateId: "1" }, TEMPLATES)).toBe(true);
    expect(jobMatches(job(), { kind: "ai_scene", templateId: "4" }, TEMPLATES)).toBe(false);
    expect(jobMatches(job(), { kind: "fit" }, TEMPLATES)).toBe(false);
    expect(jobMatches(job({ kind: "fit", template: null }), { kind: "fit" }, TEMPLATES)).toBe(true);
    expect(
      jobMatches(
        job({ template: { key: "cream", name: "", customText: null, savedTemplateId: null } }),
        { kind: "studio", templateId: "1" },
        TEMPLATES,
      ),
    ).toBe(false);
  });

  it("never lets a dialog track the photo's running job of the other family", () => {
    expect(sameSceneFamily(job(), { kind: "studio", templateId: "1" })).toBe(true);
    expect(sameSceneFamily(job({ kind: "ai_scene" }), { kind: "studio", templateId: "1" })).toBe(
      true,
    );
    expect(sameSceneFamily(job({ kind: "fit" }), { kind: "studio", templateId: "1" })).toBe(false);
    expect(sameSceneFamily(job(), { kind: "fit" })).toBe(false);
    expect(sameSceneFamily(job({ kind: "fit" }), { kind: "fit" })).toBe(true);
  });

  it("knows the documented warnings", () => {
    expect(isKnownSceneWarning("hand_removed")).toBe(true);
    expect(isKnownSceneWarning("something_new")).toBe(false);
  });
});

describe("typed scenes", () => {
  const typed = (text: string) =>
    job({
      kind: "ai_scene",
      template: { key: "custom", name: "Своя сцена", customText: text, savedTemplateId: null },
    });

  it("matches a job to the same typed scene, whitespace aside", () => {
    expect(
      jobMatches(
        typed("на мраморе"),
        { kind: "ai_scene", customPrompt: "  на   мраморе " },
        TEMPLATES,
      ),
    ).toBe(true);
    expect(
      jobMatches(typed("на мраморе"), { kind: "ai_scene", customPrompt: "на шёлке" }, TEMPLATES),
    ).toBe(false);
    expect(jobMatches(typed("на мраморе"), { kind: "ai_scene", templateId: "4" }, TEMPLATES)).toBe(
      false,
    );
  });

  it("rebuilds a job's request after a reload", () => {
    expect(requestOfJob(typed("на мраморе"), TEMPLATES)).toEqual({
      kind: "ai_scene",
      customPrompt: "на мраморе",
    });
    expect(requestOfJob(job(), TEMPLATES)).toEqual({ kind: "studio", templateId: "1" });
    expect(requestOfJob(job({ kind: "fit", template: null }), TEMPLATES)).toEqual({ kind: "fit" });
    expect(
      requestOfJob(
        job({ template: { key: "gone", name: "", customText: null, savedTemplateId: null } }),
        TEMPLATES,
      ),
    ).toBeNull();
    expect(normalizeCustomPrompt("  a \n b ")).toBe("a b");
  });
});
