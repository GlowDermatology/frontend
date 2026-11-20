import { describe, expect, it, vi } from "vitest";

vi.mock("./delay", () => ({ delay: async () => undefined }));
vi.mock("@/lib/i18n/admin-locale", async () => {
  const { catalogDataCopy } = await import("@/domain/copy/catalog");
  return { copyFor: async () => catalogDataCopy.uz, getAdminLocale: async () => "uz" };
});

import { buildDraft, type AssistantStartInput } from "@/domain/assistant";

import { acceptAssistantJob, getAssistantJob, startAssistantJob } from "./assistant";
import { PRODUCTS } from "./catalog";

const serum = PRODUCTS[0]!;
const DEFAULT_START: AssistantStartInput = {
  mode: "fill_missing",
  languages: ["uz", "ru", "en"],
  keys: [],
  goal: "professional",
  imageIds: [],
  draft: {},
};

async function startedJob(input: Partial<AssistantStartInput>, productId = serum.id) {
  const started = await startAssistantJob(productId, { ...DEFAULT_START, ...input });
  if (!started.ok || started.data.nothingToFill) throw new Error("expected a job");
  expect(started.data.job.state).toBe("running");
  const job = await getAssistantJob(started.data.job.id);
  expect(job?.state).toBe("succeeded");
  return job!;
}

describe("demo AI assistant", () => {
  it("fills only empty keys, deterministically, and the poll finishes the job", async () => {
    const job = await startedJob({});
    const keys = job.result!.suggestions.map((s) => s.key);
    expect(keys).toContain("texts.en.description");
    expect(keys).toContain("texts.ru.short_description");
    expect(keys).not.toContain("texts.uz.name");
    expect(await getAssistantJob(job.id)).toEqual(job);
    for (const s of job.result!.suggestions) {
      expect(s.current).toBe("");
      expect(s.suggested.length).toBeLessThanOrEqual(s.maxLength);
    }
  });

  it("works on the draft: unsaved values are facts, placeholders count as empty", async () => {
    const draft = buildDraft(
      serum,
      serum.images.map((image) => image.id),
    );
    draft["texts.uz.name"] = "Yangi nom";
    draft["texts.ru.description"] = "Test";
    const job = await startedJob({
      keys: ["texts.ru.description", "texts.uz.short_description"],
      draft,
    });
    const byKey = new Map(job.result!.suggestions.map((s) => [s.key, s]));
    expect(byKey.get("texts.ru.description")!.current).toBe("Test");
    expect(byKey.get("texts.uz.short_description")!.suggested).toContain("Yangi nom");
  });

  it("refuses a draft with an unknown key or an overlong value", async () => {
    const unknown = await startAssistantJob(serum.id, {
      ...DEFAULT_START,
      draft: { "images.999.alt.uz": "x" },
    });
    expect(unknown.ok).toBe(false);
    const long = await startAssistantJob(serum.id, {
      ...DEFAULT_START,
      draft: { "seo.uz.title": "x".repeat(121) },
    });
    expect(long.ok).toBe(false);
  });

  it("says when there is nothing to fill", async () => {
    const result = await startAssistantJob(serum.id, {
      ...DEFAULT_START,
      languages: ["uz"],
      keys: ["texts.uz.name"],
    });
    expect(result).toEqual({ ok: true, data: { nothingToFill: true, job: null } });
  });

  it("skips a name with no source language and never uses the Billz name", async () => {
    const draft = buildDraft(serum, []);
    for (const language of ["uz", "ru", "en"] as const) draft[`texts.${language}.name`] = "";
    const job = await startedJob({ keys: ["texts.ru.name"], draft });
    expect(job.result!.suggestions).toEqual([]);
    expect(job.result!.notes.keys).toEqual([
      { key: "texts.ru.name", kind: "skipped", reason: "no source text" },
    ]);
  });

  it("reports an improvement equal to the text as unchanged", async () => {
    const job = await startedJob({ mode: "improve", keys: ["texts.uz.description"] });
    expect(job.result!.suggestions).toEqual([]);
    expect(job.result!.notes.keys).toEqual([
      { key: "texts.uz.description", kind: "unchanged", reason: "" },
    ]);
  });

  it("marks photo suggestions with confirm_packaging", async () => {
    const product = PRODUCTS.find((p) => !p.texts.ru.name)!;
    const job = await startedJob({ mode: "photos" }, product.id);
    for (const s of job.result!.suggestions) {
      expect(s.origin).toBe("image");
      expect(s.warnings).toContain("confirm_packaging");
    }
  });

  it("accepts the keys put into the form once", async () => {
    const job = await startedJob({});
    const first = job.result!.suggestions[0]!.key;
    const refused = await acceptAssistantJob(job.id, ["texts.uz.name"]);
    expect(refused.ok).toBe(false);
    const accepted = await acceptAssistantJob(job.id, [first]);
    expect(accepted.ok && accepted.data.outcome).toBe("partial");
    expect(accepted.ok && accepted.data.appliedKeys).toEqual([first]);
    const again = await acceptAssistantJob(job.id, [first]);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.code).toBe("assistant_job_not_ready");
    const none = await startedJob({});
    const discarded = await acceptAssistantJob(none.id, []);
    expect(discarded.ok && discarded.data.outcome).toBe("discarded");
    expect(await getAssistantJob("mock-ai-garbage")).toBeNull();
  });
});
