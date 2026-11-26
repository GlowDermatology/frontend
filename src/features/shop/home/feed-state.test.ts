import { describe, expect, it } from "vitest";

import { NO_RENDITIONS, type ShopProductCard } from "@/domain/shop";

import {
  AUTO_BATCHES,
  canLoadMore,
  dedupe,
  feedReducer,
  feedUrl,
  initialFeedState,
  shouldAutoLoad,
  type FeedState,
} from "./feed-state";

function card(id: number): ShopProductCard {
  return {
    id,
    segment: String(id),
    hasSlug: false,
    name: `P${id}`,
    volume: "",
    price: 1000,
    promo: false,
    category: null,
    image: null,
    imageThumb: null,
    imageMedium: null,
    imageUrl: null,
    renditions: NO_RENDITIONS,
    available: 3,
    inStock: true,
    brand: null,
    sku: null,
    contentLanguage: null,
    oldPrice: null,
    updatedAt: null,
  };
}

const ids = (state: FeedState) => state.items.map((item) => item.id);

function load(state: FeedState, items: number[], cursor: string | null, auto = true): FeedState {
  const requested = feedReducer(state, { type: "request" });
  return feedReducer(requested, {
    type: "loaded",
    generation: requested.generation,
    items: items.map(card),
    cursor,
    auto,
  });
}

describe("discover feed state", () => {
  it("de-duplicates by id, keeping the first occurrence and the order", () => {
    expect(
      dedupe([card(1), card(2)], [card(2), card(3), card(3), card(1), card(4)]).map((p) => p.id),
    ).toEqual([1, 2, 3, 4]);
    expect(ids(initialFeedState([card(5), card(5), card(6)], "c1"))).toEqual([5, 6]);
  });

  it("appends pages without duplicates and follows the cursor", () => {
    let state = initialFeedState([card(1), card(2)], "c1");
    state = load(state, [2, 3, 4], "c2");
    expect(ids(state)).toEqual([1, 2, 3, 4]);
    expect(state.cursor).toBe("c2");
    expect(state.status).toBe("idle");
  });

  it("loads at most AUTO_BATCHES pages by itself, then offers the button", () => {
    let state = initialFeedState([card(1)], "c1");
    for (let batch = 0; batch < AUTO_BATCHES; batch += 1) {
      expect(shouldAutoLoad(state)).toBe(true);
      expect(canLoadMore(state)).toBe(false);
      state = load(state, [10 + batch], `c${batch + 2}`);
    }
    expect(state.autoLoaded).toBe(AUTO_BATCHES);
    expect(shouldAutoLoad(state)).toBe(false);
    expect(canLoadMore(state)).toBe(true);
    // A button load does not count as automatic and keeps the button.
    state = load(state, [20], "c9", false);
    expect(state.autoLoaded).toBe(AUTO_BATCHES);
    expect(canLoadMore(state)).toBe(true);
  });

  it("stops at the end of the feed and on a page that adds nothing new", () => {
    let state = load(initialFeedState([card(1)], "c1"), [2], null);
    expect(state.cursor).toBeNull();
    expect(shouldAutoLoad(state)).toBe(false);
    expect(canLoadMore(state)).toBe(false);

    state = load(initialFeedState([card(1), card(2)], "c1"), [1, 2], "c2");
    expect(state.cursor).toBeNull();
  });

  it("never requests twice at once", () => {
    const loading = feedReducer(initialFeedState([card(1)], "c1"), { type: "request" });
    expect(feedReducer(loading, { type: "request" })).toBe(loading);
    expect(shouldAutoLoad(loading)).toBe(false);
  });

  it("starts a new list on a filter and drops answers for the old one", () => {
    const start = initialFeedState([card(1)], "c1");
    const requested = feedReducer(start, { type: "request" });
    const filtered = feedReducer(requested, { type: "filter", category: "serums" });
    expect(filtered.items).toEqual([]);
    expect(filtered.category).toBe("serums");
    const late = feedReducer(filtered, {
      type: "loaded",
      generation: requested.generation,
      items: [card(9)],
      cursor: "x",
      auto: true,
    });
    expect(late).toBe(filtered);
    const fresh = feedReducer(filtered, {
      type: "loaded",
      generation: filtered.generation,
      items: [card(3)],
      cursor: "s2",
      auto: false,
    });
    expect(ids(fresh)).toEqual([3]);
    expect(fresh.autoLoaded).toBe(0);
    expect(feedReducer(fresh, { type: "failed", generation: start.generation })).toBe(fresh);
  });

  it("marks a failure and lets a reset restore the server's first page", () => {
    const requested = feedReducer(initialFeedState([card(1)], "c1"), { type: "request" });
    const failed = feedReducer(requested, { type: "failed", generation: requested.generation });
    expect(failed.status).toBe("error");
    expect(shouldAutoLoad(failed)).toBe(false);
    const reset = feedReducer(failed, { type: "reset", items: [card(1)], cursor: "c1" });
    expect(reset.status).toBe("idle");
    expect(reset.generation).toBe(failed.generation + 1);
  });

  it("asks this site's route, never the API", () => {
    expect(feedUrl("uz", null, null)).toBe("/api/shop/feed?locale=uz");
    expect(feedUrl("ru", "abc=", "serums")).toBe(
      "/api/shop/feed?locale=ru&cursor=abc%3D&category=serums",
    );
  });
});
