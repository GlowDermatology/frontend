import Form from "next/form";
import Link from "next/link";
import type { Route } from "next";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { ShopCategory, ShopPage, ShopProductCard } from "@/domain/shop";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/cn";

import type { ShopDictionary } from "../content";
import {
  CATALOG_SORTS,
  SEARCH_MAX_LENGTH,
  catalogSearchParams,
  isActiveSearch,
  type CatalogQuery,
} from "../routing/catalog-query";
import { shopHref, shopPath, type ShopRoute } from "../routing/routes";
import { AutoSubmitForm } from "./auto-submit-form";
import { EmptyState } from "./empty-state";
import { ProductGrid } from "./product-card";

interface CatalogViewProps {
  locale: Locale;
  dict: ShopDictionary;
  /** `catalog` or the category page (the category is in the path, not the query). */
  route: ShopRoute;
  query: CatalogQuery;
  page: ShopPage<ShopProductCard>;
  categories: ReadonlyArray<ShopCategory>;
}

const chip =
  "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-[14px] leading-none font-semibold whitespace-nowrap no-underline transition-colors duration-150";
const chipIdle = "border-line bg-surface-raised text-ink hover:border-gold hover:bg-gold-soft";
const chipActive = "border-ink bg-ink text-surface";

/** Hidden inputs that carry the rest of the URL state through a form. */
function Carry({ values }: { values: Record<string, string | undefined> }) {
  return (
    <>
      {Object.entries(values).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
    </>
  );
}

export function CatalogView({ locale, dict, route, query, page, categories }: CatalogViewProps) {
  const t = dict.catalog;
  const onCategoryPage = route.kind === "category";
  const action = shopPath(locale, route);
  const params = catalogSearchParams(query);
  const href = (patch: Partial<CatalogQuery>): Route =>
    shopHref(locale, route, catalogSearchParams({ ...query, page: 1, ...patch }));
  const searching = isActiveSearch(query.q);
  const filtered = searching || query.inStock || (!onCategoryPage && query.category !== null);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <Form action={action} role="search" className="flex w-full max-w-[640px] gap-2">
          <label htmlFor="catalog-q" className="sr-only">
            {t.searchLabel}
          </label>
          <span className="relative flex-1">
            <Icon
              name="search"
              size={20}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              id="catalog-q"
              name="q"
              type="search"
              defaultValue={query.q}
              maxLength={SEARCH_MAX_LENGTH}
              placeholder={t.searchPlaceholder}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              className="h-[52px] w-full rounded-md border-[1.5px] border-line-strong bg-surface-raised pr-4 pl-12 text-[16px] text-ink transition-colors outline-none focus-visible:border-gold-ink"
            />
          </span>
          <Carry
            values={{
              category: onCategoryPage ? undefined : params.category,
              sort: params.sort,
              stock: params.stock,
            }}
          />
          <button type="submit" className={buttonStyles({ size: "lg" })}>
            {t.searchSubmit}
          </button>
        </Form>
        {query.q && !searching ? (
          <p className="m-0 text-body-sm text-ink-muted">{t.shortQuery}</p>
        ) : null}

        {!onCategoryPage && categories.length > 0 ? (
          <nav aria-label={t.categoryLabel} className="-mx-1 overflow-x-auto px-1 pb-1">
            <ul className="m-0 flex w-max list-none gap-2 p-0">
              <li>
                <Link
                  href={href({ category: null })}
                  aria-current={query.category === null ? "page" : undefined}
                  className={cn(chip, query.category === null ? chipActive : chipIdle)}
                >
                  {t.allCategories}
                </Link>
              </li>
              {categories.map((category) => {
                const active = query.category === category.slug;
                // Without a search a category chip opens the category's own
                // (canonical, indexable) page; with one, it filters the results.
                const target = searching
                  ? href({ category: category.slug })
                  : shopPath(locale, { kind: "category", slug: category.slug });
                return (
                  <li key={category.slug}>
                    <Link
                      href={target}
                      aria-current={active ? "page" : undefined}
                      className={cn(chip, active ? chipActive : chipIdle)}
                    >
                      {category.name}
                      <span
                        className={cn(
                          "tabular-nums",
                          active ? "text-surface/70" : "text-ink-muted",
                        )}
                      >
                        {category.productCount}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-line py-3">
        <p className="m-0 text-label text-ink" aria-live="polite">
          {searching ? t.resultsFor(page.total, query.q) : t.results(page.total)}
        </p>
        <AutoSubmitForm
          action={action}
          label={t.filtersLabel}
          className="flex flex-wrap items-center gap-x-5 gap-y-3"
        >
          <Carry
            values={{
              q: params.q,
              category: onCategoryPage ? undefined : params.category,
            }}
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px] font-semibold text-ink">
            <input
              type="checkbox"
              name="stock"
              value="1"
              defaultChecked={query.inStock}
              className="size-5 accent-gold-ink"
            />
            {t.inStock}
          </label>
          <label className="flex items-center gap-2.5 text-[14px] font-semibold text-ink">
            <span>{t.sortLabel}</span>
            <span className="relative">
              <select
                name="sort"
                defaultValue={query.sort}
                className="h-11 appearance-none rounded-md border-[1.5px] border-line bg-surface-raised pr-10 pl-3.5 text-[14px] font-semibold text-ink outline-none focus-visible:border-gold-ink"
              >
                {CATALOG_SORTS.map((sort) => (
                  <option key={sort} value={sort}>
                    {t.sorts[sort]}
                  </option>
                ))}
              </select>
              <Icon
                name="chevron-down"
                size={16}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted"
              />
            </span>
          </label>
          <noscript>
            <button type="submit" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              {t.sortApply}
            </button>
          </noscript>
        </AutoSubmitForm>
      </div>

      {page.items.length === 0 ? (
        <EmptyState
          title={t.emptyTitle}
          body={filtered ? t.emptyBody : onCategoryPage ? t.emptyCategory : t.emptyBody}
          action={
            filtered ? (
              <Link href={shopPath(locale, route)} className={buttonStyles({ variant: "outline" })}>
                {t.resetFilters}
              </Link>
            ) : null
          }
        />
      ) : (
        <ProductGrid
          products={page.items}
          locale={locale}
          dict={dict}
          priorityCount={query.page === 1 ? 4 : 0}
          headingLevel="h2"
        />
      )}

      <Pagination dict={dict} page={page} hrefFor={(n) => href({ page: n })} />
    </div>
  );
}

/** Page numbers around the current one, with the first and last always shown. */
export function pageWindow(current: number, total: number): Array<number | "gap"> {
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  for (const [index, n] of sorted.entries()) {
    const previous = sorted[index - 1];
    if (previous !== undefined && n - previous > 1) out.push("gap");
    out.push(n);
  }
  return out;
}

function Pagination({
  dict,
  page,
  hrefFor,
}: {
  dict: ShopDictionary;
  page: ShopPage<ShopProductCard>;
  hrefFor: (page: number) => Route;
}) {
  if (page.pageCount <= 1) return null;
  const t = dict.catalog;
  const cell =
    "inline-flex size-11 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums no-underline transition-colors duration-150";
  return (
    <nav aria-label={t.paginationLabel} className="flex justify-center pt-6">
      <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-1 p-0">
        <li>
          {page.page > 1 ? (
            <Link
              href={hrefFor(page.page - 1)}
              rel="prev"
              className={cn(cell, "w-auto gap-2 px-4 text-ink hover:bg-gold-soft")}
            >
              <Icon name="chevron-left" size={18} />
              <span className="hidden sm:inline">{t.previous}</span>
              <span className="sr-only sm:hidden">{t.previous}</span>
            </Link>
          ) : null}
        </li>
        {pageWindow(page.page, page.pageCount).map((n, index) =>
          n === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-ink-muted">
              …
            </li>
          ) : (
            <li key={n}>
              {n === page.page ? (
                <span aria-current="page" className={cn(cell, "bg-ink text-surface")}>
                  <span className="sr-only">{t.pageOf(n, page.pageCount)}</span>
                  <span aria-hidden="true">{n}</span>
                </span>
              ) : (
                <Link
                  href={hrefFor(n)}
                  aria-label={t.pageLabel(n)}
                  className={cn(cell, "text-ink hover:bg-gold-soft")}
                >
                  {n}
                </Link>
              )}
            </li>
          ),
        )}
        <li>
          {page.page < page.pageCount ? (
            <Link
              href={hrefFor(page.page + 1)}
              rel="next"
              className={cn(cell, "w-auto gap-2 px-4 text-ink hover:bg-gold-soft")}
            >
              <span className="hidden sm:inline">{t.next}</span>
              <span className="sr-only sm:hidden">{t.next}</span>
              <Icon name="chevron-right" size={18} />
            </Link>
          ) : null}
        </li>
      </ul>
    </nav>
  );
}
