/**
 * The catalog's URL state, `?q=&category=&sort=&stock=1&page=2`. The
 * parameter names are the same in every language, so a link keeps its
 * filters after a language switch. Parsing is
 * strict and total: anything malformed is dropped, never an error, because
 * these values come from any link on the internet. Pure; unit-tested.
 */

export const CATALOG_SORTS = ["default", "price", "-price", "name"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

/** API page sizes are 20 or 50 (customer contract §1.5); the grid uses 20. */
export const CATALOG_PAGE_SIZE = 20;
/** The API cuts a search at 64 characters (§2.3); so do we, before it reaches the URL or the cache key. */
export const SEARCH_MAX_LENGTH = 64;
/** Shorter queries are ignored by the API (§2.3). */
export const SEARCH_MIN_LENGTH = 2;
const MAX_PAGE = 500;
const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;

export interface CatalogQuery {
  /** Normalised search text ("" = no search). */
  q: string;
  category: string | null;
  sort: CatalogSort;
  inStock: boolean;
  page: number;
}

export const EMPTY_CATALOG_QUERY: CatalogQuery = {
  q: "",
  category: null,
  sort: "default",
  inStock: false,
  page: 1,
};

type SearchParamValue = string | string[] | undefined;
export type RawSearchParams = Record<string, SearchParamValue>;

function first(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Search text as typed, made safe for the URL and the API: Unicode NFC (so a
 * decomposed "o‘" from a phone keyboard matches), control characters
 * removed, whitespace collapsed, cut at 64 characters without splitting a
 * surrogate pair. The Uzbek o‘/g‘ mark is left as typed (`'`, `‘`, `’`, `ʻ`,
 * `ʼ`, `` ` ``): the API folds every spelling to one character (§2.3,
 * open question GC-1), and keeping the user's spelling keeps the input box
 * showing exactly what they typed.
 */
export function normalizeSearch(input: string | undefined): string {
  if (!input) return "";
  const cleaned = input
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200d\u2028\u2029\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(cleaned).slice(0, SEARCH_MAX_LENGTH).join("").trim();
}

export function parseCatalogQuery(params: RawSearchParams): CatalogQuery {
  const q = normalizeSearch(first(params.q));
  const rawCategory = first(params.category)?.trim().toLowerCase();
  const category = rawCategory && SLUG.test(rawCategory) ? rawCategory : null;
  const rawSort = first(params.sort);
  const sort = (CATALOG_SORTS as ReadonlyArray<string>).includes(rawSort ?? "")
    ? (rawSort as CatalogSort)
    : "default";
  const inStock = first(params.stock) === "1";
  const rawPage = first(params.page);
  const parsedPage = rawPage && /^\d{1,4}$/.test(rawPage) ? Number(rawPage) : 1;
  const page = Math.min(Math.max(parsedPage, 1), MAX_PAGE);
  return { q, category, sort, inStock, page };
}

/** Whether the search is long enough for the API to apply it. */
export function isActiveSearch(q: string): boolean {
  return Array.from(q).length >= SEARCH_MIN_LENGTH;
}

/** URL parameters of a query (defaults omitted, so the canonical catalog URL has none). */
export function catalogSearchParams(
  query: Partial<CatalogQuery>,
): Record<string, string | undefined> {
  return {
    q: query.q ? query.q : undefined,
    category: query.category ?? undefined,
    sort: query.sort && query.sort !== "default" ? query.sort : undefined,
    stock: query.inStock ? "1" : undefined,
    page: query.page && query.page > 1 ? String(query.page) : undefined,
  };
}

/** Query parameters of `GET catalog/products/` (§2.3). */
export function catalogApiQuery(
  query: CatalogQuery,
): Record<string, string | number | boolean | undefined> {
  return {
    search: isActiveSearch(query.q) ? query.q : undefined,
    category: query.category ?? undefined,
    ordering: query.sort === "default" ? undefined : query.sort,
    in_stock: query.inStock ? true : undefined,
    page: query.page > 1 ? query.page : undefined,
    page_size: CATALOG_PAGE_SIZE,
  };
}

/**
 * Whether a catalog URL is worth indexing: the plain list and its pages are;
 * a search, a sort or the in-stock toggle are views of the same products
 * (noindex, follow), and a category filter has its own canonical page.
 */
export function isIndexableCatalogView(query: CatalogQuery): boolean {
  return !query.q && query.sort === "default" && !query.inStock;
}
