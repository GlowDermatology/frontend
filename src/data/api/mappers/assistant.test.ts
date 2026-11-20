import { describe, expect, it } from "vitest";

import type { ApiAssistantJob } from "../types";
import { mapAssistantJob } from "./assistant";

const api: ApiAssistantJob = {
  id: 41,
  product_id: 12,
  mode: "fill_missing",
  languages: ["uz", "ru", "en", "de"],
  keys: ["texts.ru.name", "seo.ru.title"],
  goal: "",
  image_ids: [],
  state: "succeeded",
  outcome: "pending",
  progress: null,
  result: {
    suggestions: [
      {
        key: "seo.ru.title",
        current: "",
        suggested: "Сыворотка — увлажнение",
        warnings: ["seo_title_long", "unverified_number", "brand_new_code"],
        origin: "ai",
        checked: true,
        max_length: 120,
      },
      {
        key: "texts.ru.name",
        current: "",
        suggested: "Сыворотка",
        warnings: ["confirm_packaging"],
        origin: "image",
        checked: false,
        max_length: 120,
      },
    ],
    warnings: [
      { code: "rejected", key: "texts.ru.description", reason: "unsupported_number" },
      { code: "rejected", key: "texts.uz.name", reason: "pos_label" },
      { code: "skipped", key: "texts.en.ingredients", reason: "no source text" },
      { code: "unchanged", key: "texts.uz.usage" },
      { code: "skipped" },
      { code: "dropped", count: 2 },
      { code: "extracted", brand: "Glow", volume: "30 ml" },
    ],
  },
  error: null,
  applied_keys: [],
  created_at: "2026-11-18T21:00:00+05:00",
  started_at: "2026-11-18T21:00:01+05:00",
  finished_at: "2026-11-18T21:00:04+05:00",
  created_by: { id: 1, display_name: "Administrator" },
};

describe("mapAssistantJob", () => {
  it("maps a finished job, dropping unknown codes and languages", () => {
    const job = mapAssistantJob(api);
    expect(job).toMatchObject({ id: "41", productId: "12", languages: ["uz", "ru", "en"] });
    expect(job.result!.suggestions[0]).toEqual({
      key: "seo.ru.title",
      current: "",
      suggested: "Сыворотка — увлажнение",
      warnings: ["seo_title_long", "unverified_number"],
      origin: "ai",
      checked: true,
      maxLength: 120,
    });
    expect(job.result!.suggestions[1]!.origin).toBe("image");
    expect(job.result!.notes).toEqual({
      keys: [
        { key: "texts.ru.description", kind: "rejected", reason: "unsupported_number" },
        { key: "texts.uz.name", kind: "rejected", reason: "pos_label" },
        { key: "texts.en.ingredients", kind: "skipped", reason: "no source text" },
        { key: "texts.uz.usage", kind: "unchanged", reason: "" },
      ],
      dropped: 2,
      extracted: { brand: "Glow", volume: "30 ml" },
    });
    expect(job.error).toBeNull();
  });

  it("keeps the error of a failed job and no result", () => {
    const job = mapAssistantJob({
      ...api,
      state: "failed",
      result: null,
      error: { code: "provider_unavailable", message: "AI xizmati vaqtincha ishlamayapti." },
    });
    expect(job.result).toBeNull();
    expect(job.error).toEqual({
      code: "provider_unavailable",
      message: "AI xizmati vaqtincha ishlamayapti.",
    });
  });
});
