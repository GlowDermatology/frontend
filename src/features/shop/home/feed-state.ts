import type { ShopProductCard } from "@/domain/shop";

/**
 * State of the «Kashf eting» feed (pure; unit-tested): cursor pages are
 * appended without duplicates, the sentinel may load at most
 * `AUTO_BATCHES` pages by itself (so the footer stays reachable), after
 * that the visitor asks for more with a button. A category filter starts a
 * new list; answers for a filter that is no longer selected are dropped.
 */

export const AUTO_BATCHES = 2;

export type FeedStatus = "idle" | "loading" | "error";

export interface FeedState {
  /** `null` = every category. */
  category: string | null;
  items: ShopProductCard[];
  cursor: string | null;
  /** Pages the sentinel loaded for the current filter. */
  autoLoaded: number;
  status: FeedStatus;
  /** Bumped on every filter change, so a late answer can be recognised. */
  generation: number;
}

export type FeedAction =
  | { type: "request" }
  | {
      type: "loaded";
      generation: number;
      items: ReadonlyArray<ShopProductCard>;
      cursor: string | null;
      auto: boolean;
    }
  | { type: "failed"; generation: number }
  | { type: "filter"; category: string | null }
  | { type: "reset"; items: ReadonlyArray<ShopProductCard>; cursor: string | null };

export function initialFeedState(
  items: ReadonlyArray<ShopProductCard>,
  cursor: string | null,
): FeedState {
  return {
    category: null,
    items: dedupe([], items),
    cursor,
    autoLoaded: 0,
    status: "idle",
    generation: 0,
  };
}

/** `existing` followed by the `incoming` cards it does not hold yet (by id), in order. */
export function dedupe(
  existing: ReadonlyArray<ShopProductCard>,
  incoming: ReadonlyArray<ShopProductCard>,
): ShopProductCard[] {
  const seen = new Set(existing.map((item) => item.id));
  const out = [...existing];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "request":
      return state.status === "loading" ? state : { ...state, status: "loading" };
    case "loaded": {
      if (action.generation !== state.generation) return state;
      const items = dedupe(state.items, action.items);
      // A page that adds nothing new ends the feed: the cursor would only loop.
      const progressed = items.length > state.items.length;
      return {
        ...state,
        items,
        cursor: progressed ? action.cursor : null,
        autoLoaded: state.autoLoaded + (action.auto ? 1 : 0),
        status: "idle",
      };
    }
    case "failed":
      return action.generation === state.generation ? { ...state, status: "error" } : state;
    case "filter":
      return {
        category: action.category,
        items: [],
        cursor: null,
        autoLoaded: 0,
        status: "loading",
        generation: state.generation + 1,
      };
    case "reset":
      return {
        ...initialFeedState(action.items, action.cursor),
        generation: state.generation + 1,
      };
  }
}

/** Whether the sentinel coming into view should load the next page by itself. */
export function shouldAutoLoad(state: FeedState): boolean {
  return state.status === "idle" && state.cursor !== null && state.autoLoaded < AUTO_BATCHES;
}

/** Whether to offer the «Yana ko‘rsatish» button. */
export function canLoadMore(state: FeedState): boolean {
  return state.cursor !== null && state.status !== "loading" && state.autoLoaded >= AUTO_BATCHES;
}

/** The route the browser asks for the next page (same origin; never Django). */
export function feedUrl(locale: string, cursor: string | null, category: string | null): string {
  const params = new URLSearchParams({ locale });
  if (cursor) params.set("cursor", cursor);
  if (category) params.set("category", category);
  return `/api/shop/feed?${params.toString()}`;
}
