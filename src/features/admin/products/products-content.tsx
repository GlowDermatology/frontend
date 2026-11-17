import Link from "next/link";
import type { Route } from "next";

import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { requireStaff } from "@/data/auth";
import { getCategories } from "@/data/categories";
import { requestNow } from "@/data/now";
import { getCatalogStats, listProducts } from "@/data/products";
import { catalogDataCopy } from "@/domain/copy/catalog";
import { copyFor, getAdminLocale, getFormat } from "@/lib/i18n/admin-locale";

import { ExportMenu } from "../shared/export-menu";
import { ListTransition } from "../shared/list-transition";
import { PageHeader } from "../shared/page-header";
import { Pagination } from "../shared/pagination";
import type { SearchParams } from "../shared/url-state";
import { BillzImport } from "./billz-import";
import { productsCopy } from "./copy";
import { ProductsTable } from "./products-table";
import { ProductsToolbar } from "./products-toolbar";
import {
  hasActiveProductFilters,
  parseProductQuery,
  productListHref,
  withKnownCategory,
} from "./query";

const NEXT_SORT = { default: "name_asc", name_asc: "name_desc", name_desc: "default" } as const;

/** "1–8 / 248" in the admin language's number format. */
export function pageRange(
  fmt: { number: (value: number) => string },
  page: number,
  pageSize: number,
  total: number,
): string {
  if (total === 0) return "0 / 0";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return `${fmt.number(from)}–${fmt.number(to)} / ${fmt.number(total)}`;
}

export async function ProductsContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const parsed = parseProductQuery(await searchParams);
  const [categories, stats, copy, fmt, locale, now] = await Promise.all([
    getCategories(),
    getCatalogStats(),
    copyFor(productsCopy),
    getFormat(),
    getAdminLocale(),
    requestNow(),
  ]);
  const t = copy.list;
  // A stale category slug would be a 400 from the API: drop it first.
  const query = withKnownCategory(parsed, categories);
  const page = await listProducts(query);
  const exportHref = productListHref({ ...query, page: undefined }, "/admin/products/export");
  const synced = stats.lastSyncAt
    ? fmt.ago(stats.lastSyncAt, now)
    : catalogDataCopy[locale].neverSynced;

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow(fmt.number(stats.total), synced)}
        title={t.title}
        actions={
          <>
            <BillzImport search={query.q} />
            <ExportMenu href={exportHref} label={t.export} />
            <Link href="/admin/products/new" className={buttonStyles()}>
              <Icon name="plus" size={18} />
              {t.add}
            </Link>
          </>
        }
      />

      {stats.newFromBillz > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-gold-soft px-4 py-3.5">
          <Icon name="info" size={20} className="shrink-0 text-gold-ink" />
          <p className="m-0 flex-[1_1_320px] text-[14px] leading-5 text-ink">
            <b>{t.newFromBillz(fmt.number(stats.newFromBillz))}</b> {t.newFromBillzLead}
          </p>
          <Link
            href={productListHref(query.onlyNew ? {} : { onlyNew: true })}
            className={buttonStyles({ variant: "secondary", size: "sm", className: "font-bold" })}
          >
            {query.onlyNew ? t.showAll : t.showNew}
          </Link>
        </div>
      )}

      <ListTransition className="group">
        <section
          aria-label={t.region}
          className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
        >
          <ProductsToolbar key={query.q ?? ""} query={query} categories={categories} />
          {page.items.length > 0 ? (
            <ProductsTable
              products={page.items}
              categories={categories}
              sort={query.sort}
              sortHref={productListHref({ ...query, sort: NEXT_SORT[query.sort], page: 1 })}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
                <Icon name="search" size={22} />
              </span>
              <p className="m-0 text-subheading text-ink">{t.emptyTitle}</p>
              <p className="m-0 text-body-sm text-ink-muted">{t.emptyLead}</p>
              {hasActiveProductFilters(query) && (
                <Link
                  href={productListHref({ sort: query.sort })}
                  className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-2" })}
                >
                  <Icon name="close" size={16} />
                  {t.clearFilters}
                </Link>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <span className="text-body-sm text-ink-muted tabular-nums">
              {pageRange(fmt, page.page, page.pageSize, page.total)}
            </span>
            <Pagination
              page={page.page}
              pageCount={page.pageCount}
              hrefFor={(p): Route => productListHref({ ...query, page: p })}
            />
            <span className="flex items-center gap-2 text-caption font-normal text-ink-muted">
              <Icon name="lock" size={14} />
              {t.stockNote}
            </span>
          </div>
        </section>
      </ListTransition>
    </>
  );
}
