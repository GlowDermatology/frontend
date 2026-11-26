import { describe, expect, it, vi } from "vitest";

import type { SceneJob } from "@/domain/scene";

vi.mock("@/data/scenes.actions", () => ({}));

import {
  discardSettled,
  forgetSceneJob,
  keepsSceneJob,
  rememberedSceneJob,
  rememberSceneJob,
  sceneStoreKey,
} from "./use-scene-job";

/** The scene hook's resume rules: what is remembered per product, photo and dialog, and for how long. */

function memoryStore(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const job = (overrides: Partial<SceneJob>): SceneJob => ({
  id: "1",
  productId: "7",
  sourceImageId: "3",
  kind: "studio",
  template: null,
  state: "succeeded",
  outcome: "pending",
  result: null,
  error: null,
  warnings: [],
  acceptedImageId: null,
  createdAt: "",
  finishedAt: null,
  expiresAt: null,
  ...overrides,
});

describe("scene job memory", () => {
  it("keeps one job per dialog, product and photo", () => {
    const store = memoryStore();
    const scene = sceneStoreKey("7", "3", "scene");
    const fit = sceneStoreKey("7", "3", "fit");
    expect(scene).not.toBe(fit);
    expect(sceneStoreKey("7", "4", "scene")).not.toBe(scene);
    rememberSceneJob(scene, "12", store);
    expect(rememberedSceneJob(scene, store)).toBe("12");
    expect(rememberedSceneJob(fit, store)).toBeNull();
    forgetSceneJob(scene, store);
    expect(rememberedSceneJob(scene, store)).toBeNull();
    // No storage (private mode, a blocked accessor): nothing breaks.
    expect(rememberedSceneJob(scene, null)).toBeNull();
  });

  it("remembers a running job or a candidate waiting for review, nothing else", () => {
    expect(keepsSceneJob(job({ state: "queued" }))).toBe(true);
    expect(keepsSceneJob(job({ state: "running" }))).toBe(true);
    const candidate = {
      url: "u",
      overlayUrl: null,
      productBox: null,
      crops: { portrait: null, square: null },
      generatedInsidePct: 0,
      occludedPct: 0,
    };
    expect(keepsSceneJob(job({ result: candidate }))).toBe(true);
    expect(keepsSceneJob(job({ result: candidate, outcome: "accepted" }))).toBe(false);
    expect(keepsSceneJob(job({ state: "failed" }))).toBe(false);
    expect(keepsSceneJob(job({ outcome: "expired" }))).toBe(false);
  });

  it("counts a discard of a job already closed as done", () => {
    expect(discardSettled({ ok: true, data: null })).toBe(true);
    expect(discardSettled({ ok: false, error: "", code: "scene_job_not_ready" })).toBe(true);
    expect(discardSettled({ ok: false, error: "", code: "not_found" })).toBe(true);
    expect(discardSettled({ ok: false, error: "", code: "network_error" })).toBe(false);
  });
});
