import { describe, expect, it, vi } from "vitest";

vi.mock("./delay", () => ({ delay: async () => undefined }));
vi.mock("@/lib/i18n/admin-locale", async () => {
  const { catalogDataCopy } = await import("@/domain/copy/catalog");
  return { copyFor: async () => catalogDataCopy.uz, getAdminLocale: async () => "uz" };
});

import type { AssistantStartInput } from "@/domain/assistant";

import {
  applyAssistantJob,
  discardAssistantJob,
  getAssistantJob,
  startAssistantJob,
} from "./assistant";
import { PRODUCTS } from "./catalog";

const serum = PRODUCTS[0]!;
const DEFAULT_START: AssistantStartInput = {
  mode: "fill_missing",
  languages: ["uz", "ru", "en"],
  keys: [],
  goal: "professional",
  imageIds: [],
};

describe("demo AI assistant", () => {
  it("fills only empty keys, deterministically, and the poll finishes the job", async () => {
    const started = await startAssistantJob(serum.id, DEFAULT_START);
    expect(started.ok && !started.data.nothingToFill).toBe(true);
    if (!started.ok || started.data.nothingToFill) return;
    expect(started.data.job.state).toBe("running");
    const job = await getAssistantJob(started.data.job.id);
    expect(job?.state).toBe("succeeded");
    const keys = job!.result!.suggestions.map((s) => s.key);
    expect(keys).toContain("texts.en.description");
    expect(keys).toContain("texts.ru.short_description");
    expect(keys).not.toContain("texts.uz.name");
    // ingredients are copied from another language, never invented
    expect(job!.result!.suggestions.find((s) => s.key === "texts.en.ingredients")).toBeUndefined();
    expect(await getAssistantJob(started.data.job.id)).toEqual(job);
    for (const s of job!.result!.suggestions) {
      expect(s.current).toBe("");
      expect(s.suggested.length).toBeLessThanOrEqual(s.maxLength);
    }
  });

  it("says when there is nothing to fill", async () => {
    const result = await startAssistantJob(serum.id, {
      ...DEFAULT_START,
      languages: ["uz"],
      keys: ["texts.uz.name"],
    });
    expect(result).toEqual({ ok: true, data: { nothingToFill: true, job: null } });
  });

  it("marks photo suggestions unchecked with confirm_packaging", async () => {
    const product = PRODUCTS.find((p) => !p.texts.ru.name)!;
    const started = await startAssistantJob(product.id, { ...DEFAULT_START, mode: "photos" });
    if (!started.ok || started.data.nothingToFill) throw new Error("expected a job");
    const job = await getAssistantJob(started.data.job.id);
    for (const s of job!.result!.suggestions) {
      expect(s.checked).toBe(false);
      expect(s.warnings).toContain("confirm_packaging");
    }
  });

  it("applies the chosen values and discards", async () => {
    const started = await startAssistantJob(serum.id, DEFAULT_START);
    if (!started.ok || started.data.nothingToFill) throw new Error("expected a job");
    const id = started.data.job.id;
    const applied = await applyAssistantJob(id, [
      { key: "texts.ru.short_description", value: " Кратко " },
    ]);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.data.applied).toEqual(["texts.ru.short_description"]);
    expect(applied.data.product.texts.ru.shortDescription).toBe("Кратко");
    expect(applied.data.job.outcome).toBe("partial");
    const refused = await applyAssistantJob(id, [{ key: "texts.uz.name", value: "x" }]);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(Object.keys(refused.fieldErrors ?? {})).toEqual(["items.0.key"]);
    const discarded = await discardAssistantJob(id);
    expect(discarded.ok && discarded.data.outcome).toBe("discarded");
    expect(await getAssistantJob("mock-ai-garbage")).toBeNull();
  });
});
