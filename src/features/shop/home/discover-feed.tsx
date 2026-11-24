"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import { Icon } from "@/components/ui/icon";
import type { ShopProductCard } from "@/domain/shop";
import { cn } from "@/lib/cn";
import { createFormatter } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import { homeCopy } from "../copy/home";
import { shopHref } from "../routing/routes";
import { canLoadMore, feedReducer, feedUrl, initialFeedState, shouldAutoLoad } from "./feed-state";
import { LiveCardSkeleton, LiveProductCard, liveCardGrid, type CashbackRates } from "./live-card";

interface FeedCategory {
  slug: string;
  name: string;
  count: number;
}

interface DiscoverFeedProps {
  locale: Locale;
  /** The first page, rendered on the server (and kept for «Hammasi»). */
  initial: ShopProductCard[];
  initialCursor: string | null;
  /** Catalog total for «Hammasi»; `null` hides the count. */
  total: number | null;
  /** Category chips; empty when the backend has no feed endpoint yet (no filtering). */
  categories: FeedCategory[];
  onlineSalesEnabled: boolean;
  cashback: CashbackRates;
}

type FeedPayload = { items: ShopProductCard[]; nextCursor: string | null };

const chip =
  "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-label whitespace-nowrap transition-colors";

/**
 * «Kashf eting»: the first page arrives with the HTML; a sentinel below the
 * grid loads up to two more pages through `GET /api/shop/feed` as the
 * visitor scrolls, then «Yana ko‘rsatish» and a plain link to the catalog's
 * second page take over, so the footer stays reachable. Category chips
 * restart the list for one category. The shown count is announced politely.
 */
export function DiscoverFeed({
  locale,
  initial,
  initialCursor,
  total,
  categories,
  onlineSalesEnabled,
  cashback,
}: DiscoverFeedProps) {
  const copy = homeCopy[locale].feed;
  const fmt = createFormatter(locale);
  const [state, dispatch] = useReducer(feedReducer, undefined, () =>
    initialFeedState(initial, initialCursor),
  );
  const sentinel = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (generation: number, cursor: string | null, category: string | null, auto: boolean) => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      try {
        const response = await fetch(feedUrl(locale, cursor, category), {
          signal: abort.signal,
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`feed ${response.status}`);
        const payload = (await response.json()) as FeedPayload;
        dispatch({
          type: "loaded",
          generation,
          items: Array.isArray(payload.items) ? payload.items : [],
          cursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
          auto,
        });
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        dispatch({ type: "failed", generation });
      }
    },
    [locale],
  );

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const loadNext = useCallback(
    (auto: boolean) => {
      const current = stateRef.current;
      if (current.status === "loading") return;
      if (current.cursor === null && current.items.length > 0) return;
      dispatch({ type: "request" });
      void fetchPage(current.generation, current.cursor, current.category, auto);
    },
    [fetchPage],
  );

  // The sentinel: load by itself while `shouldAutoLoad` allows it.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !shouldAutoLoad(state)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && shouldAutoLoad(stateRef.current)) loadNext(true);
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [state, loadNext]);

  useEffect(() => () => controller.current?.abort(), []);

  const pick = (category: string | null) => {
    if (category === state.category) return;
    controller.current?.abort();
    if (category === null) {
      dispatch({ type: "reset", items: initial, cursor: initialCursor });
      return;
    }
    const generation = state.generation + 1;
    dispatch({ type: "filter", category });
    void fetchPage(generation, null, category, false);
  };

  const selected = categories.find((category) => category.slug === state.category);
  const shownTotal = state.category === null ? total : (selected?.count ?? null);
  const loading = state.status === "loading";
  const catalogPage2 = shopHref(
    locale,
    { kind: "catalog" },
    { category: state.category ?? undefined, page: 2 },
  );

  return (
    <div className="flex flex-col">
      {shownTotal !== null ? (
        <p className="m-0 -mt-2 mb-4 text-label text-ink-muted tabular-nums">
          {copy.total(fmt.number(shownTotal))}
        </p>
      ) : null}
      {categories.length ? (
        <div className="sticky top-[var(--gd-header-h,72px)] z-10 -mx-1 mb-2 border-b border-line bg-surface px-1 py-3">
          <div
            role="group"
            aria-label={copy.filterLabel}
            className="scroll-slim flex gap-2 overflow-x-auto p-0.5"
          >
            {[{ slug: null as string | null, name: copy.all }, ...categories].map((category) => {
              const pressed = state.category === category.slug;
              return (
                <button
                  key={category.slug ?? "all"}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => pick(category.slug)}
                  className={cn(
                    chip,
                    pressed
                      ? "border-ink bg-ink text-surface"
                      : "border-line bg-surface-raised text-ink hover:border-gold",
                  )}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <ul className={cn(liveCardGrid, "pt-3")} aria-busy={loading || undefined}>
        {state.items.map((product) => (
          <li key={product.id}>
            <LiveProductCard
              product={product}
              locale={locale}
              onlineSalesEnabled={onlineSalesEnabled}
              cashback={cashback}
            />
          </li>
        ))}
        {loading
          ? Array.from({ length: 5 }, (_, index) => (
              <li key={`skeleton-${index}`} aria-hidden="true">
                <LiveCardSkeleton />
              </li>
            ))
          : null}
      </ul>

      {!loading && state.items.length === 0 && state.status !== "error" ? (
        <p className="m-0 py-8 text-center text-body text-ink-muted">{copy.empty}</p>
      ) : null}

      <div ref={sentinel} aria-hidden="true" className="h-px" />

      <div className="flex flex-col items-center gap-3 pt-8">
        <p
          role="status"
          aria-live="polite"
          className="m-0 text-body-sm font-semibold text-ink-muted tabular-nums"
        >
          {loading ? copy.loading : copy.shown(fmt.number(state.items.length))}
        </p>
        {shownTotal ? (
          <span
            aria-hidden="true"
            className="block h-1 w-[220px] overflow-hidden rounded-full bg-line"
          >
            <span
              className="block h-full bg-gold"
              style={{
                width: `${Math.max(2, Math.min(100, Math.round((state.items.length / shownTotal) * 100)))}%`,
              }}
            />
          </span>
        ) : null}
        {state.status === "error" ? (
          <div className="flex flex-col items-center gap-2">
            <p role="alert" className="m-0 text-body-sm font-semibold text-danger-strong">
              {copy.failed}
            </p>
            <button
              type="button"
              onClick={() =>
                state.items.length === 0 && state.category !== null
                  ? pickRetry(state.category)
                  : loadNext(false)
              }
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong bg-surface-raised px-5 text-label text-ink hover:border-gold"
            >
              <Icon name="refresh" size={16} />
              {copy.retry}
            </button>
          </div>
        ) : canLoadMore(state) ? (
          <button
            type="button"
            onClick={() => loadNext(false)}
            className="inline-flex min-h-[52px] items-center rounded-md border border-line-strong bg-surface-raised px-7 text-[15px] font-bold text-ink hover:border-gold"
          >
            {copy.more}
          </button>
        ) : null}
        <a
          href={catalogPage2}
          className="inline-flex min-h-[52px] items-center gap-2.5 rounded-md bg-gold px-6 text-[15px] font-bold text-on-gold no-underline hover:shadow-lg"
        >
          {copy.toCatalog}
          <Icon name="arrow-right" size={18} />
        </a>
      </div>
    </div>
  );

  function pickRetry(category: string) {
    const generation = state.generation + 1;
    dispatch({ type: "filter", category });
    void fetchPage(generation, null, category, false);
  }
}
