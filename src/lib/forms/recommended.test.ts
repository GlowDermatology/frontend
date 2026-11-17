import { describe, expect, it } from "vitest";

import {
  recommendedMemoryKey,
  recommendedToAsk,
  rememberSaveAnyway,
  wasAnsweredSaveAnyway,
  type RecommendedMemoryStore,
} from "./recommended-rules";

const store = (): RecommendedMemoryStore & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
};

describe("recommendedToAsk", () => {
  const missing = ["a", "b"] as const;

  it("asks about every empty field on a create or on the save that activates", () => {
    expect(recommendedToAsk(missing, { isNew: true })).toEqual(["a", "b"]);
    expect(recommendedToAsk(missing, { isNew: false, wasActive: false })).toEqual(["a", "b"]);
  });

  it("never asks while the entity stays inactive or hidden", () => {
    expect(recommendedToAsk(missing, { isNew: true, active: false })).toEqual([]);
    expect(recommendedToAsk(missing, { isNew: false, active: false, wasActive: true })).toEqual([]);
  });

  it("asks about a saved entity only for a field just emptied or with a changed Uzbek source", () => {
    expect(recommendedToAsk(missing, { isNew: false })).toEqual([]);
    expect(recommendedToAsk(missing, { isNew: false, filledBefore: (f) => f === "b" })).toEqual([
      "b",
    ]);
    expect(recommendedToAsk(missing, { isNew: false, sourceChanged: (f) => f === "a" })).toEqual([
      "a",
    ]);
  });
});

describe("«Baribir saqlash» memory", () => {
  it("keys the answer by kind, id and the sorted field set", () => {
    expect(recommendedMemoryKey({ kind: "product", id: "7" }, ["images", "a"])).toBe(
      "gd-recommended:product:7:a,images",
    );
  });

  it("remembers the answer for the same key only", () => {
    const memory = store();
    const key = recommendedMemoryKey({ kind: "category", id: "serumlar" }, ["name.en"]);
    expect(wasAnsweredSaveAnyway(memory, key)).toBe(false);
    rememberSaveAnyway(memory, key);
    expect(wasAnsweredSaveAnyway(memory, key)).toBe(true);
    const other = recommendedMemoryKey({ kind: "category", id: "serumlar" }, [
      "name.en",
      "name.ru",
    ]);
    expect(wasAnsweredSaveAnyway(memory, other)).toBe(false);
  });

  it("never throws on a missing or blocked storage", () => {
    const blocked: RecommendedMemoryStore = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(wasAnsweredSaveAnyway(blocked, "k")).toBe(false);
    expect(() => rememberSaveAnyway(blocked, "k")).not.toThrow();
    expect(wasAnsweredSaveAnyway(null, "k")).toBe(false);
  });
});
