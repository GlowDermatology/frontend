import { describe, expect, it } from "vitest";

import {
  EMPTY_CATALOG_QUERY,
  catalogApiQuery,
  catalogSearchParams,
  isActiveSearch,
  isIndexableCatalogView,
  normalizeSearch,
  parseCatalogQuery,
} from "./catalog-query";

describe("normalizeSearch", () => {
  it("keeps every spelling of the Uzbek o‘/g‘ mark as typed (the API folds them)", () => {
    for (const mark of ["'", "‘", "’", "ʻ", "ʼ", "`"]) {
      expect(normalizeSearch(`ko${mark}pik`)).toBe(`ko${mark}pik`);
    }
  });

  it("composes decomposed letters, collapses whitespace and strips control characters", () => {
    expect(normalizeSearch("  krem \n\t  spf\u0000 ")).toBe("krem spf");
    expect(normalizeSearch("é")).toBe("é");
    expect(normalizeSearch("a​b")).toBe("a b");
  });

  it("cuts at 64 characters without splitting a surrogate pair", () => {
    expect(normalizeSearch("x".repeat(100))).toHaveLength(64);
    const emoji = "😀".repeat(70);
    const cut = normalizeSearch(emoji);
    expect(Array.from(cut)).toHaveLength(64);
    expect(cut.endsWith("😀")).toBe(true);
  });

  it("answers an empty string for nothing", () => {
    expect(normalizeSearch(undefined)).toBe("");
    expect(normalizeSearch("   ")).toBe("");
  });
});

describe("parseCatalogQuery", () => {
  it("reads every parameter", () => {
    expect(
      parseCatalogQuery({
        q: "ko‘pik",
        category: "serums",
        sort: "-price",
        stock: "1",
        page: "3",
      }),
    ).toEqual({ q: "ko‘pik", category: "serums", sort: "-price", inStock: true, page: 3 });
  });

  it("drops malformed values instead of failing", () => {
    expect(
      parseCatalogQuery({
        category: "../etc",
        sort: "price; drop",
        stock: "yes",
        page: "-2",
      }),
    ).toEqual(EMPTY_CATALOG_QUERY);
    expect(parseCatalogQuery({ page: "99999" }).page).toBe(1);
    expect(parseCatalogQuery({ page: "9999" }).page).toBe(500);
    expect(parseCatalogQuery({ page: "0" }).page).toBe(1);
  });

  it("takes the first of repeated parameters", () => {
    expect(parseCatalogQuery({ sort: ["name", "price"] }).sort).toBe("name");
  });
});

describe("catalogSearchParams / catalogApiQuery", () => {
  it("omits defaults so the plain catalog URL has no query", () => {
    expect(catalogSearchParams(EMPTY_CATALOG_QUERY)).toEqual({
      q: undefined,
      category: undefined,
      sort: undefined,
      stock: undefined,
      page: undefined,
    });
  });

  it("maps to the API's parameter names and page size", () => {
    expect(
      catalogApiQuery({ q: "krem", category: "sun", sort: "price", inStock: true, page: 2 }),
    ).toEqual({
      search: "krem",
      category: "sun",
      ordering: "price",
      in_stock: true,
      page: 2,
      page_size: 20,
    });
  });

  it("does not send a one-letter search (the API ignores it)", () => {
    expect(isActiveSearch("k")).toBe(false);
    expect(isActiveSearch("ko")).toBe(true);
    expect(catalogApiQuery({ ...EMPTY_CATALOG_QUERY, q: "k" }).search).toBeUndefined();
  });
});

describe("isIndexableCatalogView", () => {
  it("indexes the plain list and its pages only", () => {
    expect(isIndexableCatalogView(EMPTY_CATALOG_QUERY)).toBe(true);
    expect(isIndexableCatalogView({ ...EMPTY_CATALOG_QUERY, page: 4 })).toBe(true);
    expect(isIndexableCatalogView({ ...EMPTY_CATALOG_QUERY, q: "krem" })).toBe(false);
    expect(isIndexableCatalogView({ ...EMPTY_CATALOG_QUERY, sort: "name" })).toBe(false);
    expect(isIndexableCatalogView({ ...EMPTY_CATALOG_QUERY, inStock: true })).toBe(false);
  });
});
