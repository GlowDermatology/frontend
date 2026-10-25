import { describe, expect, it, vi } from "vitest";

import { ALL_PAGES_LIMIT, collectAllPages, PageLimitExceededError } from "./pages";

/** The all-pages loop stops on `page_count`, on a short page, and at the cap — never runs away. */

const rows = (n: number, page: number) => Array.from({ length: n }, (_, i) => `p${page}-${i}`);

describe("collectAllPages", () => {
  it("follows page_count and concatenates the pages in order", async () => {
    const fetchPage = vi.fn(async (page: number) => ({
      count: 7,
      page,
      page_size: 3,
      page_count: 3,
      results: rows(page === 3 ? 1 : 3, page),
    }));
    const all = await collectAllPages(fetchPage, { pageSize: 3 });
    expect(all).toEqual(["p1-0", "p1-1", "p1-2", "p2-0", "p2-1", "p2-2", "p3-0"]);
    expect(fetchPage.mock.calls.map(([page]) => page)).toEqual([1, 2, 3]);
  });

  it("stops after a short page when page_count is missing, null or NaN", async () => {
    for (const pageCount of [undefined, null, NaN, "n/a", 0, -1]) {
      const fetchPage = vi.fn(async (page: number) => ({
        page_count: pageCount,
        results: rows(2, page),
      }));
      expect(await collectAllPages(fetchPage, { pageSize: 50 })).toHaveLength(2);
      expect(fetchPage).toHaveBeenCalledTimes(1);
    }
  });

  it("stops on an empty page even when page_count claims more", async () => {
    const fetchPage = vi.fn(async (page: number) => ({
      page_count: 99,
      results: page === 1 ? rows(50, 1) : [],
    }));
    expect(await collectAllPages(fetchPage, { pageSize: 50 })).toHaveLength(50);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("uses the server's page_size to decide what a short page is", async () => {
    // The server clamped page_size to 20: a 20-row page is full, not short.
    const fetchPage = vi.fn(async (page: number) => ({
      page_size: 20,
      page_count: 2,
      results: rows(page === 1 ? 20 : 5, page),
    }));
    expect(await collectAllPages(fetchPage, { pageSize: 50 })).toHaveLength(25);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("throws at the cap instead of looping when every page is full and page_count keeps growing", async () => {
    const fetchPage = vi.fn(async (page: number) => ({
      page_count: page + 1, // always one more
      page_size: 50,
      results: rows(50, page),
    }));
    await expect(collectAllPages(fetchPage, { pageSize: 50, path: "categories/" })).rejects.toThrow(
      PageLimitExceededError,
    );
    expect(fetchPage).toHaveBeenCalledTimes(ALL_PAGES_LIMIT);

    const small = vi.fn(async (page: number) => ({ page_count: 1e9, results: rows(2, page) }));
    await expect(collectAllPages(small, { pageSize: 2, limit: 3 })).rejects.toThrow(
      /more than 3 pages/,
    );
    expect(small).toHaveBeenCalledTimes(3);
  });

  it("treats a missing results array as an empty page", async () => {
    const fetchPage = vi.fn(
      async () => ({ page_count: 5 }) as { page_count: number; results: never[] },
    );
    expect(await collectAllPages(fetchPage, { pageSize: 50 })).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
