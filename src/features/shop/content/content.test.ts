import { describe, expect, it } from "vitest";

import { en } from "./en";
import { ru } from "./ru";
import { uz } from "./uz";

/** Leaf paths of a dictionary (functions count as leaves). */
function leaves(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === "function" ? [`${prefix}${key}`] : leaves(child, `${prefix}${key}.`),
  );
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value !== "object" || value === null) return [];
  return Object.values(value).flatMap(strings);
}

describe("storefront dictionaries", () => {
  it("have the same keys in every language", () => {
    expect(leaves(ru).sort()).toEqual(leaves(uz).sort());
    expect(leaves(en).sort()).toEqual(leaves(uz).sort());
  });

  it("spell the Uzbek o‘/g‘ mark with U+2018, never an ASCII apostrophe", () => {
    const offenders = strings(uz).filter((text) => /[OoGg]['`ʻʼ’]/.test(text));
    expect(offenders).toEqual([]);
  });

  it("have no empty strings", () => {
    for (const dict of [uz, ru, en]) {
      expect(strings(dict).filter((text) => text.trim() === "")).toEqual([]);
    }
  });

  it("build product descriptions from name, volume, category and price", () => {
    const parts = { name: "Serum", volume: "30 ml", category: "Serumlar", price: "185 000 so‘m" };
    expect(uz.meta.productDescription(parts)).toBe(
      "Serum, 30 ml — Serumlar toifasidan — narxi 185 000 so‘m — Glow Derma do‘konida, cashback va yetkazib berish bilan.",
    );
    expect(ru.meta.productDescription({ ...parts, category: null, volume: "" })).toBe(
      "Serum — цена 185 000 so‘m — в магазине Glow Derma, с кешбэком и доставкой.",
    );
  });
});
